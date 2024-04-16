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
import posixPath from './posixPath'

export class PathResolve {
    private outResolver?: MatchPath | undefined
    private srcResolver?: MatchPath | undefined
    private globby: typeof globby
    private totalMappedPaths = 0
    private totalFilesWithMappedPaths = 0
    private log = logLive

    private constructor(globbyUtil: typeof globby) {
        this.globby = globbyUtil
    }

    public static Resolver(globbyUtil: typeof globby = globby) {
        return new this(globbyUtil)
    }

    private buildResolvers(destination: string) {
        const config = loadConfig(destination)

        if (config.resultType === 'failed') {
            throw new Error(config.message)
        }

        const { paths, absoluteBaseUrl } = config

        const srcResolver = createMatchPath(absoluteBaseUrl, paths)
        const outResolver = this.buildOutResolver(config)

        this.outResolver = outResolver
        this.srcResolver = srcResolver
    }

    public resolvePathAliases(
        destination: string,
        options: ResolvePathAliasOptions = {}
    ) {
        this.buildResolvers(destination)

        const {
            patterns = ['**/*.js'],
            absoluteOrRelative = 'relative',
            beVerbose: isVerbose = false,
        } = options

        this.log = isVerbose ? logLive : logStub

        this.totalMappedPaths = 0
        this.totalFilesWithMappedPaths = 0

        const files = this.findFiles(patterns, destination)

        this.log.info(`Checking ${files.length} files for path aliases...`)

        files.forEach((file) => this.replacePaths(file, absoluteOrRelative))

        return {
            totalMappedPaths: this.totalMappedPaths,
            totalFilesWithMappedPaths: this.totalFilesWithMappedPaths,
        }
    }

    private replacePaths(
        file: string,
        absoluteOrRelative: PathResolutionStrategies
    ) {
        const contents = fs.readFileSync(file).toString()

        let { found, updated } = this.replaceHashPaths(
            contents,
            file,
            absoluteOrRelative
        )

        if (found) {
            this.totalFilesWithMappedPaths++
            fs.writeFileSync(file, updated)
        }
    }

    private replaceHashPaths(
        contents: string,
        filepath: string,
        absoluteOrRelative: PathResolutionStrategies
    ) {
        const directoryPath = pathUtil.dirname(filepath)
        let found = false
        const updated = `${contents}`.replace(
            /(from |import |import\(|require\()['"](#spruce\/(.*?))['"]/gi,
            (_, requireOrImport, match) => {
                found = true
                const search = match
                let resolved: string | undefined

                this.log.info('Found', search, 'in', filepath)

                if (this.outResolver) {
                    resolved = this.outResolver(search, undefined, undefined, [
                        '.ts',
                        '.js',
                    ])
                }

                if (!resolved && this.srcResolver) {
                    resolved = this.srcResolver(search, undefined, undefined, [
                        '.ts',
                        '.js',
                    ])
                }

                if (!resolved) {
                    throw new Error(`Could not map ${search} in ${filepath}.`)
                }

                const relative =
                    absoluteOrRelative === 'relative'
                        ? './' + pathUtil.relative(directoryPath, resolved)
                        : resolved

                const results = posixPath(`${requireOrImport}"${relative}"`)

                this.totalMappedPaths++

                return results
            }
        )
        return { found, updated }
    }

    private findFiles(patterns: string[], destination: string) {
        return this.globby.sync(
            patterns.map((pattern) =>
                posixPath(pathUtil.posix.join(destination, '/', pattern))
            ),
            {
                dot: true,
            }
        )
    }

    private buildOutResolver(
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
            const resolver = createMatchPath(
                config.absoluteBaseUrl,
                config.paths
            )
            outResolver = (
                requested: string,
                readJson?: any,
                fileExists?: any,
                extensions?: readonly string[]
            ) => {
                let resolved = resolver(
                    requested,
                    readJson,
                    fileExists,
                    extensions
                )
                resolved = resolved?.replace(
                    `${pathUtil.sep}${baseUrl}${pathUtil.sep}`,
                    `${pathUtil.sep}${outDir}${pathUtil.sep}`
                )

                return resolved
            }
        }

        return outResolver
    }
}

type PathResolutionStrategies = 'relative' | 'absolute'

export interface ResolvePathAliasOptions {
    patterns?: string[]
    absoluteOrRelative?: PathResolutionStrategies
    beVerbose?: boolean
}

export const logStub = {
    info: () => {},
    warning: () => {},
    error: () => {},
}

export const logLive = {
    info: (...message: string[]) => console.log(chalk.italic(...message)),
    warning: (...message: string[]) => console.log(chalk.yellow(...message)),
    error: (...message: string[]) => console.log(chalk.red(...message)),
}
