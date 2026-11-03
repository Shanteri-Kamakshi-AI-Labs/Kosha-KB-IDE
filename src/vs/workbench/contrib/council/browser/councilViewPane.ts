/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/council.css';
import * as dom from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService } from '../../../common/views.js';
import {
	COUNCIL_PERSONAS,
	CouncilSelectedPersonasStorageKey,
	parseSelectedPersonaIds,
	serializeSelectedPersonaIds,
	togglePersonaSelection,
} from '../common/council.js';

interface ICouncilPersonaRow {
	readonly personaId: string;
	readonly row: HTMLElement;
	readonly checkbox: HTMLInputElement;
}

export class CouncilViewPane extends ViewPane {

	private selectedIds: string[] = [];
	private rows: ICouncilPersonaRow[] = [];

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
		@IStorageService private readonly storageService: IStorageService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.selectedIds = parseSelectedPersonaIds(
			this.storageService.get(CouncilSelectedPersonasStorageKey, StorageScope.WORKSPACE)
		);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const root = dom.append(container, dom.$('.council-pane'));
		dom.append(root, dom.$('p.council-pane-intro')).textContent = localize(
			'council.intro',
			'Select personas for the council.'
		);

		const list = dom.append(root, dom.$('ul.council-persona-list'));
		this.rows = COUNCIL_PERSONAS.map(persona => {
			const row = dom.append(list, dom.$('li.council-persona'));
			row.setAttribute('role', 'checkbox');
			row.tabIndex = 0;

			const checkbox = dom.append(row, dom.$('input')) as HTMLInputElement;
			checkbox.type = 'checkbox';
			checkbox.id = `council-persona-${persona.id}`;

			const copy = dom.append(row, dom.$('.council-persona-copy'));
			const name = dom.append(copy, dom.$('span.council-persona-name'));
			name.textContent = persona.name;
			const role = dom.append(copy, dom.$('span.council-persona-role'));
			role.textContent = persona.role;

			const toggle = () => this.setPersonaSelected(persona.id, !this.selectedIds.includes(persona.id));
			this._register(dom.addDisposableListener(row, 'click', e => {
				if (e.target === checkbox) {
					return;
				}
				toggle();
			}));
			this._register(dom.addDisposableListener(row, 'keydown', e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					toggle();
				}
			}));
			this._register(dom.addDisposableListener(checkbox, 'change', () => {
				this.setPersonaSelected(persona.id, checkbox.checked);
			}));

			return { personaId: persona.id, row, checkbox };
		});

		this.syncRows();
	}

	private setPersonaSelected(personaId: string, selected: boolean): void {
		const currentlySelected = this.selectedIds.includes(personaId);
		if (currentlySelected === selected) {
			this.syncRows();
			return;
		}
		this.selectedIds = togglePersonaSelection(this.selectedIds, personaId);
		this.storageService.store(
			CouncilSelectedPersonasStorageKey,
			serializeSelectedPersonaIds(this.selectedIds),
			StorageScope.WORKSPACE,
			StorageTarget.USER
		);
		this.syncRows();
	}

	private syncRows(): void {
		const selected = new Set(this.selectedIds);
		for (const row of this.rows) {
			const isSelected = selected.has(row.personaId);
			row.checkbox.checked = isSelected;
			row.row.classList.toggle('council-persona-selected', isSelected);
			row.row.setAttribute('aria-checked', String(isSelected));
		}
	}
}
