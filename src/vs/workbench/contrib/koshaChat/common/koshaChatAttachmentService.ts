/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

/** Line/column range for a selection attachment (editor 1-based). */
export interface IKoshaAttachmentRange {
	readonly startLineNumber: number;
	readonly startColumn: number;
	readonly endLineNumber: number;
	readonly endColumn: number;
}

export type KoshaChatAttachmentKind = 'file' | 'folder' | 'selection';

export interface IKoshaChatAttachment {
	readonly id: string;
	readonly kind: KoshaChatAttachmentKind;
	readonly uri: URI;
	readonly label: string;
	readonly range?: IKoshaAttachmentRange;
}

export const IKoshaChatAttachmentService = createDecorator<IKoshaChatAttachmentService>('koshaChatAttachmentService');

export interface IKoshaChatAttachmentService {
	readonly _serviceBrand: undefined;
	readonly items: readonly IKoshaChatAttachment[];
	readonly onDidChange: Event<readonly IKoshaChatAttachment[]>;
	/** Returns newly added items (skips duplicates / over-cap). */
	attach(item: Omit<IKoshaChatAttachment, 'id'> | readonly Omit<IKoshaChatAttachment, 'id'>[]): IKoshaChatAttachment[];
	remove(id: string): void;
	clear(): void;
}

/** ponytail: hard cap avoids unbounded chip lists; raise if product needs more context pins. */
export const KOSHA_CHAT_ATTACHMENT_MAX = 32;

function attachmentKey(kind: KoshaChatAttachmentKind, uri: URI, range?: IKoshaAttachmentRange): string {
	if (range) {
		return `${kind}:${uri.toString()}:${range.startLineNumber}:${range.startColumn}:${range.endLineNumber}:${range.endColumn}`;
	}
	return `${kind}:${uri.toString()}`;
}

export class KoshaChatAttachmentService extends Disposable implements IKoshaChatAttachmentService {
	declare readonly _serviceBrand: undefined;

	private _items: IKoshaChatAttachment[] = [];
	private readonly _onDidChange = this._register(new Emitter<readonly IKoshaChatAttachment[]>());
	readonly onDidChange = this._onDidChange.event;

	get items(): readonly IKoshaChatAttachment[] {
		return this._items;
	}

	attach(item: Omit<IKoshaChatAttachment, 'id'> | readonly Omit<IKoshaChatAttachment, 'id'>[]): IKoshaChatAttachment[] {
		const list = Array.isArray(item) ? item : [item];
		const added: IKoshaChatAttachment[] = [];
		for (const next of list) {
			const id = attachmentKey(next.kind, next.uri, next.range);
			if (this._items.some(existing => existing.id === id)) {
				continue;
			}
			if (this._items.length >= KOSHA_CHAT_ATTACHMENT_MAX) {
				break;
			}
			const entry: IKoshaChatAttachment = { ...next, id };
			this._items = [...this._items, entry];
			added.push(entry);
		}
		if (added.length) {
			this._onDidChange.fire(this._items);
		}
		return added;
	}

	remove(id: string): void {
		const next = this._items.filter(item => item.id !== id);
		if (next.length === this._items.length) {
			return;
		}
		this._items = next;
		this._onDidChange.fire(this._items);
	}

	clear(): void {
		if (!this._items.length) {
			return;
		}
		this._items = [];
		this._onDidChange.fire(this._items);
	}
}
