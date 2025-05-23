import {loadFonts} from './base';

export const getInfo = () => ({
	fontFamily: 'Noto Sans Thai Looped',
	importName: 'NotoSansThaiLooped',
	version: 'v14',
	url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai+Looped:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900',
	unicodeRanges: {
		thai: 'U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC',
		'latin-ext':
			'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
		latin:
			'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
	},
	fonts: {
		normal: {
			'100': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50fF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3YX5ALciXPWQ.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50fF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3YX5ARciXPWQ.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50fF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3YX5AfciU.woff2',
			},
			'200': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Y84EIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Y84EIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Y84EIVQDy.woff2',
			},
			'300': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yl4IIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yl4IIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yl4IIVQDy.woff2',
			},
			'400': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50RF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3QKKAdaiE.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50RF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3QMqAdaiE.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50RF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3QPKAd.woff2',
			},
			'500': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yz4MIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yz4MIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yz4MIVQDy.woff2',
			},
			'600': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Y44QIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Y44QIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Y44QIVQDy.woff2',
			},
			'700': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yh4UIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yh4UIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yh4UIVQDy.woff2',
			},
			'800': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Ym4YIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Ym4YIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Ym4YIVQDy.woff2',
			},
			'900': {
				thai: 'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yv4cIQQDyYO4.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yv4cIWwDyYO4.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosansthailooped/v14/B50cF6pOpWTRcGrhOVJJ3-oPfY7WQuFu5R3Yv4cIVQDy.woff2',
			},
		},
	},
	subsets: ['latin', 'latin-ext', 'thai'],
});

export const fontFamily = 'Noto Sans Thai Looped' as const;

type Variants = {
	normal: {
		weights:
			| '100'
			| '200'
			| '300'
			| '400'
			| '500'
			| '600'
			| '700'
			| '800'
			| '900';
		subsets: 'latin' | 'latin-ext' | 'thai';
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
