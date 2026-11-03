/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { findKoshaAgent, KOSHA_AGENTS } from '../../common/agents.js';

suite('Kosha Agents', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('findKoshaAgent returns known agents and undefined otherwise', () => {
		assert.ok(KOSHA_AGENTS.length >= 1);
		assert.strictEqual(findKoshaAgent(KOSHA_AGENTS[0].id)?.name, KOSHA_AGENTS[0].name);
		assert.strictEqual(findKoshaAgent('missing'), undefined);
	});
});
