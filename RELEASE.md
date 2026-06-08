# Release

`nono-ts` publishes one root package plus one native package per supported platform.

The root package must be published last. Users on Linux, macOS, npm, and Bun install the root `nono-ts` package first, then their package manager resolves the matching native package from `optionalDependencies`, such as `nono-ts-linux-x64-gnu`.

## Version Updates

Update the same version in:

- `package.json`
- `Cargo.toml`
- `npm/*/package.json`

Then regenerate checked-in generated files:

```bash
npm run build:debug
```

## Dry Run

The release helper is dry-run by default:

```bash
npm run release:npm
```

It expects native artifacts to already be copied into `npm/*`. In CI this happens with:

```bash
npx napi artifacts --output-dir artifacts --npm-dir npm
```

The dry-run release helper:

- runs `scripts/prepare-npm-publish.mjs --check-artifacts`
- dry-runs each `npm/*` native package publish
- dry-runs the root `nono-ts` publish
- restores package manifests after the dry-run

## Publish

To publish from a prepared checkout:

```bash
npm run release:npm:publish
```

The publish order is fixed:

1. Prepare package metadata and verify native artifacts.
2. Publish all `npm/*` native packages.
3. Publish the root `nono-ts` package.

The root package is published with `--ignore-scripts` because the release helper has already prepared the metadata. A direct `npm publish` still runs `prepublishOnly`, which prepares metadata for manual publishing.

## Native Optional Dependencies

Do not check native `optionalDependencies` into the source `package.json`.

They are added at publish time by:

```bash
npm run prepare:npm-publish -- --check-artifacts
```

This keeps local development installs from trying to fetch native packages that may not exist yet, while ensuring the published root package still points users to the matching native package.

## GitHub Release Flow

The `Publish to npm` workflow does the full release flow:

1. Build native artifacts for all supported targets.
2. Download artifacts into the publish job.
3. Copy artifacts into `npm/*`.
4. Run `npm run release:npm:publish`.

Manual workflow dispatch with `publish_target: dry-run` runs the same script without `--publish`.
