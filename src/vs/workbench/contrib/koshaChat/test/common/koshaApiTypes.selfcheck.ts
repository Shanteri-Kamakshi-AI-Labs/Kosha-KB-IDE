/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { isKoshaStrippedCommand, isKoshaStrippedPaletteCategory } from '../../../koshaChrome/common/koshaChrome.js';
import { KoshaChatViewContainerId } from '../../common/koshaChat.js';

suite('Kosha Chat strip + ids', () => {
	test('stock chat commands are stripped; kosha.chat is not', () => {
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.chat.open'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.panel.chat'), true);
		assert.strictEqual(isKoshaStrippedCommand('chat.configureToolSets'), true);
		assert.strictEqual(isKoshaStrippedCommand('kosha.chat.open'), false);
		assert.strictEqual(isKoshaStrippedCommand('kosha.auth.signIn'), false);
		assert.strictEqual(isKoshaStrippedPaletteCategory('Chat'), true);
		assert.strictEqual(isKoshaStrippedPaletteCategory('View'), false);
	});

	test('kosha chat container id is stable', () => {
		assert.strictEqual(KoshaChatViewContainerId, 'workbench.panel.koshaChat');
	});
});
