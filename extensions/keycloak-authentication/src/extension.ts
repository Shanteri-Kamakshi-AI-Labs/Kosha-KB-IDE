/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kosha. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext } from 'vscode';
import { registerKeycloakAuth } from './authProvider';
import { readKoshaAuthConfig } from './config';

export async function activate(context: ExtensionContext): Promise<void> {
	const config = readKoshaAuthConfig();
	await registerKeycloakAuth(context, config);
}

export function deactivate(): void {
	// no-op
}
