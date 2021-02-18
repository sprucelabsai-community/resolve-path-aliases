import fs from 'fs'
import pathUtil from 'path'
import chalk from 'chalk'
import globby from 'globby'
import {
	ConfigLoaderSuccessResult,
	createMatchPath,
	loadConfig,
	MatchPath,
} from 'tsconfig-paths'

export interface IResolvePathAliasOptions {
	patterns?: string[]
	absoluteOrRelative?: 'relative' | 'absolute'
	beVerbose?: boolean
}

const logStub = {
	info: () => {},
	warning: () => {},
	error: () => {},
}

const logLive = {
	info: (...message: string[]) => console.log(chalk.italic(...message)),
	warning: (...message: string[]) => console.log(chalk.yellow(...message)),
	error: (...message: string[]) => console.log(chalk.red(...message)),
}

function buildResolvers(
	destination: string
): {
	outResolver: MatchPath | undefined
	srcResolver: MatchPath
} {
	const config = loadConfig(destination)

	if (config.resultType === 'failed') {
		throw new Error(config.message)
	}

	const { paths, absoluteBaseUrl } = config

	const srcResolver = createMatchPath(absoluteBaseUrl, paths)
	const outResolver = buildOutResolver(config)

	return { outResolver, srcResolver }
}

export function resolvePathAliases(
	destination: string,
	options: IResolvePathAliasOptions = {}
) {
	let { outResolver, srcResolver } = buildResolvers(destination)

	const {
		patterns = ['**/*.js'],
		absoluteOrRelative = 'relative',
		beVerbose: isVerbose = false,
	} = options

	const log = isVerbose ? logLive : logStub
	let totalMappedPaths = 0
	let totalFilesWithMappedPaths = 0

	const files = globby.sync(
		patterns.map((pattern) => pathUtil.join(destination, '/', pattern)),
		{
			dot: true,
		}
	)

	log.info(`Checking ${files.length} files for path aliases...`)

	files.forEach((file) => {
		let contents = fs.readFileSync(file).toString()
		let found = false

		contents = `${contents}`.replace(
			/(from |import |require\()['"](#spruce\/(.*?))['"]/gi,
			(_, requireOrImport, match) => {
				found = true
				const search = match
				let resolved: string | undefined

				log.info('Found', search, 'in', file)

				if (outResolver) {
					resolved = outResolver(search, undefined, undefined, ['.ts', '.js'])
				}

				if (!resolved) {
					resolved = srcResolver(search, undefined, undefined, ['.ts', '.js'])
				}

				if (!resolved) {
					throw new Error(`Could not map ${search} in ${file}.`)
				}

				totalMappedPaths++

				const relative =
					absoluteOrRelative === 'relative'
						? './' + pathUtil.relative(pathUtil.dirname(file), resolved)
						: resolved
				return `${requireOrImport}"${relative}"`
			}
		)

		if (found) {
			totalFilesWithMappedPaths++
			fs.writeFileSync(file, contents)
		}
	})

	return {
		totalMappedPaths,
		totalFilesWithMappedPaths,
	}
}

function buildOutResolver(
	config: ConfigLoaderSuccessResult
): MatchPath | undefined {
	const fullTsConfig = JSON.parse(
		fs.readFileSync(config.configFileAbsolutePath).toString()
	)

	const {
		compilerOptions: { baseUrl, outDir },
	} = fullTsConfig

	let outResolver: MatchPath | undefined

	if (outDir) {
		const resolver = createMatchPath(config.absoluteBaseUrl, config.paths)
		outResolver = (
			requested: string,
			readJson?: any,
			fileExists?: any,
			extensions?: readonly string[]
		) => {
			let resolved = resolver(requested, readJson, fileExists, extensions)
			resolved = resolved?.replace(
				`${pathUtil.sep}${baseUrl}${pathUtil.sep}`,
				`${pathUtil.sep}${outDir}${pathUtil.sep}`
			)

			return resolved
		}
	}

	return outResolver
}
