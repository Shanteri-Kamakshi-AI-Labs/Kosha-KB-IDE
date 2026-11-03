/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IKoshaProject } from '../../koshaChat/common/koshaApiTypes.js';

export const IKoshaKshetroService = createDecorator<IKoshaKshetroService>('koshaKshetroService');

export interface IKoshaKshetroService {
	readonly _serviceBrand: undefined;
	readonly selectedProjectId: string | undefined;
	readonly selectedProject: IKoshaProject | undefined;
	readonly projects: readonly IKoshaProject[];
	readonly onDidChangeSelectedProject: Event<string | undefined>;
	readonly onDidChangeProjects: Event<readonly IKoshaProject[]>;
	setSelectedProject(projectId: string | undefined): void;
	setProjects(projects: readonly IKoshaProject[]): void;
	upsertProject(project: IKoshaProject): void;
}

export class KoshaKshetroService extends Disposable implements IKoshaKshetroService {
	declare readonly _serviceBrand: undefined;

	private _selectedProjectId: string | undefined;
	private _projects: IKoshaProject[] = [];

	private readonly _onDidChangeSelectedProject = this._register(new Emitter<string | undefined>());
	readonly onDidChangeSelectedProject = this._onDidChangeSelectedProject.event;

	private readonly _onDidChangeProjects = this._register(new Emitter<readonly IKoshaProject[]>());
	readonly onDidChangeProjects = this._onDidChangeProjects.event;

	get selectedProjectId(): string | undefined {
		return this._selectedProjectId;
	}

	get selectedProject(): IKoshaProject | undefined {
		if (!this._selectedProjectId) {
			return undefined;
		}
		return this._projects.find(p => p.id === this._selectedProjectId);
	}

	get projects(): readonly IKoshaProject[] {
		return this._projects;
	}

	setSelectedProject(projectId: string | undefined): void {
		if (this._selectedProjectId === projectId) {
			return;
		}
		this._selectedProjectId = projectId;
		this._onDidChangeSelectedProject.fire(projectId);
	}

	setProjects(projects: readonly IKoshaProject[]): void {
		this._projects = [...projects];
		if (this._selectedProjectId && !this._projects.some(p => p.id === this._selectedProjectId)) {
			this._selectedProjectId = undefined;
			this._onDidChangeSelectedProject.fire(undefined);
		}
		this._onDidChangeProjects.fire(this._projects);
	}

	upsertProject(project: IKoshaProject): void {
		this._projects = [project, ...this._projects.filter(p => p.id !== project.id)];
		this._onDidChangeProjects.fire(this._projects);
	}
}
