/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { parseKoshaIconId } from '../../common/koshaIconId.js';

suite('Kosha icon ids', () => {
	test('parses codicon / lucide / react-icons prefixes', () => {
		assert.deepStrictEqual(parseKoshaIconId('codicon:settings'), { library: 'codicon', name: 'settings' });
		assert.deepStrictEqual(parseKoshaIconId('lucide:brain'), { library: 'lucide', name: 'brain' });
		assert.deepStrictEqual(parseKoshaIconId('react-icons:si-github'), { library: 'react-icons', name: 'si-github' });
	});

	test('bare names default to codicon', () => {
		assert.deepStrictEqual(parseKoshaIconId('settings'), { library: 'codicon', name: 'settings' });
	});

	test('rejects empty / unknown library', () => {
		assert.strictEqual(parseKoshaIconId(''), undefined);
		assert.strictEqual(parseKoshaIconId('lucide:'), undefined);
		assert.strictEqual(parseKoshaIconId('foo:bar'), undefined);
	});
});
