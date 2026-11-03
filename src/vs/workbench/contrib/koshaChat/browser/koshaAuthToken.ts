/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';

export class KoshaAuthTokenUnavailableError extends Error {
	constructor(message = 'Kosha sign-in required') {
		super(message);
		this.name = 'KoshaAuthTokenUnavailableError';
	}
}

export function getKoshaTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

/**
 * Resolve Keycloak accessToken for Kosha API Bearer auth.
 * Optionally prompts sign-in when none is available.
 */
export async function resolveKoshaAccessToken(
	auth: IAuthenticationService,
	product: IProductService,
	commands: ICommandService,
	options?: { promptSignIn?: boolean },
): Promise<string> {
	const providerId = product.koshaAuth?.providerId ?? 'keycloak';
	const scopes = [...(product.koshaAuth?.scopes ?? ['openid', 'profile', 'email'])];

	let sessions = await auth.getSessions(providerId, scopes);
	if (!sessions.length && options?.promptSignIn !== false) {
		await commands.executeCommand('kosha.auth.signIn');
		sessions = await auth.getSessions(providerId, scopes);
	}

	const token = sessions[0]?.accessToken;
	if (!token) {
		throw new KoshaAuthTokenUnavailableError();
	}
	return token;
}
