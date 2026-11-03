/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { KshetroViewContainerId, KshetroViewId } from '../common/kshetro.js';
import { IKoshaKshetroService, KoshaKshetroService } from '../common/kshetroService.js';
import { KshetroViewPane } from './kshetroViewPane.js';

registerSingleton(IKoshaKshetroService, KoshaKshetroService, InstantiationType.Delayed);

const kshetroIcon = registerIcon('kosha-kshetro-view-icon', Codicon.folder, localize('koshaKshetroViewIcon', 'View icon of the Kshetro view.'));

const kshetroViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: KshetroViewContainerId,
	title: localize2('kosha.kshetro.viewContainer.label', 'Kshetro'),
	icon: kshetroIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [KshetroViewContainerId, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: KshetroViewContainerId,
	hideIfEmpty: true,
	order: 3,
	alwaysUseContainerInfo: true,
	openCommandActionDescriptor: {
		id: KshetroViewContainerId,
		mnemonicTitle: localize({ key: 'miViewKoshaKshetro', comment: ['&& denotes a mnemonic'] }, "&&Kshetro"),
		order: 3,
	},
}, ViewContainerLocation.Sidebar);

const kshetroViewDescriptor: IViewDescriptor = {
	id: KshetroViewId,
	containerIcon: kshetroViewContainer.icon,
	containerTitle: kshetroViewContainer.title.value,
	singleViewPaneContainerTitle: kshetroViewContainer.title.value,
	name: localize2('kosha.kshetro.viewContainer.label', 'Kshetro'),
	canToggleVisibility: false,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(KshetroViewPane),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([kshetroViewDescriptor], kshetroViewContainer);
