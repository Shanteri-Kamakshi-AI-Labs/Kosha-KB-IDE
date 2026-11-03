/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/** Command id prefixes stripped from the Command Palette for the KB MVP. */
const STRIPPED_COMMAND_PREFIXES = [
	'workbench.debug.',
	'debug.',
	'scm.',
	'git.',
	'workbench.extensions.',
	'extension.',
	'extensions.',
	'workbench.view.extensions',
	'workbench.view.debug',
	'workbench.view.scm',
	'workbench.action.openAgentsWindow',
	'workbench.action.openWorkspaceInAgentsWindow',
	'workbench.action.chat.openWorkspaceInAgentsWindow',
	'workbench.action.chat.openSessionInAgentsWindow',
	'workbench.action.chat.resetCopilotHarnessIntroduction',
	'workbench.action.openSettings',
	'workbench.action.openGlobalSettings',
	'workbench.action.openApplicationSettings',
	'workbench.action.openWorkspaceSettings',
	'workbench.action.openFolderSettings',
	'workbench.action.openRemoteSettings',
	'workbench.action.openSettings2',
	'workbench.action.openSettingsJson',
	'workbench.action.openApplicationSettingsJson',
	'workbench.action.openGlobalKeybindings',
	'workbench.action.openGlobalKeybindingsFile',
	'workbench.action.openDefaultKeybindingsFile',
	'workbench.action.openWorkspaceConfigFile',
	'workbench.action.openWalkthrough',
	'workbench.action.openDocumentationUrl',
	'workbench.action.openIntroductoryVideosUrl',
	'workbench.action.openTipsAndTricksUrl',
	'workbench.action.openNewsletterSignupUrl',
	'workbench.action.openYouTubeUrl',
	'workbench.action.openRequestFeatureUrl',
	'workbench.action.openLicenseUrl',
	'workbench.action.openPrivacyStatementUrl',
	'workbench.action.keybindingsReference',
	'workbench.action.showAboutDialog',
	'workbench.action.reportIssue',
	'workbench.action.openIssueReporter',
	'workbench.action.getStartedWithAccessibilityFeatures',
	'workbench.action.askVScode',
	'update.',
	'workbench.action.addRootFolder',
	'addRootFolder',
	'testing.',
	'workbench.view.testing',
	'workbench.view.extension.test',
	'notifications.showList',
	'notifications.toggleDoNotDisturbMode',
	'settings.filterByTelemetry',
	// Stock identity / Copilot login chrome — Keycloak only.
	'workbench.action.chat.triggerSetup',
	'workbench.action.chat.triggerSetupForceSignIn',
	'workbench.action.chat.triggerSetupFromAccounts',
	'workbench.action.chat.triggerSetupAnonymousWithoutDialog',
	'workbench.action.chat.signInIndicator',
	'workbench.actions.accounts.signIn',
	'github.',
	'github-authentication.',
	'microsoft-authentication.',
] as const;

/**
 * Returns true when a command should be hidden from the Command Palette
 * (and similar chrome surfaces) for the Kosha KB MVP.
 */
export function isKoshaStrippedCommand(commandId: string): boolean {
	for (const prefix of STRIPPED_COMMAND_PREFIXES) {
		if (commandId === prefix || commandId.startsWith(prefix)) {
			return true;
		}
	}
	return false;
}
