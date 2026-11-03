/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import {
	IKoshaCreateMessageBody,
	IKoshaMessage,
	IKoshaProvider,
	IKoshaProviderMode,
	IKoshaProvidersResponse,
	IKoshaSendOptions,
	IKoshaSession,
	IKoshaSkill,
} from '../common/koshaApiTypes.js';
import { IKoshaKshetroService } from '../../kshetro/common/kshetroService.js';
import { KoshaApiClient } from './koshaApiClient.js';
import { KoshaSocket } from './koshaSocket.js';

export interface IKoshaTranscriptEntry {
	readonly id: string;
	readonly role: 'user' | 'assistant' | 'system' | 'status';
	text: string;
	streaming?: boolean;
	/** Server message id when known (needed for regenerate). */
	apiId?: string;
}

const MAX_OPEN_TABS = 8;

export class KoshaChatSessionController extends Disposable {

	private readonly client: KoshaApiClient;
	private socket: KoshaSocket | undefined;

	private activeGenerationId: string | undefined;
	private streamingAssistantId: string | undefined;
	private sendCts: CancellationTokenSource | undefined;
	private pollTimer: ReturnType<typeof setTimeout> | undefined;
	/** Sessions that already received POST …/generate-name (once each). */
	private readonly autoNamedSessionIds = new Set<string>();

	/** Client-only: which chat is open. */
	private _activeSessionId: string | undefined;
	/** Open tab order (subset of sessions). */
	private _openTabIds: string[] = [];
	private _sessions: IKoshaSession[] = [];

	private readonly _entries: IKoshaTranscriptEntry[] = [];
	private readonly _onDidChangeEntries = this._register(new Emitter<readonly IKoshaTranscriptEntry[]>());
	readonly onDidChangeEntries: Event<readonly IKoshaTranscriptEntry[]> = this._onDidChangeEntries.event;

	private readonly _onDidChangeBusy = this._register(new Emitter<boolean>());
	readonly onDidChangeBusy: Event<boolean> = this._onDidChangeBusy.event;

	private readonly _onDidChangeSessions = this._register(new Emitter<void>());
	readonly onDidChangeSessions: Event<void> = this._onDidChangeSessions.event;

	private _busy = false;
	get busy(): boolean { return this._busy; }

	skills: readonly IKoshaSkill[] = [];
	providers: IKoshaProvidersResponse = { modes: [], providers: [] };
	selectedModeId: string | undefined;
	/** Concrete model_id, or undefined for Auto (mode decides). */
	selectedModelId: string | undefined;
	selectedSkillNames: string[] = [];

	constructor(
		@IRequestService requestService: IRequestService,
		@IAuthenticationService auth: IAuthenticationService,
		@IProductService product: IProductService,
		@ICommandService commands: ICommandService,
		@IKoshaKshetroService private readonly kshetro: IKoshaKshetroService,
	) {
		super();
		this.client = new KoshaApiClient(requestService, auth, product, commands);
		this._register(this.kshetro.onDidChangeSelectedProject(() => {
			void this.onProjectScopeChanged();
		}));
	}

	get selectedProjectId(): string | undefined {
		return this.kshetro.selectedProjectId;
	}

	get selectedProjectName(): string | undefined {
		return this.kshetro.selectedProject?.project_name;
	}

	get entries(): readonly IKoshaTranscriptEntry[] {
		return this._entries;
	}

	get modes(): readonly IKoshaProviderMode[] {
		return this.providers.modes ?? [];
	}

	get models(): readonly IKoshaProvider[] {
		return this.providers.providers ?? [];
	}

	get sessions(): readonly IKoshaSession[] {
		return this._sessions;
	}

	get activeSessionId(): string | undefined {
		return this._activeSessionId;
	}

	get openTabIds(): readonly string[] {
		return this._openTabIds;
	}

	get activeSession(): IKoshaSession | undefined {
		return this._sessions.find(s => s.id === this._activeSessionId);
	}

	get selectedMode(): IKoshaProviderMode | undefined {
		return this.modes.find(m => m.id === this.selectedModeId);
	}

	get selectedModel(): IKoshaProvider | undefined {
		if (!this.selectedModelId) {
			return undefined;
		}
		return this.models.find(m => m.model_id === this.selectedModelId || m.provider === this.selectedModelId);
	}

	get modelLabel(): string {
		return this.selectedModel?.model_id ?? this.selectedModel?.provider ?? 'Auto';
	}

	get modeLabel(): string {
		return this.selectedMode?.label ?? this.selectedModeId ?? 'Agent';
	}

	async bootstrap(): Promise<void> {
		try {
			const [skills, providers] = await Promise.all([
				this.client.getSkills(undefined, false),
				this.client.getProviders(undefined, false),
			]);
			this.skills = skills;
			this.providers = providers;
			const defaultMode = providers.modes.find(m => m.default) ?? providers.modes[0];
			this.selectedModeId = defaultMode?.id;
			this.selectedModelId = undefined;
		} catch {
			this.skills = [];
			this.providers = { modes: [], providers: [] };
		}
		await this.refreshSessions().catch(() => { /* signed out */ });
	}

	async refreshSessions(): Promise<void> {
		try {
			const projectId = this.kshetro.selectedProjectId;
			const query = projectId
				? { project_id: projectId }
				: { kind: 'anonymous' as const };
			this._sessions = [...await this.client.listSessions(query, undefined, false)];
			this._sessions.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
			this._openTabIds = this._openTabIds.filter(id => this._sessions.some(s => s.id === id));
			this._onDidChangeSessions.fire();
		} catch {
			this._sessions = [];
			this._onDidChangeSessions.fire();
		}
	}

	private async onProjectScopeChanged(): Promise<void> {
		if (this._activeSessionId) {
			this.socket?.leaveSession(this._activeSessionId);
		}
		this._activeSessionId = undefined;
		this._openTabIds = [];
		this.activeGenerationId = undefined;
		this.streamingAssistantId = undefined;
		this._entries.length = 0;
		this.setBusy(false);
		this.fireEntries();
		await this.refreshSessions().catch(() => { /* ignore */ });
	}

	newChat(): void {
		if (this._activeSessionId) {
			this.socket?.leaveSession(this._activeSessionId);
		}
		this._activeSessionId = undefined;
		this.activeGenerationId = undefined;
		this.streamingAssistantId = undefined;
		this._entries.length = 0;
		this.setBusy(false);
		this.fireEntries();
		this._onDidChangeSessions.fire();
	}

	async openSession(sessionId: string): Promise<void> {
		if (this._activeSessionId === sessionId) {
			this.pinTab(sessionId);
			return;
		}
		if (this._activeSessionId) {
			this.socket?.leaveSession(this._activeSessionId);
		}
		this._activeSessionId = sessionId;
		this.pinTab(sessionId);
		this.activeGenerationId = undefined;
		this.streamingAssistantId = undefined;
		this.setBusy(false);
		this._entries.length = 0;
		this.fireEntries();
		this._onDidChangeSessions.fire();

		try {
			await this.ensureSocket();
			await this.socket!.joinSession(sessionId);
			const messages = await this.client.listMessages(sessionId);
			this.replaceFromApiMessages(messages);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this._entries.push({ id: `status-${Date.now()}`, role: 'status', text: message });
			this.fireEntries();
		}
	}

	closeTab(sessionId: string): void {
		this._openTabIds = this._openTabIds.filter(id => id !== sessionId);
		if (this._activeSessionId === sessionId) {
			const next = this._openTabIds[0];
			if (next) {
				void this.openSession(next);
			} else {
				this.newChat();
			}
		} else {
			this._onDidChangeSessions.fire();
		}
	}

	async send(options: IKoshaSendOptions): Promise<void> {
		const text = options.text.trim();
		if (!text || this._busy) {
			return;
		}

		this.sendCts?.cancel();
		this.sendCts = new CancellationTokenSource();
		const token = this.sendCts.token;
		this.setBusy(true);

		const userId = `local-user-${Date.now()}`;
		this._entries.push({ id: userId, role: 'user', text });
		const assistantId = `local-assistant-${Date.now()}`;
		this.streamingAssistantId = assistantId;
		this._entries.push({ id: assistantId, role: 'assistant', text: '', streaming: true });
		this.fireEntries();

		try {
			await this.ensureSocket();

			if (!this._activeSessionId) {
				const session = await this.client.createSession(
					text.slice(0, 64) || 'New chat',
					this.kshetro.selectedProjectId,
					token,
				);
				this._activeSessionId = session.id;
				this._sessions = [session, ...this._sessions.filter(s => s.id !== session.id)];
				this.pinTab(session.id);
				await this.socket!.joinSession(session.id);
				this._onDidChangeSessions.fire();
			}

			const sessionId = this._activeSessionId;
			const hasFiles = !!(options.files && options.files.length);
			const body = this.buildMessageBody(text, options, /* generate */ !hasFiles);

			const result = await this.client.createMessage(sessionId, body, token);
			const userMessageId = result.user_message_id ?? result.user_message?.id;
			if (userMessageId) {
				const userEntry = this._entries.find(e => e.id === userId);
				if (userEntry) {
					userEntry.apiId = userMessageId;
				}
			}

			if (hasFiles && userMessageId && options.files) {
				for (const file of options.files) {
					await this.client.uploadDocument(file, userMessageId, token);
				}
				const genBody = this.buildMessageBody(text, options, true);
				delete (genBody as { message?: string }).message;
				delete (genBody as { generate?: boolean }).generate;
				const genResult = await this.client.generate(sessionId, userMessageId, genBody, token);
				await this.consumeCreateResult(genResult, assistantId);
			} else {
				await this.consumeCreateResult(result, assistantId);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.patchAssistant(assistantId, message, false);
			this.setBusy(false);
		}
	}

	/**
	 * Roll conversation back to a user turn for editing: removes that message and everything after.
	 * Returns the message text to put in the composer.
	 */
	beginEditUserMessage(entryId: string): string | undefined {
		if (this._busy) {
			return undefined;
		}
		const idx = this._entries.findIndex(e => e.id === entryId && e.role === 'user');
		if (idx < 0) {
			return undefined;
		}
		const text = this._entries[idx].text;
		this._entries.splice(idx);
		this.fireEntries();
		return text;
	}

	/** Regenerate from the user turn before an assistant reply (or re-send if no server id). */
	async retryAssistant(assistantEntryId: string): Promise<void> {
		if (this._busy) {
			return;
		}
		const aIdx = this._entries.findIndex(e => e.id === assistantEntryId && e.role === 'assistant');
		if (aIdx < 0) {
			return;
		}
		let uIdx = aIdx - 1;
		while (uIdx >= 0 && this._entries[uIdx].role !== 'user') {
			uIdx--;
		}
		if (uIdx < 0) {
			return;
		}
		const user = this._entries[uIdx];
		const userApiId = user.apiId ?? (!user.id.startsWith('local-') ? user.id : undefined);

		this._entries.splice(uIdx + 1);
		this.fireEntries();

		if (userApiId && this._activeSessionId) {
			await this.regenerateForUser(userApiId, user.text);
			return;
		}
		// No server id yet — drop local user bubble and send fresh
		this._entries.splice(uIdx);
		this.fireEntries();
		await this.send({ text: user.text });
	}

	private async regenerateForUser(userMessageId: string, fallbackText: string): Promise<void> {
		this.sendCts?.cancel();
		this.sendCts = new CancellationTokenSource();
		const token = this.sendCts.token;
		this.setBusy(true);

		const assistantId = `local-assistant-${Date.now()}`;
		this.streamingAssistantId = assistantId;
		this._entries.push({ id: assistantId, role: 'assistant', text: '', streaming: true });
		this.fireEntries();

		try {
			await this.ensureSocket();
			const sessionId = this._activeSessionId!;
			const body = this.buildMessageBody(fallbackText, { text: fallbackText }, true);
			delete (body as { message?: string }).message;
			delete (body as { generate?: boolean }).generate;
			const result = await this.client.generate(sessionId, userMessageId, body, token);
			await this.consumeCreateResult(result, assistantId);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.patchAssistant(assistantId, message, false);
			this.setBusy(false);
		}
	}

	async cancel(): Promise<void> {
		this.sendCts?.cancel();
		this.clearPoll();
		if (!this._activeSessionId) {
			this.setBusy(false);
			return;
		}
		try {
			await this.client.cancel(this._activeSessionId);
			const messages = await this.client.listMessages(this._activeSessionId);
			this.replaceFromApiMessages(messages);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this._entries.push({ id: `status-${Date.now()}`, role: 'status', text: message });
			this.fireEntries();
		} finally {
			this.activeGenerationId = undefined;
			this.streamingAssistantId = undefined;
			this.setBusy(false);
		}
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.client.deleteSession(sessionId);
		this._sessions = this._sessions.filter(s => s.id !== sessionId);
		this.closeTab(sessionId);
		this._onDidChangeSessions.fire();
	}

	override dispose(): void {
		this.sendCts?.cancel();
		this.clearPoll();
		this.socket?.dispose();
		super.dispose();
	}

	private pinTab(sessionId: string): void {
		this._openTabIds = [sessionId, ...this._openTabIds.filter(id => id !== sessionId)].slice(0, MAX_OPEN_TABS);
		this._onDidChangeSessions.fire();
	}

	private upsertSession(session: IKoshaSession): void {
		this._sessions = [session, ...this._sessions.filter(s => s.id !== session.id)];
		this._onDidChangeSessions.fire();
	}

	private buildMessageBody(text: string, options: IKoshaSendOptions, generate: boolean): IKoshaCreateMessageBody {
		const body: IKoshaCreateMessageBody = {
			message: text,
			message_type: 'user',
			generate,
		};
		const model = options.provider
			?? this.selectedModelId
			?? this.selectedModeId;
		if (model) {
			body.provider = model;
		}
		if (typeof options.temperature === 'number') {
			body.temperature = options.temperature;
		}
		if (options.thinkingEffort) {
			body.thinking_effort = options.thinkingEffort;
		}
		if (options.answerLength) {
			body.answer_length = options.answerLength;
		}
		if (options.hitlOnTools === true) {
			body.hitl_on_tools = true;
		}
		const skills = options.skillNames ?? this.selectedSkillNames;
		if (skills.length) {
			body.skill_names = [...skills];
		}
		return body;
	}

	private async consumeCreateResult(result: {
		assistant_message?: IKoshaMessage;
		generation_id?: string;
		generation?: { id: string; status?: string };
		status?: string;
	}, assistantId: string): Promise<void> {
		if (result.assistant_message) {
			this.patchAssistant(assistantId, joinMessage(result.assistant_message.message), false);
			this.setBusy(false);
			if (this._activeSessionId) {
				this.maybeAutoGenerateName(this._activeSessionId);
			}
			return;
		}

		const generationId = result.generation_id ?? result.generation?.id;
		if (!generationId || !this._activeSessionId) {
			const status = result.status ?? 'pending';
			if (status === 'completed' || status === 'failed') {
				this.patchAssistant(assistantId, status === 'failed' ? 'Generation failed' : '', false);
				this.setBusy(false);
			}
			return;
		}

		this.activeGenerationId = generationId;
		this.startPoll(generationId, assistantId);
	}

	private async ensureSocket(): Promise<void> {
		if (this.socket) {
			return;
		}
		this.socket = this._register(new KoshaSocket(this.client.socketOrigin, () => this.client.getAccessToken(true)));
		this._register(this.socket.onMessageDelta(e => {
			if (!this._activeSessionId || e.session_id !== this._activeSessionId || !this.streamingAssistantId) {
				return;
			}
			const entry = this._entries.find(x => x.id === this.streamingAssistantId);
			if (entry) {
				entry.text += e.delta ?? '';
				entry.streaming = true;
				this.fireEntries();
			}
		}));
		this._register(this.socket.onGenerationUpdated(e => {
			if (!this._activeSessionId || e.session_id !== this._activeSessionId) {
				return;
			}
			if (this.activeGenerationId && e.generation_id !== this.activeGenerationId) {
				return;
			}
			if (e.assistant_message) {
				this.finishAssistant(joinMessage(e.assistant_message.message));
				return;
			}
			const status = e.status;
			if (status === 'completed' || status === 'failed' || status === 'interrupted') {
				void this.reloadAfterGeneration(e.error);
			}
		}));
		this._register(this.socket.onMessageCreated(msg => {
			if (!this._activeSessionId || msg.session_id !== this._activeSessionId) {
				return;
			}
			if (msg.message_type === 'assistant' && this.streamingAssistantId) {
				this.finishAssistant(joinMessage(msg.message));
			}
		}));
		await this.socket.connect();
	}

	private startPoll(generationId: string, assistantId: string): void {
		this.clearPoll();
		let attempts = 0;
		const tick = async () => {
			if (!this._activeSessionId || this.activeGenerationId !== generationId) {
				return;
			}
			attempts++;
			try {
				const gen = await this.client.getGeneration(this._activeSessionId, generationId);
				if (gen.assistant_message) {
					this.finishAssistant(joinMessage(gen.assistant_message.message));
					return;
				}
				const status = gen.status;
				if (status === 'failed') {
					this.finishAssistant(gen.error || gen.error_message || 'Generation failed');
					return;
				}
				if (status === 'completed' || status === 'interrupted') {
					await this.reloadAfterGeneration();
					return;
				}
			} catch {
				// keep polling
			}
			if (attempts < 120 && this.activeGenerationId === generationId) {
				this.pollTimer = setTimeout(() => void tick(), 1_500);
			} else if (this.streamingAssistantId === assistantId) {
				this.finishAssistant(this._entries.find(e => e.id === assistantId)?.text ?? '');
			}
		};
		this.pollTimer = setTimeout(() => void tick(), 1_500);
	}

	private async reloadAfterGeneration(error?: string): Promise<void> {
		if (!this._activeSessionId) {
			this.finishAssistant(error || '');
			return;
		}
		try {
			const messages = await this.client.listMessages(this._activeSessionId);
			const lastAssistant = [...messages].reverse().find(m => m.message_type === 'assistant');
			this.finishAssistant(lastAssistant ? joinMessage(lastAssistant.message) : (error || ''));
		} catch {
			this.finishAssistant(error || '');
		}
	}

	private finishAssistant(text: string): void {
		this.clearPoll();
		if (this.streamingAssistantId) {
			this.patchAssistant(this.streamingAssistantId, text, false);
		}
		this.activeGenerationId = undefined;
		this.streamingAssistantId = undefined;
		this.setBusy(false);
		if (this._activeSessionId) {
			this.maybeAutoGenerateName(this._activeSessionId);
		}
	}

	/** After first completed user+assistant turn — once per session. */
	private maybeAutoGenerateName(sessionId: string): void {
		if (this.autoNamedSessionIds.has(sessionId)) {
			return;
		}
		const hasUser = this._entries.some(e => e.role === 'user' && e.text.trim());
		const hasAssistant = this._entries.some(e => e.role === 'assistant' && e.text.trim() && !e.streaming);
		if (!hasUser || !hasAssistant) {
			return;
		}
		this.autoNamedSessionIds.add(sessionId);
		void this.client.generateName(sessionId).then(updated => {
			this.upsertSession(updated);
			void this.refreshSessions().catch(() => { /* ignore */ });
		}).catch(() => {
			// Allow retry next completed turn if naming failed.
			this.autoNamedSessionIds.delete(sessionId);
		});
	}

	private replaceFromApiMessages(messages: readonly IKoshaMessage[]): void {
		this._entries.length = 0;
		for (const m of messages) {
			this._entries.push({
				id: m.id,
				role: m.message_type,
				text: joinMessage(m.message),
				apiId: m.id,
			});
		}
		this.fireEntries();
	}

	private patchAssistant(id: string, text: string, streaming: boolean): void {
		const entry = this._entries.find(e => e.id === id);
		if (entry) {
			entry.text = text;
			entry.streaming = streaming;
		}
		this.fireEntries();
	}

	private setBusy(busy: boolean): void {
		if (this._busy === busy) {
			return;
		}
		this._busy = busy;
		this._onDidChangeBusy.fire(busy);
	}

	private fireEntries(): void {
		this._onDidChangeEntries.fire([...this._entries]);
	}

	private clearPoll(): void {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = undefined;
		}
	}
}

function joinMessage(chunks: readonly string[] | string | undefined): string {
	if (!chunks) {
		return '';
	}
	if (typeof chunks === 'string') {
		return chunks;
	}
	return chunks.join('');
}
