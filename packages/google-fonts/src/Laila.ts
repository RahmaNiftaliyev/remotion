import {loadFonts} from './base';

export const getInfo = () => ({
	fontFamily: 'Laila',
	importName: 'Laila',
	version: 'v20',
	url: 'https://fonts.googleapis.com/css2?family=Laila:ital,wght@0,300;0,400;0,500;0,600;0,700',
	unicodeRanges: {
		devanagari:
			'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09',
		'latin-ext':
			'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
		latin:
			'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
	},
	fonts: {
		normal: {
			'300': {
				devanagari:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLzxojNGjV8XVQ.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLzxojNJjV8XVQ.woff2',
				latin:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLzxojNHjV8.woff2',
			},
			'400': {
				devanagari:
					'https://fonts.gstatic.com/s/laila/v20/LYjMdG_8nE8jDLRbgCZ4rA.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/laila/v20/LYjMdG_8nE8jDLRUgCZ4rA.woff2',
				latin:
					'https://fonts.gstatic.com/s/laila/v20/LYjMdG_8nE8jDLRagCY.woff2',
			},
			'500': {
				devanagari:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLypozNGjV8XVQ.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLypozNJjV8XVQ.woff2',
				latin:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLypozNHjV8.woff2',
			},
			'600': {
				devanagari:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLyFpDNGjV8XVQ.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLyFpDNJjV8XVQ.woff2',
				latin:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLyFpDNHjV8.woff2',
			},
			'700': {
				devanagari:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLzhpTNGjV8XVQ.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLzhpTNJjV8XVQ.woff2',
				latin:
					'https://fonts.gstatic.com/s/laila/v20/LYjBdG_8nE8jDLzhpTNHjV8.woff2',
			},
		},
	},
	subsets: ['devanagari', 'latin', 'latin-ext'],
});

export const fontFamily = 'Laila' as const;

type Variants = {
	normal: {
		weights: '300' | '400' | '500' | '600' | '700';
		subsets: 'devanagari' | 'latin' | 'latin-ext';
	};
};

export const loadFont = <T extends keyof Variants>(
	style?: T,
	options?: {
		weights?: Variants[T]['weights'][];
		subsets?: Variants[T]['subsets'][];
		document?: Document;
		ignoreTooManyRequestsWarning?: boolean;
	},
) => {
	return loadFonts(getInfo(), style, options);
};
