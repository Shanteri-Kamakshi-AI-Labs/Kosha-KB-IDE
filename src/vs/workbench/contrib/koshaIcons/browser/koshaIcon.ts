/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon } from '../../../../base/common/themables.js';
import { parseKoshaIconId } from '../common/koshaIconId.js';
import { IKoshaSvgIcon, LUCIDE_SVGS, REACT_ICONS_SVGS } from './koshaIconSvgs.js';

export interface IKoshaIconOptions {
	readonly size?: number;
	readonly title?: string;
	readonly className?: string;
}

/**
 * Render a Kosha icon id (`codicon:…` | `lucide:…` | `react-icons:…`) as a DOM node.
 * SVG icons use `currentColor` so they follow theme / dark-light foreground.
 */
export function renderKoshaIcon(id: string, options?: IKoshaIconOptions): HTMLElement {
	const parsed = parseKoshaIconId(id);
	const host = document.createElement('span');
	host.classList.add('kosha-icon');
	if (options?.className) {
		host.classList.add(...options.className.split(/\s+/).filter(Boolean));
	}
	if (options?.size) {
		host.style.fontSize = `${options.size}px`;
	}
	if (options?.title) {
		host.title = options.title;
	}
	if (!parsed) {
		host.classList.add('kosha-icon-missing');
		host.setAttribute('aria-hidden', 'true');
		return host;
	}

	if (parsed.library === 'codicon') {
		const icon = ThemeIcon.fromId(parsed.name);
		host.classList.add(...ThemeIcon.asClassNameArray(icon));
		host.setAttribute('aria-hidden', 'true');
		return host;
	}

	const def = parsed.library === 'lucide'
		? LUCIDE_SVGS[parsed.name]
		: REACT_ICONS_SVGS[parsed.name];
	if (!def) {
		host.classList.add('kosha-icon-missing');
		host.setAttribute('aria-hidden', 'true');
		return host;
	}
	host.classList.add('kosha-icon-svg');
	host.appendChild(createSvg(def));
	host.setAttribute('aria-hidden', 'true');
	return host;
}

function createSvg(def: IKoshaSvgIcon): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', def.viewBox);
	svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	if (def.mode === 'stroke') {
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', '2');
		svg.setAttribute('stroke-linecap', 'round');
		svg.setAttribute('stroke-linejoin', 'round');
	} else {
		svg.setAttribute('fill', 'currentColor');
	}
	svg.innerHTML = def.body;
	return svg;
}
