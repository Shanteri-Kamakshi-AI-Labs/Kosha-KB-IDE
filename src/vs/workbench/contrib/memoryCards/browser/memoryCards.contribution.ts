/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { MemoryCardsViewContainerId, MemoryCardsViewId } from '../common/memoryCards.js';
import { MemoryCardsViewPane } from './memoryCardsViewPane.js';

const memoryCardsIcon = registerIcon('memory-cards-view-icon', Codicon.circuitBoard, localize('memoryCardsViewIcon', 'View icon of the Memory Cards view.'));

const memoryCardsViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: MemoryCardsViewContainerId,
	title: localize2('memoryCards.viewContainer.label', 'Memory Cards'),
	icon: memoryCardsIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [MemoryCardsViewContainerId, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: MemoryCardsViewContainerId,
	hideIfEmpty: true,
	order: 3,
	alwaysUseContainerInfo: true,
	openCommandActionDescriptor: {
		id: MemoryCardsViewContainerId,
		mnemonicTitle: localize({ key: 'miViewMemoryCards', comment: ['&& denotes a mnemonic'] }, "&&Memory Cards"),
		order: 3,
	},
}, ViewContainerLocation.Sidebar);

const memoryCardsViewDescriptor: IViewDescriptor = {
	id: MemoryCardsViewId,
	containerIcon: memoryCardsViewContainer.icon,
	containerTitle: memoryCardsViewContainer.title.value,
	singleViewPaneContainerTitle: memoryCardsViewContainer.title.value,
	name: localize2('memoryCards.viewContainer.label', 'Memory Cards'),
	canToggleVisibility: false,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(MemoryCardsViewPane),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([memoryCardsViewDescriptor], memoryCardsViewContainer);
