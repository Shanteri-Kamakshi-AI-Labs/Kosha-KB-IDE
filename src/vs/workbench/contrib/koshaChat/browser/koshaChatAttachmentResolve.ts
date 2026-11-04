/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { basename, relativePath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IKoshaAttachmentRange, IKoshaChatAttachment } from '../common/koshaChatAttachmentService.js';

/** ponytail: skip huge blobs; raise if product needs larger uploads. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function koshaAttachmentPathLabel(uri: URI, workspace: IWorkspaceContextService): string {
	const folder = workspace.getWorkspaceFolder(uri);
	if (folder) {
		const rel = relativePath(folder.uri, uri);
		if (rel) {
			return rel;
		}
	}
	return uri.fsPath || uri.path;
}

export function buildFolderContextPrefix(
	attachments: readonly IKoshaChatAttachment[],
	workspace: IWorkspaceContextService,
): string {
	const folders = attachments.filter(a => a.kind === 'folder');
	if (!folders.length) {
		return '';
	}
	const lines = folders.map(f => `@${koshaAttachmentPathLabel(f.uri, workspace)}`);
	return `Attached folders:\n${lines.join('\n')}\n\n`;
}

export async function materializeKoshaAttachments(
	attachments: readonly IKoshaChatAttachment[],
	fileService: IFileService,
): Promise<File[]> {
	const files: File[] = [];
	for (const item of attachments) {
		if (item.kind === 'folder') {
			continue;
		}
		try {
			const raw = await fileService.readFile(item.uri);
			if (raw.value.byteLength > MAX_UPLOAD_BYTES) {
				continue;
			}
			if (item.kind === 'selection' && item.range) {
				const text = extractRange(raw.value.toString(), item.range);
				files.push(new File([text], `${basename(item.uri)}-${item.range.startLineNumber}-${item.range.endLineNumber}.txt`));
			} else {
				files.push(new File([Uint8Array.from(raw.value.buffer)], basename(item.uri)));
			}
		} catch {
			// Skip unreadable resources; chips still show until send clears.
		}
	}
	return files;
}

function extractRange(text: string, range: IKoshaAttachmentRange): string {
	const lines = text.split(/\r?\n/);
	const start = Math.max(1, range.startLineNumber);
	const end = Math.min(lines.length, range.endLineNumber);
	if (start > end) {
		return '';
	}
	const slice = lines.slice(start - 1, end);
	if (!slice.length) {
		return '';
	}
	if (slice.length === 1) {
		return slice[0].slice(Math.max(0, range.startColumn - 1), Math.max(0, range.endColumn - 1));
	}
	slice[0] = slice[0].slice(Math.max(0, range.startColumn - 1));
	slice[slice.length - 1] = slice[slice.length - 1].slice(0, Math.max(0, range.endColumn - 1));
	return slice.join('\n');
}
