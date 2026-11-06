/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type KoshaIconLibrary = 'codicon' | 'lucide' | 'react-icons';

export interface IKoshaIconId {
	readonly library: KoshaIconLibrary;
	readonly name: string;
}

/**
 * Parse `codicon:settings` | `lucide:brain` | `react-icons:si-github`.
 * Bare names (no prefix) default to `codicon:`.
 */
export function parseKoshaIconId(id: string): IKoshaIconId | undefined {
	const raw = id.trim();
	if (!raw) {
		return undefined;
	}
	const colon = raw.indexOf(':');
	if (colon <= 0) {
		return { library: 'codicon', name: raw };
	}
	const library = raw.slice(0, colon).toLowerCase();
	const name = raw.slice(colon + 1).trim();
	if (!name) {
		return undefined;
	}
	if (library === 'codicon' || library === 'lucide' || library === 'react-icons') {
		return { library, name };
	}
	return undefined;
}
