/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';

export const KoshaAgentScheme = 'kosha-agent';

export type KoshaAgentField = 'soul' | 'guidelines' | 'memory';

export const KOSHA_AGENT_FIELDS: readonly KoshaAgentField[] = Object.freeze(['soul', 'guidelines', 'memory']);

const FIELD_FILE: Record<KoshaAgentField, string> = {
	soul: 'Soul.md',
	guidelines: 'Guidelines.md',
	memory: 'Memory.md',
};

export function toKoshaAgentUri(harnessId: string, harnessName: string, field: KoshaAgentField): URI {
	const safe = (harnessName || harnessId).replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'agent';
	return URI.from({
		scheme: KoshaAgentScheme,
		authority: safe.toLowerCase(),
		path: `/${FIELD_FILE[field]}`,
		query: `id=${encodeURIComponent(harnessId)}&field=${field}`,
	});
}

export function parseKoshaAgentUri(uri: URI): { harnessId: string; field: KoshaAgentField } | undefined {
	if (uri.scheme !== KoshaAgentScheme) {
		return undefined;
	}
	const params = new URLSearchParams(uri.query);
	const id = params.get('id');
	const field = params.get('field');
	if (!id || (field !== 'soul' && field !== 'guidelines' && field !== 'memory')) {
		return undefined;
	}
	return { harnessId: id, field };
}
