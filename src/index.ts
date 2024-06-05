import globby from '@sprucelabs/globby'
import { PathResolver, ResolvePathAliasOptions } from './PathResolver'

export function resolvePathAliases(
    destination: string,
    options: ResolvePathAliasOptions = {},
    globUtil: typeof globby = globby
) {
    const resolver = PathResolver.Resolver(globUtil)
    return resolver.resolvePathAliases(destination, options)
}
