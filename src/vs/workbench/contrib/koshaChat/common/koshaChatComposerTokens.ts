/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IKoshaComposerToken {
	readonly start: number;
	readonly end: number;
	readonly query: string;
}

/** Active `/token` at caret for skill autocomplete (no spaces in the token). */
export function getActiveSlashToken(value: string, caret: number): IKoshaComposerToken | undefined {
	return getActiveLeaderToken(value, caret, '/');
}

/** Active `@token` at caret for file/folder mentions (no spaces in the token). */
export function getActiveAtToken(value: string, caret: number): IKoshaComposerToken | undefined {
	return getActiveLeaderToken(value, caret, '@');
}

function getActiveLeaderToken(value: string, caret: number, leader: '/' | '@'): IKoshaComposerToken | undefined {
	const before = value.slice(0, Math.max(0, Math.min(caret, value.length)));
	const escaped = leader === '/' ? '\\/' : '@';
	const re = new RegExp(`(?:^|[\\s])(${escaped}[^\\s]*)$`);
	const m = before.match(re);
	if (!m) {
		return undefined;
	}
	const token = m[1];
	const start = before.length - token.length;
	return { start, end: caret, query: token.slice(1) };
}
