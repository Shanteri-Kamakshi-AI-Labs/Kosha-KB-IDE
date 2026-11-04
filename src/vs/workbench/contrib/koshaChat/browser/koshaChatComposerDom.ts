/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IKoshaChatAttachment } from '../common/koshaChatAttachmentService.js';

const PILL_CLASS = 'kosha-chat-inline-pill';

export function isInlinePill(node: Node): node is HTMLElement {
	return node instanceof HTMLElement && node.classList.contains(PILL_CLASS);
}

/** Serialize composer DOM to plain text; pills become `@label`. */
export function serializeComposer(root: HTMLElement): string {
	let out = '';
	const walk = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			out += node.textContent ?? '';
			return;
		}
		if (node.nodeName === 'BR') {
			out += '\n';
			return;
		}
		if (isInlinePill(node)) {
			out += `@${node.dataset.label ?? node.textContent ?? ''}`;
			return;
		}
		for (const child of Array.from(node.childNodes)) {
			walk(child);
		}
	};
	walk(root);
	return out;
}

/** Plain text before the caret (pills → `@label`) for @ / token detection. */
export function plainTextBeforeCaret(root: HTMLElement): { value: string; caret: number } {
	const doc = root.ownerDocument;
	const sel = doc.getSelection();
	if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) {
		const value = serializeComposer(root);
		return { value, caret: value.length };
	}
	const caretRange = sel.getRangeAt(0).cloneRange();
	const pre = doc.createRange();
	pre.selectNodeContents(root);
	pre.setEnd(caretRange.startContainer, caretRange.startOffset);
	const before = serializeRange(pre);
	const value = serializeComposer(root);
	return { value, caret: before.length };
}

function serializeRange(range: Range): string {
	const frag = range.cloneContents();
	const wrap = range.startContainer.ownerDocument!.createElement('div');
	wrap.appendChild(frag);
	return serializeComposer(wrap);
}

export function setComposerText(root: HTMLElement, text: string): void {
	root.textContent = text;
	placeCaretAtEnd(root);
}

export function clearComposer(root: HTMLElement): void {
	root.replaceChildren();
}

export function placeCaretAtEnd(root: HTMLElement): void {
	const doc = root.ownerDocument;
	const sel = doc.getSelection();
	if (!sel) {
		return;
	}
	const range = doc.createRange();
	range.selectNodeContents(root);
	range.collapse(false);
	sel.removeAllRanges();
	sel.addRange(range);
}

/** Delete `count` characters from text nodes immediately before the caret. */
export function deleteTextBeforeCaret(root: HTMLElement, count: number): void {
	if (count <= 0) {
		return;
	}
	const doc = root.ownerDocument;
	const sel = doc.getSelection();
	if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) {
		return;
	}

	let remaining = count;
	let node: Node | null = sel.getRangeAt(0).startContainer;
	let offset = sel.getRangeAt(0).startOffset;

	while (remaining > 0 && node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const textNode = node as Text;
			const take = Math.min(offset, remaining);
			if (take > 0) {
				textNode.deleteData(offset - take, take);
				remaining -= take;
				offset -= take;
			}
			if (remaining <= 0) {
				const range = doc.createRange();
				range.setStart(textNode, offset);
				range.collapse(true);
				sel.removeAllRanges();
				sel.addRange(range);
				return;
			}
		}

		const prev = previousTextLeaf(root, node);
		if (!prev) {
			break;
		}
		node = prev.node;
		offset = prev.offset;
	}
}

function previousTextLeaf(root: HTMLElement, from: Node): { node: Text; offset: number } | undefined {
	let node: Node | null = from;
	while (node && node !== root) {
		if (node.previousSibling) {
			node = node.previousSibling;
			while (node.lastChild) {
				node = node.lastChild;
			}
			if (node.nodeType === Node.TEXT_NODE) {
				return { node: node as Text, offset: (node as Text).data.length };
			}
			continue;
		}
		node = node.parentNode;
	}
	return undefined;
}

export function createInlinePill(attachment: IKoshaChatAttachment, doc: Document): HTMLSpanElement {
	const pill = doc.createElement('span');
	pill.className = PILL_CLASS;
	pill.contentEditable = 'false';
	pill.dataset.attachmentId = attachment.id;
	pill.dataset.label = attachment.label;
	pill.dataset.kind = attachment.kind;
	pill.title = attachment.label;

	const icon = doc.createElement('span');
	icon.className = 'kosha-chat-inline-pill-icon';
	const iconId = attachment.kind === 'folder' ? Codicon.folder : attachment.kind === 'selection' ? Codicon.selection : Codicon.file;
	icon.classList.add(...ThemeIcon.asClassNameArray(iconId));
	pill.appendChild(icon);

	const text = doc.createElement('span');
	text.className = 'kosha-chat-inline-pill-label';
	text.textContent = attachment.label;
	pill.appendChild(text);
	return pill;
}

/** Insert a pill at the current caret (or end), with surrounding spaces. */
export function insertPillAtCaret(root: HTMLElement, attachment: IKoshaChatAttachment): void {
	const doc = root.ownerDocument;
	root.focus();
	const pill = createInlinePill(attachment, doc);
	const sel = doc.getSelection();
	let range: Range;
	if (sel && sel.rangeCount && root.contains(sel.anchorNode)) {
		range = sel.getRangeAt(0);
		range.deleteContents();
	} else {
		range = doc.createRange();
		range.selectNodeContents(root);
		range.collapse(false);
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	const spaceAfter = doc.createTextNode('\u00a0');
	range.insertNode(spaceAfter);
	range.insertNode(pill);

	const after = doc.createRange();
	after.setStartAfter(spaceAfter);
	after.collapse(true);
	sel?.removeAllRanges();
	sel?.addRange(after);
}

/** Replace the active `@token` plain text before caret with a pill. */
export function replaceAtTokenWithPill(root: HTMLElement, tokenLength: number, attachment: IKoshaChatAttachment): void {
	deleteTextBeforeCaret(root, tokenLength);
	insertPillAtCaret(root, attachment);
}

export function composerIsEmpty(root: HTMLElement): boolean {
	return serializeComposer(root).trim().length === 0 && !root.querySelector(`.${PILL_CLASS}`);
}

export function attachmentIdsInComposer(root: HTMLElement): string[] {
	return Array.from(root.querySelectorAll(`.${PILL_CLASS}`))
		.map(el => (el as HTMLElement).dataset.attachmentId)
		.filter((id): id is string => !!id);
}
