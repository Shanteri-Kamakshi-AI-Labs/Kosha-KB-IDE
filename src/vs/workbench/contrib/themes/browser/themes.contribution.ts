/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchThemeService, IWorkbenchColorTheme } from '../../../services/themes/common/workbenchThemeService.js';
import { IColorRegistry, Extensions as ColorRegistryExtensions } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Color } from '../../../../base/common/color.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { colorThemeSchemaId } from '../../../services/themes/common/colorThemeSchema.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';

const SelectColorThemeCommandId = 'workbench.action.selectTheme';
const SelectFileIconThemeCommandId = 'workbench.action.selectIconTheme';
const SelectProductIconThemeCommandId = 'workbench.action.selectProductIconTheme';

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SelectColorThemeCommandId,
			title: localize2('selectTheme.label', 'Color Theme'),
			category: Categories.Preferences,
			f1: false,
			precondition: ContextKeyExpr.false(),
		});
	}
	override async run(_accessor: ServicesAccessor) {
		// Kosha: color theme gallery removed; use the status-bar dark/light toggle.
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SelectFileIconThemeCommandId,
			title: localize2('selectIconTheme.label', 'File Icon Theme'),
			category: Categories.Preferences,
			f1: false,
			precondition: ContextKeyExpr.false(),
		});
	}
	override async run(_accessor: ServicesAccessor) {
		// Kosha: file icon theme gallery removed.
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SelectProductIconThemeCommandId,
			title: localize2('selectProductIconTheme.label', 'Product Icon Theme'),
			category: Categories.Preferences,
			f1: false,
			precondition: ContextKeyExpr.false(),
		});
	}
	override async run(_accessor: ServicesAccessor) {
		// Kosha: product icon theme gallery removed.
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.tryNewDefaultThemes',
			title: localize2('tryNewDefaultThemes', 'Try New Default Themes'),
			category: Categories.Preferences,
			f1: false,
			precondition: ContextKeyExpr.false(),
		});
	}
	override async run(_accessor: ServicesAccessor) {
		// Kosha: theme gallery removed.
	}
});

CommandsRegistry.registerCommand('workbench.action.previewColorTheme', async function (accessor: ServicesAccessor, extension: { publisher: string; name: string; version: string }, themeSettingsId?: string) {
	const themeService = accessor.get(IWorkbenchThemeService);
	let themes = findBuiltInThemes(await themeService.getColorThemes(), extension);
	if (themes.length === 0) {
		themes = await themeService.getMarketplaceColorThemes(extension.publisher, extension.name, extension.version);
	}
	for (const theme of themes) {
		if (!themeSettingsId || theme.settingsId === themeSettingsId) {
			await themeService.setColorTheme(theme, 'preview');
			return theme.settingsId;
		}
	}
	return undefined;
});

function findBuiltInThemes(themes: IWorkbenchColorTheme[], extension: { publisher: string; name: string }): IWorkbenchColorTheme[] {
	return themes.filter(({ extensionData }) => extensionData && extensionData.extensionIsBuiltin && equalsIgnoreCase(extensionData.extensionPublisher, extension.publisher) && equalsIgnoreCase(extensionData.extensionName, extension.name));
}

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.generateColorTheme',
			title: localize2('generateColorTheme.label', 'Generate Color Theme From Current Settings'),
			category: Categories.Developer,
			f1: true
		});
	}

	override run(accessor: ServicesAccessor) {
		const themeService = accessor.get(IWorkbenchThemeService);

		const theme = themeService.getColorTheme();
		const colors = Registry.as<IColorRegistry>(ColorRegistryExtensions.ColorContribution).getColors();
		const colorIds = colors.filter(c => !c.deprecationMessage).map(c => c.id).sort();
		const resultingColors: { [key: string]: string | null } = {};
		const inherited: string[] = [];
		for (const colorId of colorIds) {
			const color = theme.getColor(colorId, false);
			if (color) {
				resultingColors[colorId] = Color.Format.CSS.formatHexA(color, true);
			} else {
				inherited.push(colorId);
			}
		}
		const nullDefaults = [];
		for (const id of inherited) {
			const color = theme.getColor(id);
			if (color) {
				resultingColors['__' + id] = Color.Format.CSS.formatHexA(color, true);
			} else {
				nullDefaults.push(id);
			}
		}
		for (const id of nullDefaults) {
			resultingColors['__' + id] = null;
		}
		let contents = JSON.stringify({
			'$schema': colorThemeSchemaId,
			type: theme.type === ColorScheme.LIGHT || theme.type === ColorScheme.HIGH_CONTRAST_LIGHT ? 'light' : 'dark',
			colors: resultingColors,
			tokenColors: theme.tokenColors.filter(t => !!t.scope)
		}, null, '\t');
		contents = contents.replace(/\"__(.*)\": /g, '// "$1": ');

		const editorService = accessor.get(IEditorService);
		editorService.openEditor({ resource: undefined, contents, languageId: 'jsonc', options: { pinned: true, override: 'workbench.editors.defaultEditor' } });
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.toggleLightDarkThemes',
			title: localize2('toggleLightDarkThemes.label', 'Toggle between Light/Dark Themes'),
			category: Categories.Preferences,
			f1: false,
			precondition: ContextKeyExpr.false(),
		});
	}
	override async run(_accessor: ServicesAccessor) {
		// Kosha: use status-bar color mode toggle instead.
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.browseColorThemesInMarketplace',
			title: localize2('browseColorThemeInMarketPlace.label', 'Browse Color Themes in Marketplace'),
			category: Categories.Preferences,
			f1: false,
			precondition: ContextKeyExpr.false(),
		});
	}
	override async run(_accessor: ServicesAccessor) {
		// Kosha: marketplace theme browse removed.
	}
});

// Kosha: Themes submenu removed from Global Activity / Preferences.
