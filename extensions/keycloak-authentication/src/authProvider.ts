/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kosha. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import * as http from 'http';
import { URL } from 'url';
import {
	authentication,
	AuthenticationProvider,
	AuthenticationProviderAuthenticationSessionsChangeEvent,
	AuthenticationSession,
	Disposable,
	env,
	EventEmitter,
	ExtensionContext,
	Uri,
	window,
} from 'vscode';
import { IKoshaAuthConfig } from './config';

interface IStoredSession {
	readonly id: string;
	readonly accessToken: string;
	readonly account: { readonly label: string; readonly id: string };
	readonly scopes: string[];
	readonly idToken?: string;
	readonly refreshToken?: string;
	readonly expiresAt?: number;
}

const STORAGE_KEY = 'kosha.keycloak.sessions';

function base64Url(buf: Buffer): string {
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pkcePair(): { verifier: string; challenge: string } {
	const verifier = base64Url(crypto.randomBytes(32));
	const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
	return { verifier, challenge };
}

export class KeycloakAuthProvider implements AuthenticationProvider, Disposable {
	private readonly _onDidChangeSessions = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
	readonly onDidChangeSessions = this._onDidChangeSessions.event;

	private readonly disposables: Disposable[] = [];
	private sessions: IStoredSession[] = [];

	constructor(
		private readonly context: ExtensionContext,
		private readonly config: IKoshaAuthConfig,
	) {
		this.disposables.push(this._onDidChangeSessions);
	}

	async initialize(): Promise<void> {
		const raw = await this.context.secrets.get(STORAGE_KEY);
		if (raw) {
			try {
				this.sessions = JSON.parse(raw) as IStoredSession[];
			} catch {
				this.sessions = [];
			}
		}
	}

	dispose(): void {
		for (const d of this.disposables) {
			d.dispose();
		}
	}

	async getSessions(scopes?: readonly string[]): Promise<AuthenticationSession[]> {
		await this.refreshExpired();
		const wanted = scopes?.length ? [...scopes].sort().join(' ') : undefined;
		return this.sessions
			.filter(s => !wanted || [...s.scopes].sort().join(' ') === wanted)
			.map(s => this.toSession(s));
	}

	async createSession(scopes: readonly string[]): Promise<AuthenticationSession> {
		const effectiveScopes = scopes.length ? scopes : this.config.scopes;
		const { verifier, challenge } = pkcePair();
		const state = base64Url(crypto.randomBytes(16));

		const { code, redirectUri } = await this.authorize(effectiveScopes, challenge, state, verifier);
		const token = await this.exchangeCode(code, redirectUri, verifier);
		const account = await this.resolveAccount(token.access_token, token.id_token);

		const stored: IStoredSession = {
			id: crypto.randomUUID(),
			accessToken: token.access_token,
			account,
			scopes: [...effectiveScopes],
			idToken: token.id_token,
			refreshToken: token.refresh_token,
			expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
		};
		this.sessions = [stored, ...this.sessions.filter(s => s.account.id !== account.id)];
		await this.persist();
		const session = this.toSession(stored);
		this._onDidChangeSessions.fire({ added: [session], removed: [], changed: [] });
		return session;
	}

	async removeSession(sessionId: string): Promise<void> {
		const removed = this.sessions.filter(s => s.id === sessionId).map(s => this.toSession(s));
		this.sessions = this.sessions.filter(s => s.id !== sessionId);
		await this.persist();
		if (removed.length) {
			this._onDidChangeSessions.fire({ added: [], removed, changed: [] });
		}
	}

	private toSession(s: IStoredSession): AuthenticationSession {
		return {
			id: s.id,
			accessToken: s.accessToken,
			account: s.account,
			scopes: s.scopes,
		};
	}

	private async persist(): Promise<void> {
		await this.context.secrets.store(STORAGE_KEY, JSON.stringify(this.sessions));
	}

	private async refreshExpired(): Promise<void> {
		const now = Date.now();
		let changed = false;
		for (let i = 0; i < this.sessions.length; i++) {
			const s = this.sessions[i];
			if (!s.refreshToken || !s.expiresAt || s.expiresAt > now + 60_000) {
				continue;
			}
			try {
				const token = await this.refresh(s.refreshToken);
				this.sessions[i] = {
					...s,
					accessToken: token.access_token,
					idToken: token.id_token ?? s.idToken,
					refreshToken: token.refresh_token ?? s.refreshToken,
					expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
				};
				changed = true;
			} catch {
				// leave session; createSession will re-auth if needed
			}
		}
		if (changed) {
			await this.persist();
			this._onDidChangeSessions.fire({
				added: [],
				removed: [],
				changed: this.sessions.map(s => this.toSession(s)),
			});
		}
	}

	private authorize(
		scopes: readonly string[],
		challenge: string,
		state: string,
		_verifier: string,
	): Promise<{ code: string; redirectUri: string }> {
		return new Promise((resolve, reject) => {
			const server = http.createServer((req, res) => {
				try {
					const url = new URL(req.url ?? '/', 'http://127.0.0.1');
					if (url.pathname !== '/callback') {
						res.writeHead(404);
						res.end();
						return;
					}
					const code = url.searchParams.get('code');
					const returnedState = url.searchParams.get('state');
					const err = url.searchParams.get('error');
					if (err) {
						res.writeHead(400, { 'Content-Type': 'text/html' });
						res.end(`<html><body><h1>Sign-in failed</h1><p>${err}</p></body></html>`);
						cleanup();
						reject(new Error(err));
						return;
					}
					if (!code || returnedState !== state) {
						res.writeHead(400, { 'Content-Type': 'text/html' });
						res.end('<html><body><h1>Invalid callback</h1></body></html>');
						cleanup();
						reject(new Error('Invalid OIDC callback'));
						return;
					}
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end('<html><body><h1>Signed in to Kosha</h1><p>You can close this window.</p></body></html>');
					cleanup();
					resolve({ code, redirectUri });
				} catch (e) {
					cleanup();
					reject(e);
				}
			});

			const cleanup = () => {
				server.close();
			};

			let redirectUri = '';
			server.listen(0, '127.0.0.1', async () => {
				const addr = server.address();
				if (!addr || typeof addr === 'string') {
					cleanup();
					reject(new Error('Failed to bind loopback auth server'));
					return;
				}
				redirectUri = `http://127.0.0.1:${addr.port}/callback`;
				const authUrl = new URL(`${this.config.issuer}/protocol/openid-connect/auth`);
				authUrl.searchParams.set('client_id', this.config.clientId);
				authUrl.searchParams.set('redirect_uri', redirectUri);
				authUrl.searchParams.set('response_type', 'code');
				authUrl.searchParams.set('scope', scopes.join(' '));
				authUrl.searchParams.set('state', state);
				authUrl.searchParams.set('code_challenge', challenge);
				authUrl.searchParams.set('code_challenge_method', 'S256');
				try {
					await env.openExternal(Uri.parse(authUrl.toString()));
				} catch (e) {
					cleanup();
					reject(e);
				}
			});

			server.on('error', (e) => {
				cleanup();
				reject(e);
			});
		});
	}

	private async exchangeCode(code: string, redirectUri: string, verifier: string): Promise<TokenResponse> {
		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: this.config.clientId,
			code,
			redirect_uri: redirectUri,
			code_verifier: verifier,
		});
		return this.postToken(body);
	}

	private async refresh(refreshToken: string): Promise<TokenResponse> {
		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: this.config.clientId,
			refresh_token: refreshToken,
		});
		return this.postToken(body);
	}

	private async postToken(body: URLSearchParams): Promise<TokenResponse> {
		const res = await fetch(`${this.config.issuer}/protocol/openid-connect/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Token request failed (${res.status}): ${text}`);
		}
		return res.json() as Promise<TokenResponse>;
	}

	private async resolveAccount(accessToken: string, idToken?: string): Promise<{ label: string; id: string }> {
		if (idToken) {
			const payload = decodeJwt(idToken);
			const id = String(payload.sub ?? payload.preferred_username ?? 'keycloak-user');
			const label = String(payload.preferred_username ?? payload.email ?? payload.name ?? id);
			return { id, label };
		}
		try {
			const res = await fetch(`${this.config.issuer}/protocol/openid-connect/userinfo`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (res.ok) {
				const info = await res.json() as Record<string, unknown>;
				const id = String(info.sub ?? info.preferred_username ?? 'keycloak-user');
				const label = String(info.preferred_username ?? info.email ?? info.name ?? id);
				return { id, label };
			}
		} catch {
			// fall through
		}
		return { id: 'keycloak-user', label: this.config.label };
	}
}

interface TokenResponse {
	access_token: string;
	expires_in?: number;
	refresh_token?: string;
	id_token?: string;
	token_type?: string;
	scope?: string;
}

function decodeJwt(token: string): Record<string, unknown> {
	const part = token.split('.')[1];
	if (!part) {
		return {};
	}
	const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
	return JSON.parse(json) as Record<string, unknown>;
}

export async function registerKeycloakAuth(context: ExtensionContext, config: IKoshaAuthConfig): Promise<void> {
	const provider = new KeycloakAuthProvider(context, config);
	await provider.initialize();
	context.subscriptions.push(provider);
	context.subscriptions.push(
		authentication.registerAuthenticationProvider(config.providerId, config.label, provider, {
			supportsMultipleAccounts: false,
		})
	);

	const { commands } = await import('vscode');
	context.subscriptions.push(commands.registerCommand('kosha.auth.signIn', async () => {
		try {
			await authentication.getSession(config.providerId, [...config.scopes], { createIfNone: true });
			void window.showInformationMessage('Signed in to Kosha.');
		} catch (e) {
			void window.showErrorMessage(`Kosha sign-in failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}));
	context.subscriptions.push(commands.registerCommand('kosha.auth.signOut', async () => {
		for (const s of await provider.getSessions()) {
			await provider.removeSession(s.id);
		}
		void window.showInformationMessage('Signed out of Kosha.');
	}));
}
