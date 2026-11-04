/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import {
	IKoshaCancelResult,
	IKoshaCreateHarnessBody,
	IKoshaCreateMessageBody,
	IKoshaCreateMessageResult,
	IKoshaCreateProjectBody,
	IKoshaFromPlatformHarnessBody,
	IKoshaGenerateHarnessBody,
	IKoshaGeneration,
	IKoshaHarness,
	IKoshaMessage,
	IKoshaListSessionsQuery,
	IKoshaPlatformHarness,
	IKoshaProject,
	IKoshaProvidersResponse,
	IKoshaSession,
	IKoshaSkill,
	IKoshaUpdateHarnessBody,
	IKoshaUpdateProjectBody,
} from '../common/koshaApiTypes.js';
import { getKoshaTimezone, resolveKoshaAccessToken } from './koshaAuthToken.js';

export class KoshaApiError extends Error {
	constructor(
		readonly statusCode: number,
		message: string,
	) {
		super(message);
		this.name = 'KoshaApiError';
	}
}

export class KoshaApiClient {

	constructor(
		private readonly requestService: IRequestService,
		private readonly auth: IAuthenticationService,
		private readonly product: IProductService,
		private readonly commands: ICommandService,
	) { }

	get restBaseUrl(): string {
		const configured = this.product.koshaApi?.restBaseUrl?.replace(/\/$/, '');
		return configured || 'https://kosha.skaill.app/api';
	}

	get socketOrigin(): string {
		const configured = this.product.koshaApi?.socketOrigin?.replace(/\/$/, '');
		return configured || 'https://kosha.skaill.app';
	}

	async getAccessToken(promptSignIn = true): Promise<string> {
		return resolveKoshaAccessToken(this.auth, this.product, this.commands, { promptSignIn });
	}

	async getSkills(token?: CancellationToken, promptSignIn = true): Promise<readonly IKoshaSkill[]> {
		return (await this.getJson<IKoshaSkill[]>('/skills', undefined, token, promptSignIn)) ?? [];
	}

	async getProviders(token?: CancellationToken, promptSignIn = true): Promise<IKoshaProvidersResponse> {
		return (await this.getJson<IKoshaProvidersResponse>('/providers', undefined, token, promptSignIn)) ?? { modes: [], providers: [] };
	}

	async listProjects(harnessId?: string, token?: CancellationToken, promptSignIn = true): Promise<readonly IKoshaProject[]> {
		const q = harnessId ? { harness_id: harnessId } : undefined;
		return (await this.getJson<IKoshaProject[]>('/projects', q, token, promptSignIn)) ?? [];
	}

	async getProject(projectId: string, token?: CancellationToken): Promise<IKoshaProject> {
		return this.getJson<IKoshaProject>(`/projects/${encodeURIComponent(projectId)}`, undefined, token);
	}

	async createProject(body: IKoshaCreateProjectBody, token?: CancellationToken): Promise<IKoshaProject> {
		return this.postJson<IKoshaProject>('/projects', body, { idempotent: true }, token);
	}

	async updateProject(projectId: string, body: IKoshaUpdateProjectBody, token?: CancellationToken): Promise<IKoshaProject> {
		return this.putJson<IKoshaProject>(`/projects/${encodeURIComponent(projectId)}`, body, token);
	}

	async listHarnesses(token?: CancellationToken, promptSignIn = true): Promise<readonly IKoshaHarness[]> {
		return (await this.getJson<IKoshaHarness[]>('/harnesses', undefined, token, promptSignIn)) ?? [];
	}

	async getHarness(harnessId: string, token?: CancellationToken): Promise<IKoshaHarness> {
		return this.getJson<IKoshaHarness>(`/harnesses/${encodeURIComponent(harnessId)}`, undefined, token);
	}

	async createHarness(body: IKoshaCreateHarnessBody, token?: CancellationToken): Promise<IKoshaHarness> {
		return this.postJson<IKoshaHarness>('/harnesses', body, { idempotent: true }, token);
	}

	async updateHarness(harnessId: string, body: IKoshaUpdateHarnessBody, token?: CancellationToken): Promise<IKoshaHarness> {
		return this.putJson<IKoshaHarness>(`/harnesses/${encodeURIComponent(harnessId)}`, body, token);
	}

	async deleteHarness(harnessId: string, token?: CancellationToken): Promise<void> {
		await this.deleteJson(`/harnesses/${encodeURIComponent(harnessId)}`, token);
	}

	async generateHarness(body: IKoshaGenerateHarnessBody, token?: CancellationToken): Promise<IKoshaHarness> {
		return this.postJson<IKoshaHarness>('/harnesses/generate', body, { idempotent: true }, token);
	}

	async createHarnessFromPlatform(body: IKoshaFromPlatformHarnessBody, token?: CancellationToken): Promise<IKoshaHarness> {
		return this.postJson<IKoshaHarness>('/harnesses/from-platform', body, { idempotent: true }, token);
	}

	async listPlatformHarnesses(token?: CancellationToken, promptSignIn = true): Promise<readonly IKoshaPlatformHarness[]> {
		return (await this.getJson<IKoshaPlatformHarness[]>('/councils/platform-harnesses', undefined, token, promptSignIn)) ?? [];
	}

	async listSessions(query?: IKoshaListSessionsQuery, token?: CancellationToken, promptSignIn = true): Promise<readonly IKoshaSession[]> {
		const q: Record<string, string> = {};
		if (query?.kind) {
			q.kind = query.kind;
		}
		if (query?.project_id) {
			q.project_id = query.project_id;
		}
		return (await this.getJson<IKoshaSession[]>('/sessions', Object.keys(q).length ? q : undefined, token, promptSignIn)) ?? [];
	}

	async getSession(sessionId: string, token?: CancellationToken): Promise<IKoshaSession> {
		return this.getJson<IKoshaSession>(`/sessions/${encodeURIComponent(sessionId)}`, undefined, token);
	}

	async createSession(sessionName: string, projectId?: string, token?: CancellationToken): Promise<IKoshaSession> {
		const body: { session_name: string; project_id?: string } = { session_name: sessionName };
		if (projectId) {
			body.project_id = projectId;
		}
		return this.postJson<IKoshaSession>('/sessions', body, { idempotent: true }, token);
	}

	async renameSession(sessionId: string, sessionName: string, token?: CancellationToken): Promise<IKoshaSession> {
		return this.putJson<IKoshaSession>(`/sessions/${encodeURIComponent(sessionId)}`, { session_name: sessionName }, token);
	}

	async deleteSession(sessionId: string, token?: CancellationToken): Promise<void> {
		await this.deleteJson(`/sessions/${encodeURIComponent(sessionId)}`, token);
	}

	async createMessage(sessionId: string, body: IKoshaCreateMessageBody, token?: CancellationToken): Promise<IKoshaCreateMessageResult> {
		return this.postJson<IKoshaCreateMessageResult>(`/sessions/${encodeURIComponent(sessionId)}/messages`, body, { idempotent: true }, token);
	}

	async generate(sessionId: string, messageId: string, body: Omit<IKoshaCreateMessageBody, 'message' | 'generate'>, token?: CancellationToken): Promise<IKoshaCreateMessageResult> {
		return this.postJson<IKoshaCreateMessageResult>(
			`/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/generate`,
			body,
			{ idempotent: true },
			token,
		);
	}

	async cancel(sessionId: string, token?: CancellationToken): Promise<IKoshaCancelResult> {
		return this.postJson<IKoshaCancelResult>(`/sessions/${encodeURIComponent(sessionId)}/cancel`, {}, { idempotent: true }, token);
	}

	async generateName(sessionId: string, token?: CancellationToken): Promise<IKoshaSession> {
		return this.postJson<IKoshaSession>(`/sessions/${encodeURIComponent(sessionId)}/generate-name`, {}, { idempotent: true }, token);
	}

	async listMessages(sessionId: string, token?: CancellationToken): Promise<readonly IKoshaMessage[]> {
		return (await this.getJson<IKoshaMessage[]>(`/sessions/${encodeURIComponent(sessionId)}/messages`, undefined, token)) ?? [];
	}

	async getGeneration(sessionId: string, generationId: string, token?: CancellationToken): Promise<IKoshaGeneration & {
		readonly user_message?: IKoshaMessage;
		readonly assistant_message?: IKoshaMessage;
	}> {
		return this.getJson(
			`/sessions/${encodeURIComponent(sessionId)}/generations/${encodeURIComponent(generationId)}`,
			undefined,
			token,
		);
	}

	async uploadDocument(file: File, chatMessageId: string, token?: CancellationToken): Promise<unknown> {
		const accessToken = await this.getAccessToken(true);
		const boundary = `----KoshaForm${generateUuid().replace(/-/g, '')}`;
		const fileBytes = new Uint8Array(await file.arrayBuffer());
		const multipart = buildMultipartBody(boundary, [
			{ name: 'chat_message_id', value: chatMessageId },
			{ name: 'file', filename: file.name, contentType: file.type || 'application/octet-stream', bytes: fileBytes },
		]);

		const context = await this.requestService.request({
			type: 'POST',
			url: this.buildUrl('/documents/upload'),
			data: uint8ToBinaryString(multipart),
			headers: {
				...this.authHeaders(accessToken, true),
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
			},
			timeout: 120_000,
			callSite: 'koshaApiClient.upload',
		}, token ?? CancellationToken.None);

		if (context.res.statusCode === 401) {
			await this.commands.executeCommand('kosha.auth.signIn');
			throw new KoshaApiError(401, 'Unauthorized — please sign in again');
		}
		if ((context.res.statusCode ?? 500) >= 400) {
			const text = await asText(context);
			throw new KoshaApiError(context.res.statusCode ?? 500, text || `Upload failed (${context.res.statusCode})`);
		}
		return (await asJson(context)) ?? {};
	}

	private async getJson<T>(path: string, query?: Record<string, string>, token?: CancellationToken, promptSignIn = true): Promise<T> {
		const url = this.buildUrl(path, query);
		const accessToken = await this.getAccessToken(promptSignIn);
		const context = await this.requestService.request({
			type: 'GET',
			url,
			headers: this.authHeaders(accessToken, false),
			timeout: 60_000,
			callSite: 'koshaApiClient.get',
		}, token ?? CancellationToken.None);

		if (context.res.statusCode === 401) {
			await this.commands.executeCommand('kosha.auth.signIn');
			throw new KoshaApiError(401, 'Unauthorized — please sign in again');
		}
		if ((context.res.statusCode ?? 500) >= 400) {
			const text = await asText(context);
			throw new KoshaApiError(context.res.statusCode ?? 500, text || `Request failed (${context.res.statusCode})`);
		}
		return (await asJson<T>(context)) as T;
	}

	private async postJson<T>(
		path: string,
		body: unknown,
		opts: { idempotent?: boolean },
		token?: CancellationToken,
	): Promise<T> {
		return this.writeJson<T>('POST', path, body, opts, token);
	}

	private async putJson<T>(
		path: string,
		body: unknown,
		token?: CancellationToken,
	): Promise<T> {
		return this.writeJson<T>('PUT', path, body, { idempotent: true }, token);
	}

	private async deleteJson(path: string, token?: CancellationToken): Promise<void> {
		const accessToken = await this.getAccessToken(true);
		const context = await this.requestService.request({
			type: 'DELETE',
			url: this.buildUrl(path),
			headers: this.authHeaders(accessToken, true),
			timeout: 60_000,
			callSite: 'koshaApiClient.delete',
		}, token ?? CancellationToken.None);
		if (context.res.statusCode === 401) {
			await this.commands.executeCommand('kosha.auth.signIn');
			throw new KoshaApiError(401, 'Unauthorized — please sign in again');
		}
		if ((context.res.statusCode ?? 500) >= 400) {
			const text = await asText(context);
			throw new KoshaApiError(context.res.statusCode ?? 500, text || `Request failed (${context.res.statusCode})`);
		}
	}

	private async writeJson<T>(
		method: 'POST' | 'PUT',
		path: string,
		body: unknown,
		opts: { idempotent?: boolean },
		token?: CancellationToken,
	): Promise<T> {
		const accessToken = await this.getAccessToken(true);
		const context = await this.requestService.request({
			type: method,
			url: this.buildUrl(path),
			data: JSON.stringify(body ?? {}),
			headers: {
				...this.authHeaders(accessToken, !!opts.idempotent),
				'Content-Type': 'application/json',
			},
			timeout: 120_000,
			callSite: `koshaApiClient.${method.toLowerCase()}`,
		}, token ?? CancellationToken.None);

		if (context.res.statusCode === 401) {
			await this.commands.executeCommand('kosha.auth.signIn');
			throw new KoshaApiError(401, 'Unauthorized — please sign in again');
		}
		if ((context.res.statusCode ?? 500) >= 400) {
			const text = await asText(context);
			throw new KoshaApiError(context.res.statusCode ?? 500, text || `Request failed (${context.res.statusCode})`);
		}
		return (await asJson<T>(context)) as T;
	}

	private authHeaders(accessToken: string, idempotent: boolean): Record<string, string> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			'X-Timezone': getKoshaTimezone(),
		};
		if (idempotent) {
			headers['Idempotency-Key'] = generateUuid();
		}
		return headers;
	}

	private buildUrl(path: string, query?: Record<string, string>): string {
		const base = this.restBaseUrl;
		const normalized = path.startsWith('/') ? path : `/${path}`;
		const url = new URL(`${base}${normalized}`);
		if (query) {
			for (const [k, v] of Object.entries(query)) {
				url.searchParams.set(k, v);
			}
		}
		return url.toString();
	}
}

function uint8ToBinaryString(bytes: Uint8Array): string {
	const chunk = 0x8000;
	let out = '';
	for (let i = 0; i < bytes.length; i += chunk) {
		out += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return out;
}

function buildMultipartBody(
	boundary: string,
	parts: ReadonlyArray<
		| { name: string; value: string }
		| { name: string; filename: string; contentType: string; bytes: Uint8Array }
	>,
): Uint8Array {
	const chunks: Uint8Array[] = [];
	const enc = new TextEncoder();
	for (const part of parts) {
		if ('filename' in part) {
			chunks.push(enc.encode(
				`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.contentType}\r\n\r\n`
			));
			chunks.push(part.bytes);
			chunks.push(enc.encode('\r\n'));
		} else {
			chunks.push(enc.encode(
				`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`
			));
		}
	}
	chunks.push(enc.encode(`--${boundary}--\r\n`));
	const total = chunks.reduce((n, c) => n + c.byteLength, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.byteLength;
	}
	return out;
}
