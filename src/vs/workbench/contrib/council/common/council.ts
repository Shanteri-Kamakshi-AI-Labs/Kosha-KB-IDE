/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const CouncilViewContainerId = 'workbench.panel.council';
export const CouncilViewId = 'workbench.panel.council.view';
export const CouncilSelectedPersonasStorageKey = 'council.selectedPersonaIds';

export interface ICouncilPersona {
	readonly id: string;
	readonly name: string;
	readonly role: string;
}

export const COUNCIL_PERSONAS: readonly ICouncilPersona[] = Object.freeze([
	{ id: 'architect', name: 'Architect', role: 'Shapes structure and long-term design trade-offs.' },
	{ id: 'skeptic', name: 'Skeptic', role: 'Challenges assumptions and finds weak spots.' },
	{ id: 'implementer', name: 'Implementer', role: 'Focuses on concrete, shippable changes.' },
	{ id: 'researcher', name: 'Researcher', role: 'Gathers context and cites prior art.' },
]);

export function parseSelectedPersonaIds(raw: string | undefined): string[] {
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		const known = new Set(COUNCIL_PERSONAS.map(p => p.id));
		return parsed.filter((id): id is string => typeof id === 'string' && known.has(id));
	} catch {
		return [];
	}
}

export function togglePersonaSelection(selectedIds: readonly string[], personaId: string): string[] {
	const known = new Set(COUNCIL_PERSONAS.map(p => p.id));
	if (!known.has(personaId)) {
		return [...selectedIds];
	}
	const next = new Set(selectedIds);
	if (next.has(personaId)) {
		next.delete(personaId);
	} else {
		next.add(personaId);
	}
	return COUNCIL_PERSONAS.map(p => p.id).filter(id => next.has(id));
}

export function serializeSelectedPersonaIds(selectedIds: readonly string[]): string {
	return JSON.stringify([...selectedIds]);
}
