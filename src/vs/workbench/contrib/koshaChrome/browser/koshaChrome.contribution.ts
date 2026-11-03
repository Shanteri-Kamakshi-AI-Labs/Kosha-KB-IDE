/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
import { ChatViewContainerId } from '../../chat/browser/chat.js';

// Config defaults for KB MVP — hide IDE chrome without deleting contrib trees.
Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerDefaultConfigurations([{
		overrides: {
			'telemetry.telemetryLevel': 'off',
			'update.mode': 'none',
			'update.titleBar': false,
			'git.enabled': false,
			'extensions.ignoreRecommendations': true,
			'extensions.autoCheckUpdates': false,
			'extensions.autoUpdate': false,
			'workbench.startupEditor': 'none',
			'workbench.tips.enabled': false,
			'chat.titleBar.openInAgentsWindow.enabled': false,
			'chat.titleBar.signIn.enabled': false,
			'chat.agentsWindowBanner.enabled': false,
			'chat.agentsWindowBanner.developerMode': false,
			// Cursor-like right Chat rail: keep auxiliary bar visible with Chat.
			'workbench.sideBar.location': 'left',
		}
	}]);

/** Keep error toasts; suppress info/warning noise for a thin chrome surface. */
class KoshaChromeNotificationsContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.koshaChromeNotifications';

	constructor(
		@INotificationService notificationService: INotificationService,
	) {
		super();
		notificationService.setFilter(NotificationsFilter.ERROR);
	}
}

/** Ensure the Cursor-like Chat rail is visible in the Auxiliary Bar on startup. */
class KoshaChatRailContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.koshaChatRail';

	constructor(
		@IViewsService viewsService: IViewsService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
	) {
		super();
		layoutService.setPartHidden(false, Parts.AUXILIARYBAR_PART);
		void viewsService.openViewContainer(ChatViewContainerId, true);
	}
}

registerWorkbenchContribution2(KoshaChromeNotificationsContribution.ID, KoshaChromeNotificationsContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(KoshaChatRailContribution.ID, KoshaChatRailContribution, WorkbenchPhase.Eventually);

/** Title-bar account icon — Keycloak session status / sign-in / sign-out. */
registerAction2(class KoshaAccountTitleBarAction extends Action2 {
	constructor() {
		super({
			id: 'kosha.auth.accountMenu',
			title: localize2('kosha.account', 'Account'),
			category: Categories.View,
			icon: Codicon.account,
			f1: true,
			menu: {
				id: MenuId.TitleBar,
				group: 'navigation',
				order: 100,
			},
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const auth = accessor.get(IAuthenticationService);
		const commands = accessor.get(ICommandService);
		const quickInput = accessor.get(IQuickInputService);
		const product = accessor.get(IProductService);
		const providerId = product.koshaAuth?.providerId ?? 'keycloak';
		const scopes = [...(product.koshaAuth?.scopes ?? ['openid', 'profile', 'email'])];

		let sessions: ReadonlyArray<{ readonly account: { readonly label: string } }> = [];
		try {
			sessions = await auth.getSessions(providerId, scopes);
		} catch {
			sessions = [];
		}

		if (!sessions.length) {
			await commands.executeCommand('kosha.auth.signIn');
			return;
		}

		const pick = await quickInput.pick([
			{ label: sessions[0].account.label, description: 'Signed in with Kosha', id: 'info' as const },
			{ label: 'Sign out of Kosha', id: 'signOut' as const },
		], { placeHolder: 'Kosha account' });

		if (pick?.id === 'signOut') {
			await commands.executeCommand('kosha.auth.signOut');
		}
	}
});
