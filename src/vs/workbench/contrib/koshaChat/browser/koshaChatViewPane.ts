/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/koshaChat.css';
import * as dom from '../../../../base/browser/dom.js';
import { allowedMarkdownHtmlAttributes, allowedMarkdownHtmlTags, renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { MarkedKatexSupport } from '../../markdown/browser/markedKatexSupport.js';
import { IKoshaKshetroService } from '../../kshetro/common/kshetroService.js';
import { IKoshaProvider } from '../common/koshaApiTypes.js';
import { IKoshaTranscriptEntry, KoshaChatSessionController } from './koshaChatSessionController.js';

export class KoshaChatViewPane extends ViewPane {

	private readonly session: KoshaChatSessionController;
	private readonly clipboardService: IClipboardService;
	private readonly kshetro: IKoshaKshetroService;
	private readonly ui = this._register(new DisposableStore());
	private readonly markdownStore = this._register(new DisposableStore());
	private katexReady = false;

	private root: HTMLElement | undefined;
	private tabsEl: HTMLElement | undefined;
	private historyPanel: HTMLElement | undefined;
	private historyList: HTMLElement | undefined;
	private transcriptEl: HTMLElement | undefined;
	private emptyEl: HTMLElement | undefined;
	private inputEl: HTMLTextAreaElement | undefined;
	private modelBtn: HTMLButtonElement | undefined;
	private sendBtn: HTMLButtonElement | undefined;
	private stopBtn: HTMLButtonElement | undefined;
	private attachChips: HTMLElement | undefined;
	private popoverHost: HTMLElement | undefined;
	private projectChip: HTMLElement | undefined;
	private pendingFiles: File[] = [];
	private openPopover: 'model' | 'history' | 'skills' | undefined;
	private skillHighlight = 0;
	private skillMatches: { name: string; description?: string }[] = [];

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IClipboardService clipboardService: IClipboardService,
		@IKoshaKshetroService kshetro: IKoshaKshetroService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.clipboardService = clipboardService;
		this.kshetro = kshetro;
		this.session = this._register(instantiationService.createInstance(KoshaChatSessionController));
		this._register(this.session.onDidChangeEntries(entries => this.renderTranscript(entries)));
		this._register(this.session.onDidChangeBusy(busy => this.syncBusy(busy)));
		this._register(this.session.onDidChangeSessions(() => {
			this.renderTabs();
			this.renderHistoryList();
			this.syncPickerLabels();
			this.syncProjectChip();
		}));
		this._register(this.kshetro.onDidChangeSelectedProject(() => {
			this.syncProjectChip();
			this.renderTabs();
			this.renderHistoryList();
		}));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.ui.clear();

		const root = dom.append(container, dom.$('.kosha-chat-pane'));
		this.root = root;

		// Session strip: tabs + history + new
		const strip = dom.append(root, dom.$('.kosha-chat-strip'));
		this.projectChip = dom.append(strip, dom.$('.kosha-chat-project-chip'));
		this.projectChip.style.display = 'none';
		this.tabsEl = dom.append(strip, dom.$('.kosha-chat-tabs'));
		const stripActions = dom.append(strip, dom.$('.kosha-chat-strip-actions'));

		const historyBtn = dom.append(stripActions, dom.$('button.kosha-chat-icon-btn')) as HTMLButtonElement;
		historyBtn.type = 'button';
		historyBtn.title = localize('kosha.chat.history', 'History');
		historyBtn.setAttribute('aria-label', localize('kosha.chat.history', 'History'));
		historyBtn.textContent = '☰';
		this.ui.add(dom.addDisposableListener(historyBtn, 'click', () => void this.toggleHistory()));

		const newBtn = dom.append(stripActions, dom.$('button.kosha-chat-icon-btn')) as HTMLButtonElement;
		newBtn.type = 'button';
		newBtn.title = localize('kosha.chat.new', 'New chat');
		newBtn.setAttribute('aria-label', localize('kosha.chat.new', 'New chat'));
		newBtn.textContent = '+';
		this.ui.add(dom.addDisposableListener(newBtn, 'click', () => {
			this.closePopovers();
			this.pendingFiles = [];
			this.renderAttachChips();
			this.session.newChat();
			this.inputEl?.focus();
		}));

		// History drawer
		this.historyPanel = dom.append(root, dom.$('.kosha-chat-history'));
		this.historyPanel.style.display = 'none';
		const histHead = dom.append(this.historyPanel, dom.$('.kosha-chat-history-head'));
		dom.append(histHead, dom.$('span')).textContent = localize('kosha.chat.historyTitle', 'Chats');
		const histClose = dom.append(histHead, dom.$('button.kosha-chat-icon-btn')) as HTMLButtonElement;
		histClose.type = 'button';
		histClose.textContent = '✕';
		this.ui.add(dom.addDisposableListener(histClose, 'click', () => this.closePopovers()));
		this.historyList = dom.append(this.historyPanel, dom.$('.kosha-chat-history-list'));

		this.transcriptEl = dom.append(root, dom.$('.kosha-chat-transcript'));
		this.emptyEl = dom.append(this.transcriptEl, dom.$('.kosha-chat-empty'));
		dom.append(this.emptyEl, dom.$('.kosha-chat-empty-mark'));
		dom.append(this.emptyEl, dom.$('strong')).textContent = localize('kosha.chat.emptyTitle', 'Ask Kosha');
		dom.append(this.emptyEl, dom.$('p.kosha-chat-empty-body')).textContent = localize(
			'kosha.chat.emptyBody',
			'Start a message below. Open history to resume a past chat.'
		);

		this.popoverHost = dom.append(root, dom.$('.kosha-chat-popover-host'));

		// Composer — Cursor-like
		const composer = dom.append(root, dom.$('.kosha-chat-composer'));
		const well = dom.append(composer, dom.$('.kosha-chat-composer-well'));

		this.attachChips = dom.append(well, dom.$('.kosha-chat-attach-chips'));

		this.inputEl = dom.append(well, dom.$('textarea.kosha-chat-input')) as HTMLTextAreaElement;
		this.inputEl.placeholder = localize('kosha.chat.placeholder', 'Plan, build, / for skills…');
		this.inputEl.rows = 2;
		this.ui.add(dom.addDisposableListener(this.inputEl, 'input', () => this.onComposerInput()));
		this.ui.add(dom.addDisposableListener(this.inputEl, 'keydown', e => {
			if (this.openPopover === 'skills') {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					this.moveSkillHighlight(1);
					return;
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					this.moveSkillHighlight(-1);
					return;
				}
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					this.acceptHighlightedSkill();
					return;
				}
				if (e.key === 'Tab' && this.skillMatches.length) {
					e.preventDefault();
					this.acceptHighlightedSkill();
					return;
				}
				if (e.key === 'Escape') {
					e.preventDefault();
					this.closePopovers();
					return;
				}
			}
			if (e.key === 'Escape') {
				this.closePopovers();
				return;
			}
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				void this.onSend();
			}
		}));

		const bar = dom.append(well, dom.$('.kosha-chat-bar'));
		const left = dom.append(bar, dom.$('.kosha-chat-bar-left'));
		const right = dom.append(bar, dom.$('.kosha-chat-bar-right'));

		this.modelBtn = dom.append(left, dom.$('button.kosha-chat-pill')) as HTMLButtonElement;
		this.modelBtn.type = 'button';
		this.modelBtn.setAttribute('aria-haspopup', 'listbox');
		this.modelBtn.title = localize('kosha.chat.modelPicker', 'Model');
		this.ui.add(dom.addDisposableListener(this.modelBtn, 'click', () => this.togglePopover('model')));

		const fileInput = dom.append(right, dom.$('input')) as HTMLInputElement;
		fileInput.type = 'file';
		fileInput.multiple = true;
		fileInput.style.display = 'none';
		const attachBtn = dom.append(right, dom.$('button.kosha-chat-icon-btn')) as HTMLButtonElement;
		attachBtn.type = 'button';
		attachBtn.title = localize('kosha.chat.attach', 'Attach');
		attachBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.attach));
		this.ui.add(dom.addDisposableListener(attachBtn, 'click', () => fileInput.click()));
		this.ui.add(dom.addDisposableListener(fileInput, 'change', () => {
			this.pendingFiles = fileInput.files ? Array.from(fileInput.files) : [];
			this.renderAttachChips();
			fileInput.value = '';
		}));

		this.sendBtn = dom.append(right, dom.$('button.kosha-chat-send')) as HTMLButtonElement;
		this.sendBtn.type = 'button';
		this.sendBtn.title = localize('kosha.chat.send', 'Send');
		this.sendBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.arrowUp));
		this.ui.add(dom.addDisposableListener(this.sendBtn, 'click', () => void this.onSend()));

		this.stopBtn = dom.append(right, dom.$('button.kosha-chat-stop')) as HTMLButtonElement;
		this.stopBtn.type = 'button';
		this.stopBtn.title = localize('kosha.chat.stop', 'Stop');
		this.stopBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.debugStop));
		this.stopBtn.style.display = 'none';
		this.ui.add(dom.addDisposableListener(this.stopBtn, 'click', () => void this.session.cancel()));

		this.ui.add(dom.addDisposableListener(root, 'click', e => {
			const t = e.target as HTMLElement;
			if (!t.closest('.kosha-chat-popover') && !t.closest('.kosha-chat-pill') && !t.closest('.kosha-chat-history') && !t.closest('.kosha-chat-strip-actions')) {
				if (this.openPopover === 'model' || this.openPopover === 'skills') {
					this.closePopovers();
				}
			}
		}));

		void this.session.bootstrap().then(() => {
			this.syncPickerLabels();
			this.renderTabs();
			this.renderHistoryList();
		}).catch(err => {
			const message = err instanceof Error ? err.message : String(err);
			this.renderTranscript([{ id: 'boot-error', role: 'status', text: message }]);
		});

		this.renderTranscript(this.session.entries);
		this.syncBusy(this.session.busy);
		this.syncPickerLabels();
		this.syncProjectChip();
	}

	private syncProjectChip(): void {
		if (!this.projectChip) {
			return;
		}
		const name = this.session.selectedProjectName;
		if (!name) {
			this.projectChip.style.display = 'none';
			this.projectChip.textContent = '';
			return;
		}
		this.projectChip.style.display = '';
		this.projectChip.textContent = name;
		this.projectChip.title = localize('kosha.chat.projectScope', 'Chats scoped to Kshetro: {0}', name);
	}

	private async onSend(): Promise<void> {
		if (!this.inputEl || this.session.busy) {
			return;
		}
		const text = this.inputEl.value;
		if (!text.trim()) {
			return;
		}
		this.closePopovers();
		const files = this.pendingFiles;
		this.pendingFiles = [];
		this.renderAttachChips();
		this.inputEl.value = '';
		await this.session.send({
			text,
			provider: this.session.selectedModelId ?? this.session.selectedModeId,
			skillNames: this.parseSkillsFromText(text),
			files: files.length ? files : undefined,
		});
	}

	private parseSkillsFromText(text: string): string[] | undefined {
		const names = new Set<string>();
		for (const skill of this.session.skills) {
			if (text.includes(`/${skill.name}`)) {
				names.add(skill.name);
			}
		}
		return names.size ? [...names] : undefined;
	}

	private syncPickerLabels(): void {
		if (this.modelBtn) {
			this.modelBtn.textContent = `${this.session.modelLabel} ▾`;
		}
	}

	private renderTabs(): void {
		if (!this.tabsEl) {
			return;
		}
		dom.clearNode(this.tabsEl);
		for (const id of this.session.openTabIds) {
			const s = this.session.sessions.find(x => x.id === id);
			const tab = dom.append(this.tabsEl, dom.$('button.kosha-chat-tab')) as HTMLButtonElement;
			tab.type = 'button';
			if (id === this.session.activeSessionId) {
				tab.classList.add('active');
			}
			const label = dom.append(tab, dom.$('span.kosha-chat-tab-label'));
			label.textContent = s?.session_name || localize('kosha.chat.untitled', 'Untitled');
			const close = dom.append(tab, dom.$('span.kosha-chat-tab-close'));
			close.textContent = '×';
			this.ui.add(dom.addDisposableListener(tab, 'click', e => {
				if ((e.target as HTMLElement).classList.contains('kosha-chat-tab-close')) {
					e.stopPropagation();
					this.session.closeTab(id);
					return;
				}
				void this.session.openSession(id);
			}));
		}
		if (!this.session.openTabIds.length) {
			const ghost = dom.append(this.tabsEl, dom.$('span.kosha-chat-tab-ghost'));
			ghost.textContent = localize('kosha.chat.newTabHint', 'New chat');
		}
	}

	private renderHistoryList(): void {
		if (!this.historyList) {
			return;
		}
		dom.clearNode(this.historyList);
		if (!this.session.sessions.length) {
			dom.append(this.historyList, dom.$('.kosha-chat-history-empty')).textContent =
				localize('kosha.chat.historyEmpty', 'No chats yet');
			return;
		}
		for (const s of this.session.sessions) {
			const row = dom.append(this.historyList, dom.$('button.kosha-chat-history-row')) as HTMLButtonElement;
			row.type = 'button';
			if (s.id === this.session.activeSessionId) {
				row.classList.add('active');
			}
			dom.append(row, dom.$('span.kosha-chat-history-name')).textContent = s.session_name || 'Untitled';
			const meta = dom.append(row, dom.$('span.kosha-chat-history-meta'));
			meta.textContent = s.updated_at ? formatRelative(s.updated_at) : '';
			this.ui.add(dom.addDisposableListener(row, 'click', () => {
				this.closePopovers();
				void this.session.openSession(s.id);
			}));
		}
	}

	private async toggleHistory(): Promise<void> {
		if (this.openPopover === 'history') {
			this.closePopovers();
			return;
		}
		this.closePopovers();
		this.openPopover = 'history';
		if (this.historyPanel) {
			this.historyPanel.style.display = '';
		}
		await this.session.refreshSessions();
		this.renderHistoryList();
	}

	private togglePopover(kind: 'model'): void {
		if (this.openPopover === kind) {
			this.closePopovers();
			return;
		}
		this.closePopovers();
		this.openPopover = kind;
		this.renderModelPopover();
	}

	private closePopovers(): void {
		this.openPopover = undefined;
		this.skillMatches = [];
		this.skillHighlight = 0;
		if (this.popoverHost) {
			dom.clearNode(this.popoverHost);
		}
		if (this.historyPanel) {
			this.historyPanel.style.display = 'none';
		}
	}

	private onComposerInput(): void {
		if (!this.inputEl) {
			return;
		}
		const token = getActiveSlashToken(this.inputEl.value, this.inputEl.selectionStart ?? 0);
		if (!token) {
			if (this.openPopover === 'skills') {
				this.closePopovers();
			}
			return;
		}
		this.renderSkillsPopover(token.query);
	}

	private moveSkillHighlight(delta: number): void {
		if (!this.skillMatches.length) {
			return;
		}
		this.skillHighlight = (this.skillHighlight + delta + this.skillMatches.length) % this.skillMatches.length;
		this.renderSkillsPopover(undefined, true);
	}

	private acceptHighlightedSkill(): void {
		const skill = this.skillMatches[this.skillHighlight];
		if (skill) {
			this.insertSkill(skill.name);
		}
	}

	private insertSkill(name: string): void {
		if (!this.inputEl) {
			return;
		}
		const caret = this.inputEl.selectionStart ?? this.inputEl.value.length;
		const token = getActiveSlashToken(this.inputEl.value, caret);
		if (!token) {
			this.closePopovers();
			return;
		}
		const insert = `/${name} `;
		this.inputEl.value = this.inputEl.value.slice(0, token.start) + insert + this.inputEl.value.slice(token.end);
		const pos = token.start + insert.length;
		this.inputEl.setSelectionRange(pos, pos);
		this.inputEl.focus();
		this.closePopovers();
	}

	private renderSkillsPopover(query?: string, keepOpen = false): void {
		if (!this.popoverHost || !this.inputEl) {
			return;
		}
		const token = getActiveSlashToken(this.inputEl.value, this.inputEl.selectionStart ?? 0);
		const q = (query ?? token?.query ?? '').toLowerCase();
		if (!token && !keepOpen) {
			this.closePopovers();
			return;
		}

		this.skillMatches = this.session.skills
			.filter(s => !q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
			.map(s => ({ name: s.name, description: s.description }));
		if (this.skillHighlight >= this.skillMatches.length) {
			this.skillHighlight = 0;
		}

		if (this.openPopover !== 'skills') {
			this.closePopovers();
			this.openPopover = 'skills';
		} else {
			dom.clearNode(this.popoverHost);
		}

		const pop = dom.append(this.popoverHost, dom.$('.kosha-chat-popover kosha-chat-popover-skills'));
		const list = dom.append(pop, dom.$('.kosha-chat-popover-list'));
		if (!this.session.skills.length) {
			dom.append(list, dom.$('.kosha-chat-popover-empty')).textContent =
				localize('kosha.chat.noSkills', 'No skills loaded. Sign in and retry.');
			return;
		}
		if (!this.skillMatches.length) {
			dom.append(list, dom.$('.kosha-chat-popover-empty')).textContent =
				localize('kosha.chat.noSkillsMatch', 'No skills match');
			return;
		}
		this.skillMatches.forEach((skill, i) => {
			const item = dom.append(list, dom.$('button.kosha-chat-popover-item')) as HTMLButtonElement;
			item.type = 'button';
			if (i === this.skillHighlight) {
				item.classList.add('active');
			}
			const title = dom.append(item, dom.$('span.kosha-chat-popover-item-title'));
			title.textContent = `/${skill.name}`;
			if (skill.description) {
				const sub = dom.append(item, dom.$('span.kosha-chat-popover-item-sub'));
				sub.textContent = skill.description;
			}
			this.ui.add(dom.addDisposableListener(item, 'click', () => this.insertSkill(skill.name)));
			this.ui.add(dom.addDisposableListener(item, 'mouseenter', () => {
				this.skillHighlight = i;
				for (const child of list.querySelectorAll('.kosha-chat-popover-item')) {
					child.classList.toggle('active', child === item);
				}
			}));
		});
	}

	private renderModelPopover(): void {
		if (!this.popoverHost) {
			return;
		}
		const pop = dom.append(this.popoverHost, dom.$('.kosha-chat-popover kosha-chat-popover-model'));
		const search = dom.append(pop, dom.$('input.kosha-chat-popover-search')) as HTMLInputElement;
		search.type = 'search';
		search.placeholder = localize('kosha.chat.searchModels', 'Search models');
		const list = dom.append(pop, dom.$('.kosha-chat-popover-list'));

		const render = (filter: string) => {
			dom.clearNode(list);
			const auto = dom.append(list, dom.$('button.kosha-chat-popover-item')) as HTMLButtonElement;
			auto.type = 'button';
			const autoTitle = dom.append(auto, dom.$('span.kosha-chat-popover-item-title'));
			autoTitle.textContent = 'Auto';
			const autoSub = dom.append(auto, dom.$('span.kosha-chat-popover-item-sub'));
			autoSub.textContent = localize('kosha.chat.autoHint', 'Let Kosha pick');
			if (!this.session.selectedModelId) {
				auto.classList.add('active');
			}
			this.ui.add(dom.addDisposableListener(auto, 'click', () => {
				this.session.selectedModelId = undefined;
				this.syncPickerLabels();
				this.closePopovers();
			}));

			const q = filter.trim().toLowerCase();
			const groups = groupModelsByTier(this.session.models, this.session.providers.tiers, q);
			for (const [tier, models] of groups) {
				dom.append(list, dom.$('.kosha-chat-popover-group')).textContent = tier;
				for (const m of models) {
					const item = dom.append(list, dom.$('button.kosha-chat-popover-item')) as HTMLButtonElement;
					item.type = 'button';
					const title = dom.append(item, dom.$('span.kosha-chat-popover-item-title'));
					title.textContent = displayModelName(m);
					const sub = dom.append(item, dom.$('span.kosha-chat-popover-item-sub'));
					sub.textContent = m.provider;
					if (m.model_id === this.session.selectedModelId || m.provider === this.session.selectedModelId) {
						item.classList.add('active');
					}
					this.ui.add(dom.addDisposableListener(item, 'click', () => {
						this.session.selectedModelId = m.model_id || m.provider;
						this.syncPickerLabels();
						this.closePopovers();
					}));
				}
			}
			if (!groups.size && q) {
				dom.append(list, dom.$('.kosha-chat-popover-empty')).textContent =
					localize('kosha.chat.noModels', 'No models match');
			} else if (!this.session.models.length) {
				dom.append(list, dom.$('.kosha-chat-popover-empty')).textContent =
					localize('kosha.chat.noModelsSignIn', 'Sign in to load models');
			}
		};

		render('');
		this.ui.add(dom.addDisposableListener(search, 'input', () => render(search.value)));
		setTimeout(() => search.focus(), 0);
	}

	private renderAttachChips(): void {
		if (!this.attachChips) {
			return;
		}
		dom.clearNode(this.attachChips);
		this.attachChips.style.display = this.pendingFiles.length ? '' : 'none';
		for (const file of this.pendingFiles) {
			const chip = dom.append(this.attachChips, dom.$('.kosha-chat-file-chip'));
			chip.textContent = file.name;
		}
	}

	private renderTranscript(entries: readonly IKoshaTranscriptEntry[]): void {
		if (!this.transcriptEl || !this.emptyEl) {
			return;
		}
		this.markdownStore.clear();
		for (const child of Array.from(this.transcriptEl.children)) {
			if (child !== this.emptyEl) {
				child.remove();
			}
		}
		this.emptyEl.style.display = entries.length ? 'none' : '';
		const canAct = !this.session.busy;
		const lastAssistantId = [...entries].reverse().find(e => e.role === 'assistant' && !e.streaming)?.id;
		for (const entry of entries) {
			const row = dom.append(this.transcriptEl, dom.$(`.kosha-chat-turn.${entry.role}`));
			const bubble = dom.append(row, dom.$(`.kosha-chat-bubble.${entry.role}`));
			if (entry.role === 'assistant' && !entry.streaming) {
				this.renderAssistantMarkdown(bubble, entry.text || '');
			} else {
				bubble.textContent = entry.text || '';
			}
			if (entry.streaming) {
				bubble.classList.add('streaming');
			}

			if (canAct && entry.role === 'user') {
				const actions = dom.append(row, dom.$('.kosha-chat-turn-actions'));
				const editBtn = dom.append(actions, dom.$('button.kosha-chat-turn-action')) as HTMLButtonElement;
				editBtn.type = 'button';
				editBtn.title = localize('kosha.chat.edit', 'Edit & resend');
				editBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.edit));
				this.ui.add(dom.addDisposableListener(editBtn, 'click', () => this.onEditUser(entry.id)));
			} else if (entry.role === 'assistant' && !entry.streaming && entry.text.trim()) {
				const actions = dom.append(row, dom.$('.kosha-chat-turn-actions'));
				const copyBtn = dom.append(actions, dom.$('button.kosha-chat-turn-action')) as HTMLButtonElement;
				copyBtn.type = 'button';
				copyBtn.title = localize('kosha.chat.copy', 'Copy');
				copyBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.copy));
				this.ui.add(dom.addDisposableListener(copyBtn, 'click', () => void this.onCopyAssistant(entry.text, copyBtn)));
				if (canAct && entry.id === lastAssistantId) {
					const retryBtn = dom.append(actions, dom.$('button.kosha-chat-turn-action')) as HTMLButtonElement;
					retryBtn.type = 'button';
					retryBtn.title = localize('kosha.chat.retry', 'Retry');
					retryBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.refresh));
					this.ui.add(dom.addDisposableListener(retryBtn, 'click', () => void this.session.retryAssistant(entry.id)));
				}
			}
		}
		this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
	}

	private onEditUser(entryId: string): void {
		const text = this.session.beginEditUserMessage(entryId);
		if (text === undefined || !this.inputEl) {
			return;
		}
		this.inputEl.value = text;
		this.inputEl.focus();
		this.inputEl.setSelectionRange(text.length, text.length);
	}

	private async onCopyAssistant(text: string, btn: HTMLButtonElement): Promise<void> {
		await this.clipboardService.writeText(text);
		const prevTitle = btn.title;
		btn.title = localize('kosha.chat.copied', 'Copied');
		btn.classList.remove(...ThemeIcon.asClassNameArray(Codicon.copy));
		btn.classList.add(...ThemeIcon.asClassNameArray(Codicon.check));
		setTimeout(() => {
			if (!btn.isConnected) {
				return;
			}
			btn.title = prevTitle;
			btn.classList.remove(...ThemeIcon.asClassNameArray(Codicon.check));
			btn.classList.add(...ThemeIcon.asClassNameArray(Codicon.copy));
		}, 1200);
	}

	private renderAssistantMarkdown(host: HTMLElement, text: string): void {
		const win = dom.getWindow(host);
		const katexExt = MarkedKatexSupport.getExtension(win, { throwOnError: false });
		if (!katexExt && !this.katexReady) {
			void MarkedKatexSupport.loadExtension(win, { throwOnError: false }).then(() => {
				this.katexReady = true;
				this.renderTranscript(this.session.entries);
			}).catch(() => {
				this.katexReady = true; // don't loop on failure
			});
		}

		const md = new MarkdownString(collapseBlankLines(text), { isTrusted: false, supportHtml: false });
		const rendered = renderMarkdown(md, {
			markedOptions: { gfm: true, breaks: true },
			markedExtensions: katexExt ? [katexExt] : [],
			sanitizerConfig: MarkedKatexSupport.getSanitizerOptions({
				allowedTags: allowedMarkdownHtmlTags,
				allowedAttributes: allowedMarkdownHtmlAttributes,
			}),
		});
		this.markdownStore.add(rendered);
		host.appendChild(rendered.element);
		rendered.element.classList.add('kosha-chat-md');
	}

	private syncBusy(busy: boolean): void {
		if (this.sendBtn) {
			this.sendBtn.disabled = busy;
			this.sendBtn.style.display = busy ? 'none' : '';
		}
		if (this.stopBtn) {
			this.stopBtn.style.display = busy ? '' : 'none';
		}
		if (this.inputEl) {
			this.inputEl.readOnly = busy;
		}
		// Refresh action affordances (edit/retry hidden while busy)
		this.renderTranscript(this.session.entries);
	}
}

function displayModelName(m: IKoshaProvider): string {
	return m.model_id || m.provider;
}

const TIER_ORDER = ['free', 'standard', 'pro', 'max', 'enterprise'];

function tierName(value: unknown): string | undefined {
	if (typeof value === 'string' && value.trim()) {
		return value.trim();
	}
	if (value && typeof value === 'object' && 'name' in value && typeof (value as { name: unknown }).name === 'string') {
		return (value as { name: string }).name.trim() || undefined;
	}
	if (value && typeof value === 'object' && 'id' in value && typeof (value as { id: unknown }).id === 'string') {
		return (value as { id: string }).id.trim() || undefined;
	}
	return undefined;
}

/** Group every model under its tier; honor API tier list order when present. */
function groupModelsByTier(
	models: readonly IKoshaProvider[],
	apiTiers: readonly unknown[] | undefined,
	filter: string,
): Map<string, IKoshaProvider[]> {
	const buckets = new Map<string, IKoshaProvider[]>();
	for (const m of models) {
		const hay = `${m.provider} ${m.model_id} ${m.tier || ''}`.toLowerCase();
		if (filter && !hay.includes(filter)) {
			continue;
		}
		const key = (m.tier || 'Other').trim() || 'Other';
		const list = buckets.get(key) ?? [];
		list.push(m);
		buckets.set(key, list);
	}

	const ordered = new Map<string, IKoshaProvider[]>();
	const seen = new Set<string>();
	const prefer = [
		...(apiTiers ?? []).map(tierName).filter((t): t is string => !!t),
		...TIER_ORDER.map(t => {
			for (const k of buckets.keys()) {
				if (k.toLowerCase() === t) {
					return k;
				}
			}
			return undefined;
		}).filter((t): t is string => !!t),
	];
	for (const name of prefer) {
		const hit = [...buckets.keys()].find(k => k.toLowerCase() === name.toLowerCase());
		if (hit && !seen.has(hit.toLowerCase()) && buckets.has(hit)) {
			ordered.set(hit, buckets.get(hit)!);
			seen.add(hit.toLowerCase());
		}
	}
	for (const [k, v] of buckets) {
		if (!seen.has(k.toLowerCase())) {
			ordered.set(k, v);
			seen.add(k.toLowerCase());
		}
	}
	return ordered;
}

/** Active `/token` at caret for skill autocomplete (no spaces in the token). */
function getActiveSlashToken(value: string, caret: number): { start: number; end: number; query: string } | undefined {
	const before = value.slice(0, Math.max(0, Math.min(caret, value.length)));
	const m = before.match(/(?:^|[\s])(\/[^\s]*)$/);
	if (!m) {
		return undefined;
	}
	const token = m[1];
	const start = before.length - token.length;
	return { start, end: caret, query: token.slice(1) };
}

function formatRelative(iso: string): string {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) {
		return '';
	}
	const mins = Math.round((Date.now() - t) / 60_000);
	if (mins < 1) {
		return 'now';
	}
	if (mins < 60) {
		return `${mins}m`;
	}
	const hrs = Math.round(mins / 60);
	if (hrs < 48) {
		return `${hrs}h`;
	}
	return `${Math.round(hrs / 24)}d`;
}

/** LLM replies often ship with 3–6 blank lines between sections — collapse before GFM. */
function collapseBlankLines(text: string): string {
	return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
