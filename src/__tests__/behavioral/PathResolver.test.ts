import AbstractSpruceTest, { assert, test } from '@sprucelabs/test'
import { PathResolutionStrategies, PathResolver } from '../../PathResolver'

export default class PathResloverTest extends AbstractSpruceTest {
    @test()
    protected static async doesNotReplaceAMatchInAStringLiteral() {
        const contents = `importsWhenLocal: [
			"import AbstractSpruceError from '@sprucelabs/error'",
			"import { FailedToLoadStoreErrorOptions } from '#spruce/errors/options.types'",
		],`

        PathResolver.Class = SpyPathResolver
        const resolver = PathResolver.Resolver() as SpyPathResolver

        const { found } = resolver.replaceHashPaths(
            contents,
            'fake-file.ts',
            'relative'
        )

        assert.isFalse(found)
    }
}

class SpyPathResolver extends PathResolver {
    public replaceHashPaths(
        contents: string,
        filepath: string,
        absoluteOrRelative: PathResolutionStrategies
    ) {
        return super.replaceHashPaths(contents, filepath, absoluteOrRelative)
    }
}
