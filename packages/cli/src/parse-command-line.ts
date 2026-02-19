import type {
	AudioCodec,
	Codec,
	OpenGlRenderer,
	StillImageFormat,
	VideoImageFormat,
} from '@remotion/renderer';
import type {TypeOfOption} from '@remotion/renderer/client';
import {BrowserSafeApis} from '@remotion/renderer/client';
import {Config, ConfigInternals} from './config';
import {parsedCli} from './parsed-cli';

const {
	beepOnFinishOption,
	colorSpaceOption,
	concurrencyOption,
	disallowParallelEncodingOption,
	offthreadVideoCacheSizeInBytesOption,
	encodingBufferSizeOption,
	encodingMaxRateOption,
	deleteAfterOption,
	folderExpiryOption,
	enableMultiprocessOnLinuxOption,
	numberOfGifLoopsOption,
	x264Option,
	enforceAudioOption,
	jpegQualityOption,
	audioBitrateOption,
	videoBitrateOption,
	audioCodecOption,
	publicPathOption,
	audioLatencyHintOption,
	darkModeOption,
	publicLicenseKeyOption,
	forceNewStudioOption,
	numberOfSharedAudioTagsOption,
	ipv4Option,
	pixelFormatOption,
	browserExecutableOption,
	everyNthFrameOption,
	proResProfileOption,
	userAgentOption,
	disableWebSecurityOption,
	ignoreCertificateErrorsOption,
	overrideHeightOption,
	overrideWidthOption,
	overrideFpsOption,
	overrideDurationOption,
	outDirOption,
	packageManagerOption,
	webpackPollOption,
	keyboardShortcutsOption,
	experimentalClientSideRenderingOption,
	imageSequencePatternOption,
} = BrowserSafeApis.options;

export type CommandLineOptions = {
	[browserExecutableOption.cliFlag]: TypeOfOption<
		typeof browserExecutableOption
	>;
	[pixelFormatOption.cliFlag]: TypeOfOption<typeof pixelFormatOption>;
	['image-format']: VideoImageFormat | StillImageFormat;
	[proResProfileOption.cliFlag]: TypeOfOption<typeof proResProfileOption>;
	[x264Option.cliFlag]: TypeOfOption<typeof x264Option>;
	['bundle-cache']: string;
	['env-file']: string;
	[ignoreCertificateErrorsOption.cliFlag]: TypeOfOption<
		typeof ignoreCertificateErrorsOption
	>;
	[darkModeOption.cliFlag]: TypeOfOption<typeof darkModeOption>;
	[disableWebSecurityOption.cliFlag]: TypeOfOption<
		typeof disableWebSecurityOption
	>;
	[everyNthFrameOption.cliFlag]: TypeOfOption<typeof everyNthFrameOption>;
	[numberOfGifLoopsOption.cliFlag]: TypeOfOption<typeof numberOfGifLoopsOption>;
	[numberOfSharedAudioTagsOption.cliFlag]: TypeOfOption<
		typeof numberOfSharedAudioTagsOption
	>;
	[offthreadVideoCacheSizeInBytesOption.cliFlag]: TypeOfOption<
		typeof offthreadVideoCacheSizeInBytesOption
	>;
	[colorSpaceOption.cliFlag]: TypeOfOption<typeof colorSpaceOption>;
	[disallowParallelEncodingOption.cliFlag]: TypeOfOption<
		typeof disallowParallelEncodingOption
	>;
	[beepOnFinishOption.cliFlag]: TypeOfOption<typeof beepOnFinishOption>;
	version: string;
	codec: Codec;
	[concurrencyOption.cliFlag]: TypeOfOption<typeof concurrencyOption>;
	timeout: number;
	config: string;
	['public-dir']: string;
	[audioBitrateOption.cliFlag]: TypeOfOption<typeof audioBitrateOption>;
	[videoBitrateOption.cliFlag]: TypeOfOption<typeof videoBitrateOption>;
	[encodingBufferSizeOption.cliFlag]: TypeOfOption<
		typeof encodingBufferSizeOption
	>;
	[encodingMaxRateOption.cliFlag]: TypeOfOption<typeof encodingMaxRateOption>;
	[audioCodecOption.cliFlag]: AudioCodec;
	[publicPathOption.cliFlag]: string;
	crf: number;
	force: boolean;
	output: string | undefined;
	overwrite: boolean;
	png: boolean;
	props: string;
	quality: number;
	[jpegQualityOption.cliFlag]: TypeOfOption<typeof jpegQualityOption>;
	frames: string | number;
	scale: number;
	sequence: boolean;
	quiet: boolean;
	q: boolean;
	log: string;
	help: boolean;
	port: number;
	frame: string | number;
	['disable-headless']: boolean;
	[keyboardShortcutsOption.cliFlag]: TypeOfOption<
		typeof keyboardShortcutsOption
	>;
	[experimentalClientSideRenderingOption.cliFlag]: TypeOfOption<
		typeof experimentalClientSideRenderingOption
	>;
	muted: boolean;
	[overrideHeightOption.cliFlag]: TypeOfOption<typeof overrideHeightOption>;
	[overrideWidthOption.cliFlag]: TypeOfOption<typeof overrideWidthOption>;
	[overrideFpsOption.cliFlag]: TypeOfOption<typeof overrideFpsOption>;
	[overrideDurationOption.cliFlag]: TypeOfOption<typeof overrideDurationOption>;
	runs: number;
	concurrencies: string;
	[enforceAudioOption.cliFlag]: TypeOfOption<typeof enforceAudioOption>;
	gl: OpenGlRenderer;
	[packageManagerOption.cliFlag]: TypeOfOption<typeof packageManagerOption>;
	[webpackPollOption.cliFlag]: TypeOfOption<typeof webpackPollOption>;
	['no-open']: boolean;
	['browser']: string;
	['browser-args']: string;
	[userAgentOption.cliFlag]: TypeOfOption<typeof userAgentOption>;
	[outDirOption.cliFlag]: TypeOfOption<typeof outDirOption>;
	[audioLatencyHintOption.cliFlag]: AudioContextLatencyCategory;
	[ipv4Option.cliFlag]: TypeOfOption<typeof ipv4Option>;
	[deleteAfterOption.cliFlag]: TypeOfOption<typeof deleteAfterOption>;
	[folderExpiryOption.cliFlag]: TypeOfOption<typeof folderExpiryOption>;
	[enableMultiprocessOnLinuxOption.cliFlag]: TypeOfOption<
		typeof enableMultiprocessOnLinuxOption
	>;
	repro: boolean;
	[imageSequencePatternOption.cliFlag]: TypeOfOption<
		typeof imageSequencePatternOption
	>;
	'license-key': string;
	[publicLicenseKeyOption.cliFlag]: string;
	[forceNewStudioOption.cliFlag]: TypeOfOption<typeof forceNewStudioOption>;
};

export const parseCommandLine = () => {
	if (typeof parsedCli['bundle-cache'] !== 'undefined') {
		Config.setCachingEnabled(parsedCli['bundle-cache'] !== 'false');
	}

	if (parsedCli.frames) {
		ConfigInternals.setFrameRangeFromCli(parsedCli.frames);
	}

	if (parsedCli.frame) {
		ConfigInternals.setStillFrame(Number(parsedCli.frame));
	}

	if (parsedCli.png) {
		throw new Error(
			'The --png flag has been removed. Use --sequence --image-format=png from now on.',
		);
	}

	if (parsedCli.sequence) {
		Config.setImageSequence(true);
	}

	if (
		parsedCli['license-key'] &&
		parsedCli['license-key'].startsWith('rm_pub_')
	) {
		Config.setPublicLicenseKey(parsedCli['license-key']);
	}
};
