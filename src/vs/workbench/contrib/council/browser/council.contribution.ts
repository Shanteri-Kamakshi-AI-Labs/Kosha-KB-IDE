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
import { CouncilViewContainerId, CouncilViewId } from '../common/council.js';
import { CouncilViewPane } from './councilViewPane.js';

const councilViewIcon = registerIcon('council-view-icon', Codicon.organization, localize('councilViewIcon', 'View icon of the council view.'));

// Kosha: Chat owns the Auxiliary Bar; Council personas stay available but demoted.
const councilViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: CouncilViewContainerId,
	title: localize2('council.viewContainer.label', 'Council'),
	icon: councilViewIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CouncilViewContainerId, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: CouncilViewContainerId,
	hideIfEmpty: true,
	order: 10,
}, ViewContainerLocation.AuxiliaryBar, { isDefault: false });

const councilViewDescriptor: IViewDescriptor = {
	id: CouncilViewId,
	containerIcon: councilViewContainer.icon,
	containerTitle: councilViewContainer.title.value,
	singleViewPaneContainerTitle: councilViewContainer.title.value,
	name: localize2('council.viewContainer.label', 'Council'),
	canToggleVisibility: false,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(CouncilViewPane),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([councilViewDescriptor], councilViewContainer);
