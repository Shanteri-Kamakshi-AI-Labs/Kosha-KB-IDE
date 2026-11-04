/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IKoshaHarness } from '../../koshaChat/common/koshaApiTypes.js';

export const IKoshaAgentsService = createDecorator<IKoshaAgentsService>('koshaAgentsService');

export interface IKoshaAgentsService {
	readonly _serviceBrand: undefined;
	readonly selectedHarnessId: string | undefined;
	readonly selectedHarness: IKoshaHarness | undefined;
	readonly harnesses: readonly IKoshaHarness[];
	readonly onDidChangeSelectedHarness: Event<string | undefined>;
	readonly onDidChangeHarnesses: Event<readonly IKoshaHarness[]>;
	setSelectedHarness(harnessId: string | undefined): void;
	setHarnesses(harnesses: readonly IKoshaHarness[]): void;
	upsertHarness(harness: IKoshaHarness): void;
}

export class KoshaAgentsService extends Disposable implements IKoshaAgentsService {
	declare readonly _serviceBrand: undefined;

	private _selectedHarnessId: string | undefined;
	private _harnesses: IKoshaHarness[] = [];

	private readonly _onDidChangeSelectedHarness = this._register(new Emitter<string | undefined>());
	readonly onDidChangeSelectedHarness = this._onDidChangeSelectedHarness.event;

	private readonly _onDidChangeHarnesses = this._register(new Emitter<readonly IKoshaHarness[]>());
	readonly onDidChangeHarnesses = this._onDidChangeHarnesses.event;

	get selectedHarnessId(): string | undefined {
		return this._selectedHarnessId;
	}

	get selectedHarness(): IKoshaHarness | undefined {
		if (!this._selectedHarnessId) {
			return undefined;
		}
		return this._harnesses.find(h => h.id === this._selectedHarnessId);
	}

	get harnesses(): readonly IKoshaHarness[] {
		return this._harnesses;
	}

	setSelectedHarness(harnessId: string | undefined): void {
		if (this._selectedHarnessId === harnessId) {
			return;
		}
		this._selectedHarnessId = harnessId;
		this._onDidChangeSelectedHarness.fire(harnessId);
	}

	setHarnesses(harnesses: readonly IKoshaHarness[]): void {
		this._harnesses = [...harnesses];
		if (this._selectedHarnessId && !this._harnesses.some(h => h.id === this._selectedHarnessId)) {
			this._selectedHarnessId = undefined;
			this._onDidChangeSelectedHarness.fire(undefined);
		}
		this._onDidChangeHarnesses.fire(this._harnesses);
	}

	upsertHarness(harness: IKoshaHarness): void {
		this._harnesses = [harness, ...this._harnesses.filter(h => h.id !== harness.id)];
		this._onDidChangeHarnesses.fire(this._harnesses);
	}
}

/** Click-again toggles selection off. */
export function toggleSelectedId(current: string | undefined, clicked: string): string | undefined {
	return current === clicked ? undefined : clicked;
}
