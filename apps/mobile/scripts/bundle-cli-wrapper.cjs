#!/usr/bin/env node
/**
 * Wrapper around @expo/cli that fixes the createBundleReleaseJsAndAssets task in
 * monorepo setups: the React Native gradle plugin invokes
 *   `node ../../node_modules/expo/.../cli export:embed --entry-file index.ts ...`
 * with cwd `apps/mobile`, but Expo's metro export then resolves the entry from
 * the workspace root and fails because `index.ts` doesn't live there. We rewrite
 * `--entry-file` to an absolute path before delegating.
 */
const path = require('path');
const expoCliPath = require.resolve('expo/node_modules/@expo/cli/build/bin/cli', {
  paths: [path.join(__dirname, '..')],
});

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--entry-file' && argv[i + 1]) {
    let entry = argv[i + 1];
    if (!path.isAbsolute(entry)) {
      entry = path.resolve(process.cwd(), entry);
    }
    argv[i + 1] = entry;
  }
}

process.argv = [process.argv[0], expoCliPath, ...argv];
require(expoCliPath);
