import {
	ExternalOption,
	InputOptions,
	MergedRollupOptions,
	OutputOptions,
	RollupBuild,
	RollupCache,
	WarningHandler
} from '../../rollup/types';
import { ensureArray } from '../ensureArray';
import { CommandConfigObject } from './parseInputOptions';
import {
	defaultOnWarn,
	GenericConfigObject,
	getOnWarn,
	normalizeObjectOptionValue,
	warnUnknownOptions
} from './parseOptions';

export const commandAliases: { [key: string]: string } = {
	c: 'config',
	d: 'dir',
	e: 'external',
	f: 'format',
	g: 'globals',
	h: 'help',
	i: 'input',
	m: 'sourcemap',
	n: 'name',
	o: 'file',
	p: 'plugin',
	v: 'version',
	w: 'watch'
};

export function mergeOptions(
	config: GenericConfigObject,
	rawCommandOptions: GenericConfigObject = { external: [], globals: undefined },
	defaultOnWarnHandler?: WarningHandler
): MergedRollupOptions {
	const command = getCommandOptions(rawCommandOptions);
	const inputOptions = mergeInputOptions(config, command, defaultOnWarnHandler);
	const warn = inputOptions.onwarn as WarningHandler;
	if (command.output) {
		Object.assign(command, command.output);
	}
	const outputOptionsArray = ensureArray(config.output) as GenericConfigObject[];
	if (outputOptionsArray.length === 0) outputOptionsArray.push({});
	const outputOptions = outputOptionsArray.map(singleOutputOptions =>
		mergeOutputOptions(singleOutputOptions, command, warn)
	);

	warnUnknownOptions(
		command,
		Object.keys(inputOptions).concat(
			Object.keys(outputOptions[0]).filter(option => option !== 'sourcemapPathTransform'),
			Object.keys(commandAliases),
			'config',
			'environment',
			'plugin',
			'silent',
			'stdin'
		),
		'CLI flags',
		warn,
		/^_$|output$|config/
	);
	(inputOptions as MergedRollupOptions).output = outputOptions;
	return inputOptions as MergedRollupOptions;
}

function getCommandOptions(rawCommandOptions: GenericConfigObject): CommandConfigObject {
	const external =
		rawCommandOptions.external && typeof rawCommandOptions.external === 'string'
			? rawCommandOptions.external.split(',')
			: [];
	return {
		...rawCommandOptions,
		external,
		globals:
			typeof rawCommandOptions.globals === 'string'
				? rawCommandOptions.globals.split(',').reduce((globals, globalDefinition) => {
						const [id, variableName] = globalDefinition.split(':');
						globals[id] = variableName;
						if (external.indexOf(id) === -1) {
							external.push(id);
						}
						return globals;
				  }, Object.create(null))
				: undefined
	};
}

type CompleteInputOptions<U extends keyof InputOptions> = {
	[K in U]: InputOptions[K];
};

function mergeInputOptions(
	config: GenericConfigObject,
	overrides: CommandConfigObject = { external: [], globals: undefined },
	defaultOnWarnHandler: WarningHandler = defaultOnWarn
): InputOptions {
	const getOption = (name: string): any => overrides[name] ?? config[name];
	const inputOptions: CompleteInputOptions<keyof InputOptions> = {
		acorn: getOption('acorn'),
		acornInjectPlugins: getOption('acornInjectPlugins'),
		cache: getCache(config),
		context: getOption('context'),
		experimentalCacheExpiry: getOption('experimentalCacheExpiry'),
		external: getExternal(config, overrides),
		inlineDynamicImports: getOption('inlineDynamicImports'),
		input: getOption('input') || [],
		manualChunks: getOption('manualChunks'),
		moduleContext: getOption('moduleContext'),
		onwarn: getOnWarn(config, defaultOnWarnHandler),
		perf: getOption('perf'),
		plugins: ensureArray(config.plugins) as Plugin[],
		preserveEntrySignatures: getOption('preserveEntrySignatures'),
		preserveModules: getOption('preserveModules'),
		preserveSymlinks: getOption('preserveSymlinks'),
		shimMissingExports: getOption('shimMissingExports'),
		strictDeprecations: getOption('strictDeprecations'),
		treeshake: getObjectOption(config, overrides, 'treeshake'),
		// TODO Lukas see how --watch --watch.something works on the CLI, also test treeshake
		watch: getObjectOption(config, overrides, 'watch')
	};

	warnUnknownOptions(
		config,
		Object.keys(inputOptions),
		'input options',
		inputOptions.onwarn as WarningHandler,
		/^output$/
	);
	return inputOptions;
}

const getCache = (config: GenericConfigObject): false | RollupCache =>
	(config.cache as RollupBuild)?.cache || config.cache;

const getExternal = (
	config: GenericConfigObject,
	overrides: CommandConfigObject
): ExternalOption => {
	const configExternal = config.external as ExternalOption | undefined;
	return typeof configExternal === 'function'
		? (source: string, importer: string | undefined, isResolved: boolean) =>
				configExternal(source, importer, isResolved) || overrides.external.indexOf(source) !== -1
		: ensureArray(configExternal).concat(overrides.external);
};

const getObjectOption = (
	config: GenericConfigObject,
	overrides: GenericConfigObject,
	name: string
) => {
	const commandOption = normalizeObjectOptionValue(overrides[name]);
	const configOption = normalizeObjectOptionValue(config[name]);
	if (commandOption !== undefined) {
		return commandOption && { ...configOption, ...commandOption };
	}
	return configOption;
};

type CompleteOutputOptions<U extends keyof OutputOptions> = {
	[K in U]: OutputOptions[K];
};

function mergeOutputOptions(
	config: GenericConfigObject,
	overrides: GenericConfigObject = {},
	warn: WarningHandler
): OutputOptions {
	const getOption = (name: string): any => overrides[name] ?? config[name];
	const outputOptions: CompleteOutputOptions<keyof OutputOptions> = {
		amd: getObjectOption(config, overrides, 'amd'),
		assetFileNames: getOption('assetFileNames'),
		banner: getOption('banner'),
		chunkFileNames: getOption('chunkFileNames'),
		compact: getOption('compact'),
		dir: getOption('dir'),
		dynamicImportFunction: getOption('dynamicImportFunction'),
		entryFileNames: getOption('entryFileNames'),
		esModule: getOption('esModule'),
		exports: getOption('exports'),
		extend: getOption('extend'),
		externalLiveBindings: getOption('externalLiveBindings'),
		file: getOption('file'),
		footer: getOption('footer'),
		format: getOption('format'),
		freeze: getOption('freeze'),
		globals: getOption('globals'),
		hoistTransitiveImports: getOption('hoistTransitiveImports'),
		indent: getOption('indent'),
		interop: getOption('interop'),
		intro: getOption('intro'),
		minifyInternalExports: getOption('minifyInternalExports'),
		name: getOption('name'),
		namespaceToStringTag: getOption('namespaceToStringTag'),
		noConflict: getOption('noConflict'),
		outro: getOption('outro'),
		paths: getOption('paths'),
		plugins: ensureArray(config.plugins) as Plugin[],
		preferConst: getOption('preferConst'),
		sourcemap: getOption('sourcemap'),
		sourcemapExcludeSources: getOption('sourcemapExcludeSources'),
		sourcemapFile: getOption('sourcemapFile'),
		sourcemapPathTransform: getOption('sourcemapPathTransform'),
		strict: getOption('strict')
	};

	warnUnknownOptions(config, Object.keys(outputOptions), 'output options', warn);
	return outputOptions;
}