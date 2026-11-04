/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { resolveCommandsContext } from '../../../browser/parts/editor/editorCommandsContext.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { EditorResourceAccessor, isEditorCommandsContext, SideBySideEditor } from '../../../common/editor.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ExplorerFolderContext } from '../../files/common/files.js';
import { isSearchTreeFileMatch, isSearchTreeMatch } from '../../search/browser/searchTreeModel/searchTreeCommon.js';
import { IKoshaChatAttachment } from '../common/koshaChatAttachmentService.js';
import { KoshaChatViewId } from '../common/koshaChat.js';
import { KoshaChatViewPane } from './koshaChatViewPane.js';

const KOSHA_CATEGORY = localize2('koshaCategory', 'Kosha');

const FILE_SCHEMES = ContextKeyExpr.or(
	ResourceContextKey.Scheme.isEqualTo(Schemas.file),
	ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote),
);

function getResources(accessor: ServicesAccessor, ...args: unknown[]): URI[] {
	const editorService = accessor.get(IEditorService);
	const contexts = isEditorCommandsContext(args[1])
		? getEditorResources(accessor, ...args)
		: Array.isArray(args[1]) ? args[1] : [args[0]];
	const files: URI[] = [];
	for (const context of contexts) {
		let uri: URI | undefined;
		if (URI.isUri(context)) {
			uri = context;
		} else if (isSearchTreeFileMatch(context)) {
			uri = context.resource;
		} else if (isSearchTreeMatch(context)) {
			uri = context.parent().resource;
		} else if (!context && editorService.activeTextEditorControl) {
			uri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		}
		if (uri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(uri.scheme)) {
			files.push(uri);
		}
	}
	return files;
}

function getEditorResources(accessor: ServicesAccessor, ...args: unknown[]): URI[] {
	const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
	return resolvedContext.groupedEditors
		.flatMap(groupedEditor => groupedEditor.editors)
		.map(editor => EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }))
		.filter((uri): uri is URI => !!uri);
}

async function revealKoshaChat(accessor: ServicesAccessor): Promise<KoshaChatViewPane | undefined> {
	const viewsService = accessor.get(IViewsService);
	const view = await viewsService.openView<KoshaChatViewPane>(KoshaChatViewId, true);
	if (!view) {
		return undefined;
	}
	return view;
}

async function attachInline(accessor: ServicesAccessor, items: Omit<IKoshaChatAttachment, 'id'>[]): Promise<void> {
	const view = await revealKoshaChat(accessor);
	if (!view) {
		return;
	}
	view.attachInline(items);
}

class AttachFileToKoshaChatAction extends Action2 {
	static readonly ID = 'kosha.chat.attachFile';

	constructor() {
		super({
			id: AttachFileToKoshaChatAction.ID,
			title: localize2('kosha.chat.attachFile', 'Add File to Kosha Chat'),
			category: KOSHA_CATEGORY,
			icon: Codicon.attach,
			f1: true,
			menu: [{
				id: MenuId.ExplorerContext,
				group: '5_koshaChat',
				order: 1,
				when: ContextKeyExpr.and(ExplorerFolderContext.negate(), FILE_SCHEMES),
			}, {
				id: MenuId.EditorTitleContext,
				group: '2_koshaChat',
				order: 1,
				when: FILE_SCHEMES,
			}, {
				id: MenuId.EditorContext,
				group: '1_koshaChat',
				order: 2,
				when: ContextKeyExpr.and(
					EditorContextKeys.hasNonEmptySelection.negate(),
					ContextKeyExpr.or(
						FILE_SCHEMES,
						ResourceContextKey.Scheme.isEqualTo(Schemas.untitled),
						ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeUserData),
					),
				),
			}],
		});
	}

	override async run(accessor: ServicesAccessor, ...args: unknown[]): Promise<void> {
		const files = getResources(accessor, ...args);
		if (!files.length) {
			return;
		}
		await attachInline(accessor, files.map(uri => ({
			kind: 'file' as const,
			uri,
			label: basename(uri),
		})));
	}
}

class AttachFolderToKoshaChatAction extends Action2 {
	static readonly ID = 'kosha.chat.attachFolder';

	constructor() {
		super({
			id: AttachFolderToKoshaChatAction.ID,
			title: localize2('kosha.chat.attachFolder', 'Add Folder to Kosha Chat'),
			category: KOSHA_CATEGORY,
			icon: Codicon.folder,
			f1: false,
			menu: {
				id: MenuId.ExplorerContext,
				group: '5_koshaChat',
				order: 1,
				when: ContextKeyExpr.and(ExplorerFolderContext, FILE_SCHEMES),
			},
		});
	}

	override async run(accessor: ServicesAccessor, ...args: unknown[]): Promise<void> {
		const folders = getResources(accessor, ...args);
		if (!folders.length) {
			return;
		}
		await attachInline(accessor, folders.map(uri => ({
			kind: 'folder' as const,
			uri,
			label: basename(uri) || uri.path,
		})));
	}
}

class AttachSelectionToKoshaChatAction extends Action2 {
	static readonly ID = 'kosha.chat.attachSelection';

	constructor() {
		super({
			id: AttachSelectionToKoshaChatAction.ID,
			title: localize2('kosha.chat.attachSelection', 'Add Selection to Kosha Chat'),
			category: KOSHA_CATEGORY,
			icon: Codicon.attach,
			f1: true,
			menu: [{
				id: MenuId.EditorContext,
				group: '1_koshaChat',
				order: 1,
				when: ContextKeyExpr.and(
					EditorContextKeys.hasNonEmptySelection,
					ContextKeyExpr.or(
						FILE_SCHEMES,
						ResourceContextKey.Scheme.isEqualTo(Schemas.untitled),
						ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeUserData),
					),
				),
			}, {
				id: MenuId.InlineChatEditorAffordance,
				group: '0_koshaChat',
				order: 2,
				when: EditorContextKeys.hasNonEmptySelection,
			}],
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const control = editorService.activeTextEditorControl;
		const editor = isCodeEditor(control) ? control : isDiffEditor(control) ? control.getModifiedEditor() : undefined;
		const uri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (!editor || !uri || ![Schemas.file, Schemas.vscodeRemote, Schemas.untitled, Schemas.vscodeUserData].includes(uri.scheme)) {
			return;
		}
		// Capture selection before focus moves to Kosha Chat.
		const selection = editor.getSelection();
		if (!selection || selection.isEmpty()) {
			return;
		}
		const range = {
			startLineNumber: selection.startLineNumber,
			startColumn: selection.startColumn,
			endLineNumber: selection.endLineNumber,
			endColumn: selection.endColumn,
		};
		await attachInline(accessor, [{
			kind: 'selection',
			uri,
			range,
			label: `${basename(uri)}:${range.startLineNumber}-${range.endLineNumber}`,
		}]);
	}
}

export function registerKoshaChatContextActions(): void {
	registerAction2(AttachFileToKoshaChatAction);
	registerAction2(AttachFolderToKoshaChatAction);
	registerAction2(AttachSelectionToKoshaChatAction);
}
