/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Vendored SVG bodies for Kosha icons (MIT Lucide / Simple Icons).
 * To add an icon: paste child markup under the matching key (keep viewBox 0 0 24 24 unless noted).
 */

export interface IKoshaSvgIcon {
	readonly viewBox: string;
	/** Lucide-style stroke icons vs filled brand marks. */
	readonly mode: 'stroke' | 'fill';
	/** Inner SVG markup (paths/circles/rects). */
	readonly body: string;
}

/** Lucide keys are kebab-case (e.g. `brain`, `folder-git-2`). */
export const LUCIDE_SVGS: Readonly<Record<string, IKoshaSvgIcon>> = {
	brain: {
		viewBox: '0 0 24 24',
		mode: 'stroke',
		body: [
			'<path d="M12 18V5"/>',
			'<path d="M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4"/>',
			'<path d="M17.707 6.294A3 3 0 1012 5a3 3 0 10-5.707 1.294"/>',
			'<path d="M17.996 5.125a4 4 0 012.526 5.77"/>',
			'<path d="M18 18a4 4 0 002-7.465"/>',
			'<path d="M19.967 17.482a4 4 0 11-7.967.517 4 4 0 11-7.967-.517"/>',
			'<path d="M6 18a4 4 0 01-2-7.465"/>',
			'<path d="M6.004 5.125a4 4 0 00-2.526 5.77"/>',
		].join(''),
	},
	sparkles: {
		viewBox: '0 0 24 24',
		mode: 'stroke',
		body: [
			'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
			'<path d="M20 2v4"/>',
			'<path d="M22 4h-4"/>',
			'<circle cx="4" cy="20" r="2"/>',
		].join(''),
	},
	bot: {
		viewBox: '0 0 24 24',
		mode: 'stroke',
		body: [
			'<path d="M12 8V4H8"/>',
			'<rect width="16" height="12" x="4" y="8" rx="2"/>',
			'<path d="M2 14h2"/>',
			'<path d="M20 14h2"/>',
			'<path d="M15 13v2"/>',
			'<path d="M9 13v2"/>',
		].join(''),
	},
	'folder-git-2': {
		viewBox: '0 0 24 24',
		mode: 'stroke',
		body: [
			'<path d="M18 19a5 5 0 0 1-5-5v8"/>',
			'<path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/>',
			'<circle cx="13" cy="12" r="2"/>',
			'<circle cx="20" cy="19" r="2"/>',
		].join(''),
	},
	'message-square': {
		viewBox: '0 0 24 24',
		mode: 'stroke',
		body: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>',
	},
	'settings-2': {
		viewBox: '0 0 24 24',
		mode: 'stroke',
		body: [
			'<path d="M14 17H5"/>',
			'<path d="M19 7h-9"/>',
			'<circle cx="17" cy="17" r="3"/>',
			'<circle cx="7" cy="7" r="3"/>',
		].join(''),
	},
};

/** React-icons style keys use pack prefix (e.g. `si-github`). */
export const REACT_ICONS_SVGS: Readonly<Record<string, IKoshaSvgIcon>> = {
	'si-github': {
		viewBox: '0 0 24 24',
		mode: 'fill',
		body: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
	},
	'si-gitlab': {
		viewBox: '0 0 24 24',
		mode: 'fill',
		body: '<path d="m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z"/>',
	},
};
