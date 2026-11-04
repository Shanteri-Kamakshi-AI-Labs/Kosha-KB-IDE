/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { KOSHA_CHAT_ATTACHMENT_MAX } from '../../common/koshaChatAttachmentService.js';
import { getActiveAtToken, getActiveSlashToken } from '../../common/koshaChatComposerTokens.js';

suite('Kosha Chat composer tokens', () => {
	test('slash token at caret', () => {
		const value = 'hello /sk';
		const token = getActiveSlashToken(value, value.length);
		assert.ok(token);
		assert.strictEqual(token!.query, 'sk');
		assert.strictEqual(token!.start, 6);
	});

	test('at token at caret', () => {
		const value = 'see @src/fo';
		const token = getActiveAtToken(value, value.length);
		assert.ok(token);
		assert.strictEqual(token!.query, 'src/fo');
		assert.strictEqual(value.slice(token!.start, token!.end), '@src/fo');
	});

	test('no token mid-word', () => {
		assert.strictEqual(getActiveAtToken('email@x', 7), undefined);
		assert.strictEqual(getActiveSlashToken('a/b', 3), undefined);
	});

	test('attachment max is a positive ceiling', () => {
		assert.ok(KOSHA_CHAT_ATTACHMENT_MAX >= 1);
	});
});
