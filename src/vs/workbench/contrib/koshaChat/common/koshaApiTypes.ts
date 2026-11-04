/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type KoshaThinkingEffort = 'low' | 'medium' | 'high';
export type KoshaAnswerLength = 'low' | 'medium' | 'high';
export type KoshaMessageType = 'user' | 'assistant' | 'system';
export type KoshaGenerationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';

export interface IKoshaSkill {
	readonly name: string;
	readonly description?: string;
}

export interface IKoshaProviderMode {
	readonly id: string;
	readonly label: string;
	readonly allows_model_pick?: boolean;
	readonly default?: boolean;
	readonly providers?: string[];
}

export interface IKoshaProvider {
	readonly provider: string;
	readonly model_id: string;
	readonly tier?: string;
	readonly supports_temperature?: boolean;
	readonly supports_thinking_effort?: boolean;
	readonly supports_verbosity?: boolean;
	readonly supports_answer_length?: boolean;
}

export interface IKoshaProvidersResponse {
	readonly modes: readonly IKoshaProviderMode[];
	readonly tiers?: readonly unknown[];
	readonly providers: readonly IKoshaProvider[];
}

export interface IKoshaSession {
	readonly id: string;
	readonly session_name: string;
	readonly project_id?: string | null;
	readonly kind?: 'anonymous' | 'project' | string;
	readonly active_leaf_message_id?: string | null;
	readonly created_at?: string;
	readonly updated_at?: string;
}

export interface IKoshaListSessionsQuery {
	readonly project_id?: string;
	readonly kind?: 'anonymous' | 'project';
}

export interface IKoshaProject {
	readonly id: string;
	readonly project_name: string;
	readonly harness_id?: string | null;
	readonly created_at?: string;
	readonly updated_at?: string;
}

export interface IKoshaCreateProjectBody {
	readonly project_name: string;
	readonly harness_id?: string;
}

export interface IKoshaUpdateProjectBody {
	readonly project_name?: string;
	readonly harness_id?: string | null;
}

export interface IKoshaHarness {
	readonly id: string;
	readonly harness_name: string;
	readonly description?: string | null;
	readonly soul: string;
	readonly guidelines: string;
	readonly memory: string;
	readonly interview_version?: number | null;
	readonly source_platform_harness_id?: string | null;
	readonly source_platform_code?: string | null;
	readonly created_at?: string;
	readonly updated_at?: string;
}

export interface IKoshaCreateHarnessBody {
	readonly harness_name: string;
	readonly soul: string;
	readonly guidelines: string;
	readonly memory: string;
	readonly description?: string;
}

export interface IKoshaUpdateHarnessBody {
	readonly harness_name?: string;
	readonly soul?: string;
	readonly guidelines?: string;
	readonly memory?: string;
	readonly description?: string;
}

export interface IKoshaGenerateHarnessBody {
	readonly scenario: string;
	readonly harness_name?: string;
}

export interface IKoshaPlatformHarness {
	readonly id: string;
	readonly code: string;
	readonly harness_name: string;
	readonly description?: string | null;
	readonly active?: boolean;
	readonly soul?: string;
	readonly guidelines?: string;
	readonly memory?: string;
}

export interface IKoshaFromPlatformHarnessBody {
	readonly platform_harness_id: string;
	readonly harness_name?: string;
}

export interface IKoshaAttachment {
	readonly id: string;
	readonly attachment_name: string;
	readonly attachment_type?: string;
	readonly location?: string;
	readonly download_link?: string;
	readonly chat_message_id?: string;
}

export interface IKoshaMessage {
	readonly id: string;
	readonly session_id: string;
	readonly message: readonly string[];
	readonly provider: readonly string[] | null;
	readonly message_type: KoshaMessageType;
	readonly attachments?: readonly IKoshaAttachment[];
	readonly parent_id?: string | null;
	readonly reasoning?: string | null;
	readonly model_id?: string | null;
}

export interface IKoshaGeneration {
	readonly id: string;
	readonly session_id: string;
	readonly status: KoshaGenerationStatus | string;
	readonly provider?: string;
	readonly model_id?: string;
	readonly parent_message_id?: string;
	readonly user_message_id?: string;
	readonly assistant_message_id?: string;
	readonly error?: string;
	readonly error_message?: string;
}

export interface IKoshaCreateMessageBody {
	message: string;
	message_type?: KoshaMessageType;
	provider?: string | string[];
	temperature?: number;
	thinking_effort?: KoshaThinkingEffort;
	answer_length?: KoshaAnswerLength;
	hitl_on_tools?: true;
	skill_names?: string[];
	/** Active persona (harness) for this turn. */
	harness_id?: string;
	generate?: boolean;
	request_key?: string;
}

export interface IKoshaCreateMessageResult {
	readonly user_message: IKoshaMessage;
	readonly user_message_id?: string;
	readonly assistant_message?: IKoshaMessage;
	readonly status?: string;
	readonly generation_id?: string;
	readonly generation?: IKoshaGeneration;
	readonly errors?: readonly { readonly provider: string; readonly error: string }[];
}

export interface IKoshaCancelResult {
	readonly session_id: string;
	readonly cancelled?: boolean;
	readonly generation_ids?: readonly string[];
}

export interface IKoshaMessageDeltaEvent {
	readonly session_id: string;
	readonly delta: string;
	readonly provider?: string;
}

export interface IKoshaGenerationUpdatedEvent {
	readonly session_id: string;
	readonly generation_id: string;
	readonly status: string;
	readonly user_message_id?: string;
	readonly assistant_message_id?: string;
	readonly assistant_message?: IKoshaMessage;
	readonly error?: string;
}

export interface IKoshaSendOptions {
	readonly text: string;
	readonly provider?: string;
	readonly skillNames?: readonly string[];
	readonly harnessId?: string;
	readonly temperature?: number;
	readonly thinkingEffort?: KoshaThinkingEffort;
	readonly answerLength?: KoshaAnswerLength;
	readonly hitlOnTools?: boolean;
	readonly files?: readonly File[];
}
