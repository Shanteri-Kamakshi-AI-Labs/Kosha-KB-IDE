/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kosha. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import { env } from 'vscode';

export interface IKoshaAuthConfig {
	readonly providerId: string;
	readonly label: string;
	readonly issuer: string;
	readonly clientId: string;
	readonly scopes: readonly string[];
}

const DEFAULTS: IKoshaAuthConfig = {
	providerId: 'keycloak',
	label: 'Kosha',
	issuer: 'https://auth.skaill.app/realms/kosha',
	clientId: 'kosha-kb-ide',
	scopes: ['openid', 'profile', 'email'],
};

export function readKoshaAuthConfig(): IKoshaAuthConfig {
	try {
		const productPath = path.join(env.appRoot, 'product.json');
		const product = JSON.parse(fs.readFileSync(productPath, 'utf8')) as { koshaAuth?: Partial<IKoshaAuthConfig> };
		const cfg = product.koshaAuth ?? {};
		return {
			providerId: cfg.providerId || DEFAULTS.providerId,
			label: cfg.label || DEFAULTS.label,
			issuer: (cfg.issuer || DEFAULTS.issuer).replace(/\/$/, ''),
			clientId: cfg.clientId || DEFAULTS.clientId,
			scopes: cfg.scopes?.length ? cfg.scopes : DEFAULTS.scopes,
		};
	} catch {
		return DEFAULTS;
	}
}
