/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AgentsViewContainerId, AgentsViewId } from '../../common/agents.js';
import { parseKoshaAgentUri, toKoshaAgentUri } from '../../common/agentsPreview.js';
import { toggleSelectedId } from '../../common/agentsService.js';

suite('Kosha Agents', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('view ids are stable', () => {
		assert.strictEqual(AgentsViewContainerId, 'workbench.view.koshaAgents');
		assert.strictEqual(AgentsViewId, 'workbench.view.koshaAgents.view');
	});

	test('toggleSelectedId deselects on second click', () => {
		assert.strictEqual(toggleSelectedId(undefined, 'a'), 'a');
		assert.strictEqual(toggleSelectedId('a', 'a'), undefined);
		assert.strictEqual(toggleSelectedId('a', 'b'), 'b');
	});

	test('agent preview uris round-trip field + id', () => {
		const uri = toKoshaAgentUri('h1', 'Reviewer', 'soul');
		assert.strictEqual(uri.path, '/Soul.md');
		assert.deepStrictEqual(parseKoshaAgentUri(uri), { harnessId: 'h1', field: 'soul' });
	});
});
