/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { localize, localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { KoshaChatViewContainerId, KoshaChatViewId } from '../common/koshaChat.js';
import { KoshaChatViewPane } from './koshaChatViewPane.js';

const koshaChatIcon = registerIcon('kosha-chat-view-icon', Codicon.commentDiscussion, localize('koshaChatViewIcon', 'View icon of the Kosha Chat view.'));

const koshaChatViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: KoshaChatViewContainerId,
	title: localize2('koshaChat.viewContainer.label', 'Kosha Chat'),
	icon: koshaChatIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [KoshaChatViewContainerId, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: KoshaChatViewContainerId,
	hideIfEmpty: false,
	order: 0,
	alwaysUseContainerInfo: true,
}, ViewContainerLocation.AuxiliaryBar, { isDefault: true, doNotRegisterOpenCommand: true });

const koshaChatViewDescriptor: IViewDescriptor = {
	id: KoshaChatViewId,
	containerIcon: koshaChatViewContainer.icon,
	containerTitle: koshaChatViewContainer.title.value,
	singleViewPaneContainerTitle: koshaChatViewContainer.title.value,
	name: localize2('koshaChat.viewContainer.label', 'Kosha Chat'),
	canToggleVisibility: false,
	canMoveView: true,
	openCommandActionDescriptor: {
		id: 'kosha.chat.open',
		title: koshaChatViewContainer.title,
		mnemonicTitle: localize({ key: 'miToggleKoshaChat', comment: ['&& denotes a mnemonic'] }, "&&Kosha Chat"),
		keybindings: {
			primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KeyI,
			mac: {
				primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KeyI,
			},
		},
		order: 1,
	},
	ctorDescriptor: new SyncDescriptor(KoshaChatViewPane),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([koshaChatViewDescriptor], koshaChatViewContainer);
