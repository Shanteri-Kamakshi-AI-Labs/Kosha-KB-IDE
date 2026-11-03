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
import { AgentsViewContainerId, AgentsViewId } from '../common/agents.js';
import { AgentsViewPane } from './agentsViewPane.js';

const agentsIcon = registerIcon('kosha-agents-view-icon', Codicon.robot, localize('koshaAgentsViewIcon', 'View icon of the Agents view.'));

const agentsViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: AgentsViewContainerId,
	title: localize2('koshaAgents.viewContainer.label', 'Agents'),
	icon: agentsIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AgentsViewContainerId, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: AgentsViewContainerId,
	hideIfEmpty: true,
	order: 4,
	alwaysUseContainerInfo: true,
	openCommandActionDescriptor: {
		id: AgentsViewContainerId,
		mnemonicTitle: localize({ key: 'miViewKoshaAgents', comment: ['&& denotes a mnemonic'] }, "&&Agents"),
		order: 4,
	},
}, ViewContainerLocation.Sidebar);

const agentsViewDescriptor: IViewDescriptor = {
	id: AgentsViewId,
	containerIcon: agentsViewContainer.icon,
	containerTitle: agentsViewContainer.title.value,
	singleViewPaneContainerTitle: agentsViewContainer.title.value,
	name: localize2('koshaAgents.viewContainer.label', 'Agents'),
	canToggleVisibility: false,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(AgentsViewPane),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([agentsViewDescriptor], agentsViewContainer);
