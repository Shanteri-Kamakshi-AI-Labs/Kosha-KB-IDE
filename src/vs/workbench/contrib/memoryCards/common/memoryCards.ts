/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const MemoryCardsViewContainerId = 'workbench.view.memoryCards';
export const MemoryCardsViewId = 'workbench.view.memoryCards.view';

export interface IMemoryCard {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
}

export const MEMORY_CARDS: readonly IMemoryCard[] = Object.freeze([
	{ id: 'project-context', title: 'Project context', summary: 'Goals, constraints, and working agreements for this workspace.' },
	{ id: 'preferences', title: 'Preferences', summary: 'Style, tooling, and review preferences the agents should respect.' },
	{ id: 'decisions', title: 'Decisions', summary: 'Durable choices and the reasons behind them.' },
]);

export function findMemoryCard(id: string): IMemoryCard | undefined {
	return MEMORY_CARDS.find(card => card.id === id);
}
