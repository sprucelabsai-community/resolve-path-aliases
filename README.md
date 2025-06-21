# resolve-path-aliases

This module ships with a script to resolve paths from your tsconfig.json

Add this line to your `package.json`

`"build.resolve-paths": "resolve-path-aliases --target build --patterns **/*.js,**/*.d.ts",`


Next run: `yarn build.resolve-paths`
