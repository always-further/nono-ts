# Release

`nono-ts` releases are published by GitHub Actions. Do not publish from a laptop for the normal release path.

The package publishes one root package plus one native package per supported platform. The root package must be published last because package managers resolve the matching native package from root `optionalDependencies`, for example `nono-ts-linux-x64-gnu`.

## 1. Prepare The Version PR

Run the version preparation script with the next version:

```bash
npm run version:prepare -- 0.4.2
```

That updates:

- `package.json`
- `package-lock.json`
- `Cargo.toml`
- `Cargo.lock`
- `npm/*/package.json`

It also runs:

```bash
npm run build:debug
```

That regenerates the checked-in napi loader/version metadata. If you only want to update manifests while iterating locally, use:

```bash
npm run version:prepare -- 0.4.2 --no-build
```

Open a PR with those changes and merge it.

## 2. Dry Run CI

Before publishing, run the `Publish to npm` workflow manually with `publish_target: dry-run`.

The dry-run workflow builds all native targets, copies artifacts into `npm/*`, runs the release helper in dry-run mode, and verifies the publish order without publishing to npm.

## 3. Publish

Create and publish a GitHub release for the merged version tag, for example `v0.4.2`.

The `Publish to npm` workflow runs automatically when the GitHub release is published. It does the full npm release:

1. Build native artifacts for all supported targets.
2. Download artifacts into the publish job.
3. Copy artifacts into `npm/*`.
4. Add native `optionalDependencies` to the root package metadata.
5. Publish all `npm/*` native packages.
6. Publish the root `nono-ts` package.

## Manual Fallback

Only use this if CI cannot be used and the checkout already has all native `.node` artifacts copied into `npm/*`:

```bash
npm run release:npm:publish
```

The helper enforces native-first publish order. Its default mode is a dry run:

```bash
npm run release:npm
```

## Native Optional Dependencies

Do not check native `optionalDependencies` into the source `package.json`.

They are added at publish time by:

```bash
npm run prepare:npm-publish -- --check-artifacts
```

This keeps local development installs from trying to fetch native packages that may not exist yet, while ensuring the published root package still points users to the matching native package.
