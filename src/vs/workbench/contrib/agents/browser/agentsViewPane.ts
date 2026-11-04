/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/agents.css';
import * as dom from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { GroupDirection, IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { KoshaApiClient } from '../../koshaChat/browser/koshaApiClient.js';
import { IKoshaHarness } from '../../koshaChat/common/koshaApiTypes.js';
import { IKoshaKshetroService } from '../../kshetro/common/kshetroService.js';
import { KOSHA_AGENT_FIELDS, KoshaAgentScheme, toKoshaAgentUri } from '../common/agentsPreview.js';
import { IKoshaAgentsService, toggleSelectedId } from '../common/agentsService.js';

export class AgentsViewPane extends ViewPane {

	private readonly ui = this._register(new DisposableStore());
	private readonly client: KoshaApiClient;
	private listEl: HTMLElement | undefined;
	private statusEl: HTMLElement | undefined;

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
		@IRequestService requestService: IRequestService,
		@IAuthenticationService auth: IAuthenticationService,
		@IProductService product: IProductService,
		@ICommandService commands: ICommandService,
		@IQuickInputService private readonly quickInput: IQuickInputService,
		@IKoshaAgentsService private readonly agents: IKoshaAgentsService,
		@IKoshaKshetroService private readonly kshetro: IKoshaKshetroService,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroups: IEditorGroupsService,
		@IModelService private readonly modelService: IModelService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.client = new KoshaApiClient(requestService, auth, product, commands);
		this._register(this.agents.onDidChangeHarnesses(() => this.renderList()));
		this._register(this.agents.onDidChangeSelectedHarness(() => this.renderList()));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.ui.clear();

		const root = dom.append(container, dom.$('.kosha-agents-pane'));
		const toolbar = dom.append(root, dom.$('.kosha-agents-toolbar'));
		dom.append(toolbar, dom.$('span.kosha-agents-title')).textContent = localize('kosha.agents.title', 'Agents');
		const newBtn = dom.append(toolbar, dom.$('button.kosha-agents-new')) as HTMLButtonElement;
		newBtn.type = 'button';
		newBtn.textContent = localize('kosha.agents.new', 'New');
		this.ui.add(dom.addDisposableListener(newBtn, 'click', () => void this.onCreate()));

		dom.append(root, dom.$('p.kosha-agents-intro')).textContent = localize(
			'kosha.agents.intro',
			'Personas (harnesses). Select one to filter Kshetro and attach on create.'
		);

		const clearBtn = dom.append(root, dom.$('button.kosha-agents-clear')) as HTMLButtonElement;
		clearBtn.type = 'button';
		clearBtn.textContent = localize('kosha.agents.clear', 'Clear selection');
		this.ui.add(dom.addDisposableListener(clearBtn, 'click', () => this.agents.setSelectedHarness(undefined)));

		this.statusEl = dom.append(root, dom.$('.kosha-agents-empty'));
		this.listEl = dom.append(root, dom.$('ul.kosha-agents-list'));

		void this.refresh();
	}

	private async refresh(): Promise<void> {
		if (this.statusEl) {
			this.statusEl.textContent = localize('kosha.agents.loading', 'Loading agents…');
			this.statusEl.style.display = '';
		}
		try {
			const harnesses = await this.client.listHarnesses(undefined, false);
			this.agents.setHarnesses(harnesses);
			if (!harnesses.length && this.statusEl) {
				this.statusEl.textContent = localize('kosha.agents.empty', 'No agents yet. Create one or sign in.');
				this.statusEl.style.display = '';
			} else if (this.statusEl) {
				this.statusEl.style.display = 'none';
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (this.statusEl) {
				this.statusEl.textContent = message || localize('kosha.agents.signIn', 'Sign in to load agents.');
				this.statusEl.style.display = '';
			}
			this.agents.setHarnesses([]);
		}
		this.renderList();
	}

	private renderList(): void {
		if (!this.listEl) {
			return;
		}
		dom.clearNode(this.listEl);
		for (const harness of this.agents.harnesses) {
			const li = dom.append(this.listEl, dom.$('li.kosha-agents-row'));
			const btn = dom.append(li, dom.$('button.kosha-agents-item')) as HTMLButtonElement;
			btn.type = 'button';
			const selected = harness.id === this.agents.selectedHarnessId;
			if (selected) {
				btn.classList.add('active');
			}
			dom.append(btn, dom.$('span.kosha-agents-item-name')).textContent = harness.harness_name || harness.id;
			const blurb = (harness.description || '').trim() || localize('kosha.agents.persona', 'Persona');
			dom.append(btn, dom.$('span.kosha-agents-item-meta')).textContent = selected
				? localize('kosha.agents.selected', 'Selected')
				: blurb;
			this.ui.add(dom.addDisposableListener(btn, 'click', () => {
				const next = toggleSelectedId(this.agents.selectedHarnessId, harness.id);
				this.agents.setSelectedHarness(next);
				if (next) {
					void this.attachToSelectedProject(next);
				}
			}));

			const viewBtn = dom.append(li, dom.$('button.kosha-agents-view')) as HTMLButtonElement;
			viewBtn.type = 'button';
			viewBtn.classList.add(...ThemeIcon.asClassNameArray(Codicon.openPreview));
			viewBtn.title = localize('kosha.agents.viewTitle', 'Open soul, guidelines, and memory in preview editors');
			viewBtn.setAttribute('aria-label', localize('kosha.agents.view', 'View'));
			this.ui.add(dom.addDisposableListener(viewBtn, 'click', e => {
				e.preventDefault();
				e.stopPropagation();
				void this.openPreview(harness);
			}));
		}
	}

	private async openPreview(harness: IKoshaHarness): Promise<void> {
		let full = harness;
		try {
			full = await this.client.getHarness(harness.id);
			this.agents.upsertHarness(full);
		} catch {
			// Use list payload if detail fetch fails.
		}

		const uris = KOSHA_AGENT_FIELDS.map(field => toKoshaAgentUri(full.id, full.harness_name || full.id, field));
		for (let i = 0; i < KOSHA_AGENT_FIELDS.length; i++) {
			const field = KOSHA_AGENT_FIELDS[i];
			const uri = uris[i];
			const value = full[field] ?? '';
			const existing = this.modelService.getModel(uri);
			if (existing) {
				this.modelService.updateModel(existing, value);
			}
		}

		await this.closeKoshaAgentEditors();

		const groups = this.ensurePreviewGroups(3);
		const options = { pinned: false, preserveFocus: true, inactive: true } as const;

		for (let i = 0; i < uris.length; i++) {
			await this.editorService.openEditor({
				resource: uris[i],
				options: i === uris.length - 1
					? { pinned: false, preserveFocus: false }
					: options,
			}, groups[i]);
		}
	}

	private ensurePreviewGroups(count: number) {
		const groups = [...this.editorGroups.groups];
		while (groups.length < count) {
			groups.push(this.editorGroups.addGroup(groups[groups.length - 1], GroupDirection.RIGHT));
		}
		return groups.slice(0, count);
	}

	private async closeKoshaAgentEditors(): Promise<void> {
		for (const group of [...this.editorGroups.groups]) {
			const toClose = group.editors.filter(editor => {
				const resource = editor.resource;
				return resource instanceof URI && resource.scheme === KoshaAgentScheme;
			});
			if (toClose.length) {
				await group.closeEditors(toClose);
			}
		}
	}

	private async onCreate(): Promise<void> {
		const mode = await this.quickInput.pick([
			{ id: 'scenario', label: localize('kosha.agents.create.scenario', 'Generate from scenario') },
			{ id: 'platform', label: localize('kosha.agents.create.platform', 'Clone platform persona') },
			{ id: 'manual', label: localize('kosha.agents.create.manual', 'Blank persona') },
		], {
			title: localize('kosha.agents.createTitle', 'New Agent'),
			placeHolder: localize('kosha.agents.createHow', 'How do you want to create it?'),
		});
		if (!mode) {
			return;
		}
		try {
			let harness;
			if (mode.id === 'scenario') {
				const scenario = await this.quickInput.input({
					title: localize('kosha.agents.scenarioTitle', 'Generate agent'),
					prompt: localize('kosha.agents.scenarioPrompt', 'Describe the persona'),
					placeHolder: localize('kosha.agents.scenarioPlaceholder', 'e.g. Senior TypeScript reviewer for API design'),
				});
				if (!scenario?.trim()) {
					return;
				}
				const name = await this.quickInput.input({
					title: localize('kosha.agents.nameTitle', 'Agent name'),
					prompt: localize('kosha.agents.namePrompt', 'Optional name'),
					placeHolder: localize('kosha.agents.namePlaceholder', 'Leave blank to auto-name'),
				});
				harness = await this.client.generateHarness({
					scenario: scenario.trim(),
					harness_name: name?.trim() || undefined,
				});
			} else if (mode.id === 'platform') {
				const platform = await this.client.listPlatformHarnesses();
				if (!platform.length) {
					throw new Error(localize('kosha.agents.noPlatform', 'No platform personas available.'));
				}
				const pick = await this.quickInput.pick(
					platform.map(p => ({
						id: p.id,
						label: p.harness_name || p.code,
						description: p.description || p.code,
					})),
					{ title: localize('kosha.agents.platformTitle', 'Clone platform persona') },
				);
				if (!pick) {
					return;
				}
				harness = await this.client.createHarnessFromPlatform({ platform_harness_id: pick.id });
			} else {
				const name = await this.quickInput.input({
					title: localize('kosha.agents.manualTitle', 'Blank persona'),
					prompt: localize('kosha.agents.manualPrompt', 'Agent name'),
					placeHolder: localize('kosha.agents.manualPlaceholder', 'e.g. Reviewer'),
				});
				if (!name?.trim()) {
					return;
				}
				harness = await this.client.createHarness({
					harness_name: name.trim(),
					soul: '',
					guidelines: '',
					memory: '',
				});
			}
			this.agents.upsertHarness(harness);
			this.agents.setSelectedHarness(harness.id);
			await this.attachToSelectedProject(harness.id);
			if (this.statusEl) {
				this.statusEl.style.display = 'none';
			}
			this.renderList();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (this.statusEl) {
				this.statusEl.textContent = message;
				this.statusEl.style.display = '';
			}
		}
	}

	private async attachToSelectedProject(harnessId: string): Promise<void> {
		const projectId = this.kshetro.selectedProjectId;
		if (!projectId) {
			return;
		}
		try {
			const updated = await this.client.updateProject(projectId, { harness_id: harnessId });
			this.kshetro.upsertProject(updated);
		} catch {
			// Selection still works for filter/create; attach is best-effort.
		}
	}
}
