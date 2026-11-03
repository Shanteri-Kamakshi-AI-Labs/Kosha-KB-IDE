/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const AgentsViewContainerId = 'workbench.view.koshaAgents';
export const AgentsViewId = 'workbench.view.koshaAgents.view';

export interface IKoshaAgent {
	readonly id: string;
	readonly name: string;
	readonly blurb: string;
}

export const KOSHA_AGENTS: readonly IKoshaAgent[] = Object.freeze([
	{ id: 'builder', name: 'Builder', blurb: 'Implements features and fixes with tight, reviewable diffs.' },
	{ id: 'reviewer', name: 'Reviewer', blurb: 'Reads changes for correctness, risk, and clarity.' },
	{ id: 'explorer', name: 'Explorer', blurb: 'Maps unfamiliar code and surfaces the real call graph.' },
]);

export function findKoshaAgent(id: string): IKoshaAgent | undefined {
	return KOSHA_AGENTS.find(agent => agent.id === id);
}
