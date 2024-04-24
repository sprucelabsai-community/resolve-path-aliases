import { buildEsLintConfig } from 'eslint-config-spruce'

export default buildEsLintConfig({
	ignores: [
		'build/**',
		'esm/**',
		'node_modules/**',
		'src/__tests__/empty_skill/**',
		'src/__tests__/files/**',
		'**/.spruce/**'
	]
})
