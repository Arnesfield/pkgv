# template.ts

TypeScript template repository.

---

Run initial setup:

```sh
npm init
```

Install dependencies:

```sh
npm install --save-dev \
  @eslint/js \
  @rollup/plugin-eslint @rollup/plugin-typescript @types/node \
  concurrently eslint eslint-plugin-jsdoc globals prettier rimraf rollup \
  rollup-plugin-cleanup rollup-plugin-dts rollup-plugin-esbuild \
  rollup-plugin-output-size tslib typescript typescript-eslint
```

Install testing dependencies:

```sh
npm install --save-dev \
  @types/chai @types/mocha @types/sinon \
  chai eslint-plugin-chai-friendly mocha sinon tsx
```

Finally, sort `package.json` with [sort-package-json](https://www.npmjs.com/package/sort-package-json):

```sh
sort-package-json
```
