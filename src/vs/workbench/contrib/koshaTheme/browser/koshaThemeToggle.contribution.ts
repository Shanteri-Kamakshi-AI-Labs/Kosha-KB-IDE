/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IStatusbarEntry, IStatusbarEntryAccessor, IStatusbarService, StatusbarAlignment } from '../../../services/statusbar/browser/statusbar.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IWorkbenchThemeService, ThemeSettingDefaults } from '../../../services/themes/common/workbenchThemeService.js';

export const ToggleKoshaColorModeCommandId = 'kosha.toggleColorMode';

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: ToggleKoshaColorModeCommandId,
			title: localize2('kosha.toggleColorMode', 'Toggle Kosha Dark / Light'),
			f1: false,
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const themeService = accessor.get(IWorkbenchThemeService);
		const current = themeService.getColorTheme();
		const nextId = isDark(current.type)
			? ThemeSettingDefaults.COLOR_THEME_LIGHT
			: ThemeSettingDefaults.COLOR_THEME_DARK;

		// Apply via ThemeService only — colorTheme / autoDetect settings may be deregistered in Kosha.
		await themeService.setColorTheme(nextId, ConfigurationTarget.USER);
	}
});

export class KoshaThemeStatusBarToggle extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.koshaThemeStatusBarToggle';

	private entry: IStatusbarEntryAccessor | undefined;

	constructor(
		@IStatusbarService private readonly statusbarService: IStatusbarService,
		@IWorkbenchThemeService private readonly themeService: IWorkbenchThemeService,
	) {
		super();
		this.update();
		this._register(this.themeService.onDidColorThemeChange(() => this.update()));
	}

	private update(): void {
		const props = this.getEntryProps();
		if (this.entry) {
			this.entry.update(props);
		} else {
			this.entry = this.statusbarService.addEntry(
				props,
				'kosha.colorModeStatusBarEntry',
				StatusbarAlignment.RIGHT,
				{ location: { id: 'status.editor.mode', priority: 100.1 }, alignment: StatusbarAlignment.RIGHT }
			);
			this._register(this.entry);
		}
	}

	private getEntryProps(): IStatusbarEntry {
		const theme = this.themeService.getColorTheme();
		const dark = isDark(theme.type);
		const label = dark
			? localize('kosha.status.dark', 'Kosha Dark')
			: localize('kosha.status.light', 'Kosha Light');
		return {
			name: localize('kosha.status.name', 'Color Mode'),
			text: `$(${Codicon.colorMode.id})`,
			ariaLabel: localize('kosha.status.aria', 'Color mode: {0}. Click to toggle.', label),
			tooltip: localize('kosha.status.tooltip', '{0} — click to toggle Dark / Light', label),
			command: ToggleKoshaColorModeCommandId,
			kind: 'prominent',
			showInAllWindows: true,
		};
	}
}

registerWorkbenchContribution2(KoshaThemeStatusBarToggle.ID, KoshaThemeStatusBarToggle, WorkbenchPhase.BlockRestore);
