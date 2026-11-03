/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IKoshaGenerationUpdatedEvent,
	IKoshaMessage,
	IKoshaMessageDeltaEvent,
} from '../common/koshaApiTypes.js';
import { getKoshaTimezone } from './koshaAuthToken.js';

/**
 * Minimal Engine.IO v4 + Socket.IO v4 client (websocket transport only).
 * Avoids adding socket.io-client to the VS Code dependency tree.
 *
 * ponytail: websocket-only; no polling fallback / binary / ack. Upgrade path: socket.io-client.
 */
export class KoshaSocket extends Disposable {

	private readonly _onMessageDelta = this._register(new Emitter<IKoshaMessageDeltaEvent>());
	readonly onMessageDelta: Event<IKoshaMessageDeltaEvent> = this._onMessageDelta.event;

	private readonly _onGenerationUpdated = this._register(new Emitter<IKoshaGenerationUpdatedEvent>());
	readonly onGenerationUpdated: Event<IKoshaGenerationUpdatedEvent> = this._onGenerationUpdated.event;

	private readonly _onMessageCreated = this._register(new Emitter<IKoshaMessage>());
	readonly onMessageCreated: Event<IKoshaMessage> = this._onMessageCreated.event;

	private readonly _onConnected = this._register(new Emitter<void>());
	readonly onConnected: Event<void> = this._onConnected.event;

	private socket: WebSocket | undefined;
	private joinedSessionId: string | undefined;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	private disposed = false;
	private pingIntervalMs = 25_000;
	private pingTimer: ReturnType<typeof setInterval> | undefined;

	constructor(
		private readonly origin: string,
		private readonly getToken: () => Promise<string>,
	) {
		super();
	}

	async connect(): Promise<void> {
		if (this.disposed) {
			return;
		}
		await this.openSocket();
	}

	async joinSession(sessionId: string): Promise<void> {
		this.joinedSessionId = sessionId;
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			await this.connect();
		}
		this.emit('join_session', { session_id: sessionId });
	}

	leaveSession(sessionId?: string): void {
		const id = sessionId ?? this.joinedSessionId;
		if (id) {
			this.emit('leave_session', { session_id: id });
		}
		if (!sessionId || sessionId === this.joinedSessionId) {
			this.joinedSessionId = undefined;
		}
	}

	override dispose(): void {
		this.disposed = true;
		this.clearReconnect();
		this.clearPing();
		try {
			this.socket?.close();
		} catch {
			// ignore
		}
		this.socket = undefined;
		super.dispose();
	}

	private async openSocket(): Promise<void> {
		this.clearReconnect();
		try {
			this.socket?.close();
		} catch {
			// ignore
		}

		const token = await this.getToken();
		const timezone = getKoshaTimezone();
		const base = this.origin.replace(/\/$/, '');
		const url = `${base.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

		await new Promise<void>((resolve, reject) => {
			const ws = new WebSocket(url);
			this.socket = ws;
			let opened = false;

			ws.onopen = () => {
				// wait for Engine.IO open packet (0{...})
			};

			ws.onmessage = (ev) => {
				const raw = String(ev.data);
				if (raw.startsWith('0')) {
					try {
						const handshake = JSON.parse(raw.slice(1)) as { pingInterval?: number };
						if (typeof handshake.pingInterval === 'number' && handshake.pingInterval > 0) {
							this.pingIntervalMs = handshake.pingInterval;
						}
					} catch {
						// ignore bad handshake JSON
					}
					// Socket.IO CONNECT with auth
					ws.send(`40${JSON.stringify({ token, timezone })}`);
					return;
				}

				if (raw === '2') {
					// Engine.IO ping
					ws.send('3');
					return;
				}

				if (raw.startsWith('40')) {
					// Socket.IO connected
					opened = true;
					this.startPing();
					this._onConnected.fire();
					if (this.joinedSessionId) {
						this.emit('join_session', { session_id: this.joinedSessionId });
					}
					resolve();
					return;
				}

				if (raw.startsWith('42')) {
					this.handleEventPacket(raw.slice(2));
					return;
				}

				if (raw.startsWith('41') || raw.startsWith('44')) {
					// disconnect / connect error
					if (!opened) {
						reject(new Error(`Socket.IO connect failed: ${raw}`));
					}
				}
			};

			ws.onerror = () => {
				if (!opened) {
					reject(new Error('Socket.IO websocket error'));
				}
			};

			ws.onclose = () => {
				this.clearPing();
				if (!opened) {
					reject(new Error('Socket.IO closed before connect'));
				} else if (!this.disposed) {
					this.scheduleReconnect();
				}
			};
		});
	}

	private handleEventPacket(payload: string): void {
		try {
			const parsed = JSON.parse(payload) as [string, unknown];
			if (!Array.isArray(parsed) || typeof parsed[0] !== 'string') {
				return;
			}
			const [event, data] = parsed;
			switch (event) {
				case 'message_delta':
					this._onMessageDelta.fire(data as IKoshaMessageDeltaEvent);
					break;
				case 'generation_updated':
					this._onGenerationUpdated.fire(data as IKoshaGenerationUpdatedEvent);
					break;
				case 'message_created': {
					const msg = (data as { message?: IKoshaMessage })?.message ?? data;
					this._onMessageCreated.fire(msg as IKoshaMessage);
					break;
				}
			}
		} catch {
			// ignore malformed packets
		}
	}

	private emit(event: string, data: unknown): void {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			return;
		}
		this.socket.send(`42${JSON.stringify([event, data])}`);
	}

	private startPing(): void {
		this.clearPing();
		this.pingTimer = setInterval(() => {
			if (this.socket?.readyState === WebSocket.OPEN) {
				this.socket.send('2');
			}
		}, this.pingIntervalMs);
	}

	private clearPing(): void {
		if (this.pingTimer) {
			clearInterval(this.pingTimer);
			this.pingTimer = undefined;
		}
	}

	private scheduleReconnect(): void {
		this.clearReconnect();
		this.reconnectTimer = setTimeout(() => {
			void this.openSocket().catch(() => {
				if (!this.disposed) {
					this.scheduleReconnect();
				}
			});
		}, 2_000);
	}

	private clearReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
	}
}
