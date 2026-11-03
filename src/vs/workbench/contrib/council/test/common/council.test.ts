/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import {
	parseSelectedPersonaIds,
	serializeSelectedPersonaIds,
	togglePersonaSelection,
} from '../../common/council.js';

suite('Council personas', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('togglePersonaSelection adds and removes in stable order', () => {
		assert.deepStrictEqual(togglePersonaSelection([], 'skeptic'), ['skeptic']);
		assert.deepStrictEqual(togglePersonaSelection(['skeptic'], 'architect'), ['architect', 'skeptic']);
		assert.deepStrictEqual(togglePersonaSelection(['architect', 'skeptic'], 'skeptic'), ['architect']);
		assert.deepStrictEqual(togglePersonaSelection(['architect'], 'unknown'), ['architect']);
	});

	test('parseSelectedPersonaIds drops unknown ids and invalid JSON', () => {
		assert.deepStrictEqual(parseSelectedPersonaIds(undefined), []);
		assert.deepStrictEqual(parseSelectedPersonaIds('not-json'), []);
		assert.deepStrictEqual(parseSelectedPersonaIds('{"a":1}'), []);
		assert.deepStrictEqual(
			parseSelectedPersonaIds(JSON.stringify(['researcher', 'nope', 'implementer'])),
			['researcher', 'implementer']
		);
		assert.strictEqual(serializeSelectedPersonaIds(['architect', 'skeptic']), '["architect","skeptic"]');
	});
});
