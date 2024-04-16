import globby from 'globby'
import { PathResolve, ResolvePathAliasOptions } from './PathResolve'

export function resolvePathAliases(
    destination: string,
    options: ResolvePathAliasOptions = {},
    globUtil: typeof globby = globby
) {
    const resolver = PathResolve.Resolver(globUtil)
    return resolver.resolvePathAliases(destination, options)
}
