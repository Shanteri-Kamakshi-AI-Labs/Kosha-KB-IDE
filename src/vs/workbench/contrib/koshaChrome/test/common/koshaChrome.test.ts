/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { isKoshaStrippedCommand } from '../../common/koshaChrome.js';

suite('Kosha chrome command strip', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('strips IDE chrome commands and keeps editor/file opens', () => {
		assert.strictEqual(isKoshaStrippedCommand('workbench.debug.viewlet.action.restart'), true);
		assert.strictEqual(isKoshaStrippedCommand('scm.viewChanges'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.extensions.action.showExtensions'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.view.extensions'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.openAgentsWindow'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.openWorkspaceInAgentsWindow'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.chat.openWorkspaceInAgentsWindow.titleBar'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.chat.openSessionInAgentsWindow'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.openSettings'), true);
		assert.strictEqual(isKoshaStrippedCommand('update.checkForUpdate'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.showAboutDialog'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.chat.triggerSetupFromAccounts'), true);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.chat.signInIndicator'), true);

		assert.strictEqual(isKoshaStrippedCommand('workbench.action.quickOpen'), false);
		assert.strictEqual(isKoshaStrippedCommand('workbench.action.terminal.toggleTerminal'), false);
		assert.strictEqual(isKoshaStrippedCommand('workbench.view.explorer'), false);
		assert.strictEqual(isKoshaStrippedCommand('workbench.view.search'), false);
		assert.strictEqual(isKoshaStrippedCommand('kosha.toggleColorMode'), false);
		assert.strictEqual(isKoshaStrippedCommand('kosha.auth.signIn'), false);
	});
});
