#!/usr/bin/env node
import pathUtil from 'path'
import chalk from 'chalk'
import yargs from 'yargs'
import { resolvePathAliases } from './index'

const argv = yargs.options({
	target: {
		desc: "Where I'll look to begin mapping paths. Defaults to cwd.",
	},
	patterns: {
		desc: 'Comma separated list of globby patterns, default to **/*.js',
	},
	verbose: {
		alias: 'v',
		desc: 'Output more information while mapping',
	},
	absoluteOrRelative: {
		valid: '',
		desc:
			'Should paths resolve relatively or absolutely, valid values are `absolute` or `relative`.',
	},
}).argv

const { patterns, target, absoluteOrRelative, verbose } = argv as {
	patterns?: string
	target?: string
	absoluteOrRelative?: 'relative' | 'absolute'
	verbose?: boolean
}
const cwd =
	target && target[0] === pathUtil.sep
		? target
		: pathUtil.join(process.cwd(), target ?? '')

const processCwd = process.cwd()

console.log(
	chalk.green(
		`Mapping tsconfig paths in '${pathUtil.relative(processCwd, cwd)}'`
	)
)
const results = resolvePathAliases(cwd, {
	absoluteOrRelative,
	patterns: patterns ? patterns.split(',') : undefined,
	beVerbose: verbose,
})

if (results.totalMappedPaths === 0) {
	console.log(
		chalk.green.bold(
			'Done! No paths to map. Maybe mapping was already done? Try building your code again.'
		)
	)
} else {
	console.log(
		chalk.green.bold(
			`Done! Mapped ${results.totalMappedPaths} paths across ${results.totalFilesWithMappedPaths} files.`
		)
	)
}
