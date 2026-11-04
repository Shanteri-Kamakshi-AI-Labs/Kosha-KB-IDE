/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelContentProvider, ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IKoshaAgentsService } from '../common/agentsService.js';
import { KoshaAgentScheme, parseKoshaAgentUri } from '../common/agentsPreview.js';

class KoshaAgentContentProvider implements ITextModelContentProvider {
	constructor(
		private readonly modelService: IModelService,
		private readonly languageService: ILanguageService,
		private readonly agents: IKoshaAgentsService,
	) { }

	provideTextContent(resource: URI) {
		const existing = this.modelService.getModel(resource);
		if (existing) {
			return Promise.resolve(existing);
		}
		const parsed = parseKoshaAgentUri(resource);
		if (!parsed) {
			return Promise.resolve(null);
		}
		const harness = this.agents.harnesses.find(h => h.id === parsed.harnessId);
		const value = harness?.[parsed.field] ?? '';
		return Promise.resolve(this.modelService.createModel(
			value,
			this.languageService.createById('markdown'),
			resource,
		));
	}
}

class KoshaAgentPreviewContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.koshaAgentPreview';

	constructor(
		@ITextModelService textModelService: ITextModelService,
		@IModelService modelService: IModelService,
		@ILanguageService languageService: ILanguageService,
		@IKoshaAgentsService agents: IKoshaAgentsService,
		@ILabelService labelService: ILabelService,
	) {
		super();
		this._register(textModelService.registerTextModelContentProvider(
			KoshaAgentScheme,
			new KoshaAgentContentProvider(modelService, languageService, agents),
		));
		this._register(labelService.registerFormatter({
			scheme: KoshaAgentScheme,
			formatting: {
				label: '${authority}${path}',
				separator: '/',
				tildify: false,
				normalizeDriveLetter: false,
				workspaceSuffix: localize('kosha.agents.previewSuffix', 'Agent'),
			},
		}));
	}
}

registerWorkbenchContribution2(KoshaAgentPreviewContribution.ID, KoshaAgentPreviewContribution, WorkbenchPhase.BlockRestore);
