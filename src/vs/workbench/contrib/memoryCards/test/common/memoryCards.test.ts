/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { findMemoryCard, MEMORY_CARDS } from '../../common/memoryCards.js';

suite('Memory Cards', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('findMemoryCard returns known cards and undefined otherwise', () => {
		assert.ok(MEMORY_CARDS.length >= 1);
		assert.strictEqual(findMemoryCard(MEMORY_CARDS[0].id)?.title, MEMORY_CARDS[0].title);
		assert.strictEqual(findMemoryCard('missing'), undefined);
	});
});
