/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/kshetro.css';
import * as dom from '../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
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
import { KoshaApiClient } from '../../koshaChat/browser/koshaApiClient.js';
import { IKoshaKshetroService } from '../common/kshetroService.js';

export class KshetroViewPane extends ViewPane {

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
		@IKoshaKshetroService private readonly kshetro: IKoshaKshetroService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.client = new KoshaApiClient(requestService, auth, product, commands);
		this._register(this.kshetro.onDidChangeProjects(() => this.renderList()));
		this._register(this.kshetro.onDidChangeSelectedProject(() => this.renderList()));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.ui.clear();

		const root = dom.append(container, dom.$('.kosha-kshetro-pane'));
		const toolbar = dom.append(root, dom.$('.kosha-kshetro-toolbar'));
		dom.append(toolbar, dom.$('span.kosha-kshetro-title')).textContent = localize('kosha.kshetro.title', 'Kshetro');
		const newBtn = dom.append(toolbar, dom.$('button.kosha-kshetro-new')) as HTMLButtonElement;
		newBtn.type = 'button';
		newBtn.textContent = localize('kosha.kshetro.new', 'New');
		this.ui.add(dom.addDisposableListener(newBtn, 'click', () => void this.onCreate()));

		dom.append(root, dom.$('p.kosha-kshetro-intro')).textContent = localize(
			'kosha.kshetro.intro',
			'Projects (Kshetro). Select one to scope Kosha Chat history.'
		);

		const clearBtn = dom.append(root, dom.$('button.kosha-kshetro-clear')) as HTMLButtonElement;
		clearBtn.type = 'button';
		clearBtn.textContent = localize('kosha.kshetro.clear', 'Clear selection');
		this.ui.add(dom.addDisposableListener(clearBtn, 'click', () => this.kshetro.setSelectedProject(undefined)));

		this.statusEl = dom.append(root, dom.$('.kosha-kshetro-empty'));
		this.listEl = dom.append(root, dom.$('ul.kosha-kshetro-list'));

		void this.refresh();
	}

	private async refresh(): Promise<void> {
		if (this.statusEl) {
			this.statusEl.textContent = localize('kosha.kshetro.loading', 'Loading projects…');
			this.statusEl.style.display = '';
		}
		try {
			const projects = await this.client.listProjects(undefined, undefined, false);
			this.kshetro.setProjects(projects);
			if (!projects.length && this.statusEl) {
				this.statusEl.textContent = localize('kosha.kshetro.empty', 'No Kshetro yet. Create one or sign in.');
				this.statusEl.style.display = '';
			} else if (this.statusEl) {
				this.statusEl.style.display = 'none';
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (this.statusEl) {
				this.statusEl.textContent = message || localize('kosha.kshetro.signIn', 'Sign in to load Kshetro.');
				this.statusEl.style.display = '';
			}
			this.kshetro.setProjects([]);
		}
		this.renderList();
	}

	private renderList(): void {
		if (!this.listEl) {
			return;
		}
		dom.clearNode(this.listEl);
		for (const project of this.kshetro.projects) {
			const li = dom.append(this.listEl, dom.$('li'));
			const btn = dom.append(li, dom.$('button.kosha-kshetro-item')) as HTMLButtonElement;
			btn.type = 'button';
			if (project.id === this.kshetro.selectedProjectId) {
				btn.classList.add('active');
			}
			dom.append(btn, dom.$('span.kosha-kshetro-item-name')).textContent = project.project_name || project.id;
			dom.append(btn, dom.$('span.kosha-kshetro-item-meta')).textContent =
				project.id === this.kshetro.selectedProjectId
					? localize('kosha.kshetro.selected', 'Selected')
					: localize('kosha.kshetro.open', 'Open');
			this.ui.add(dom.addDisposableListener(btn, 'click', () => {
				this.kshetro.setSelectedProject(project.id);
			}));
		}
	}

	private async onCreate(): Promise<void> {
		const name = await this.quickInput.input({
			title: localize('kosha.kshetro.createTitle', 'New Kshetro'),
			prompt: localize('kosha.kshetro.createPrompt', 'Project name'),
			placeHolder: localize('kosha.kshetro.createPlaceholder', 'e.g. Atlas'),
		});
		if (!name?.trim()) {
			return;
		}
		try {
			const project = await this.client.createProject({ project_name: name.trim() });
			this.kshetro.upsertProject(project);
			this.kshetro.setSelectedProject(project.id);
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
}
