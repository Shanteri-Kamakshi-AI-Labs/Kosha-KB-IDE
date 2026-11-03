/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AbstractRequestService, AuthInfo, Credentials, IRequestService } from '../../../../platform/request/common/request.js';
import { RequestChannelClient } from '../../../../platform/request/common/requestIpc.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IRequestContext, IRequestOptions } from '../../../../base/parts/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { request } from '../../../../base/parts/request/common/requestImpl.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize } from '../../../../nls.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
import { LogService } from '../../../../platform/log/common/logService.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';

export class NativeRequestService extends AbstractRequestService implements IRequestService {

	declare readonly _serviceBrand: undefined;

	private readonly mainRequest: RequestChannelClient;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILoggerService loggerService: ILoggerService,
		@IMainProcessService mainProcessService: IMainProcessService,
	) {
		const logger = loggerService.createLogger(`network`, { name: localize('network', "Network"), group: windowLogGroup });
		const logService = new LogService(logger);
		super(logService);
		this._register(logger);
		this._register(logService);
		// Kosha / external APIs: renderer fetch is subject to CORS from vscode-file://.
		// Main-process Electron net is not.
		this.mainRequest = new RequestChannelClient(mainProcessService.getChannel('request'));
	}

	async request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext> {
		if (!options.proxyAuthorization) {
			options.proxyAuthorization = this.configurationService.inspect<string>('http.proxyAuthorization').userLocalValue;
		}
		const url = options.url || '';
		if (/^https?:\/\//i.test(url)) {
			return this.logAndRequest(options, () => this.mainRequest.request(options, token));
		}
		return this.logAndRequest(options, () => request(options, token, () => navigator.onLine));
	}

	async resolveProxy(url: string): Promise<string | undefined> {
		return this.nativeHostService.resolveProxy(url);
	}

	async lookupAuthorization(authInfo: AuthInfo): Promise<Credentials | undefined> {
		return this.nativeHostService.lookupAuthorization(authInfo);
	}

	async lookupKerberosAuthorization(url: string): Promise<string | undefined> {
		return this.nativeHostService.lookupKerberosAuthorization(url);
	}

	async loadCertificates(): Promise<string[]> {
		return this.nativeHostService.loadCertificates();
	}
}

registerSingleton(IRequestService, NativeRequestService, InstantiationType.Delayed);
