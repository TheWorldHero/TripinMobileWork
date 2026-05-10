// Shim entry for the React Native Gradle bundle task (createBundleReleaseJsAndAssets).
// The Expo Metro bundler treats the monorepo root as projectRoot, so it resolves
// `--entry-file index.ts` relative to here. This file just re-exports the real entry
// that lives in apps/mobile/. Keep it minimal so dev metro / expo go are unaffected.
import './apps/mobile/index';
