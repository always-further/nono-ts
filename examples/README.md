# Examples

Runnable examples for `nono-ts` are provided in both JavaScript and TypeScript.

## Safety

`apply(caps)` is irreversible for the process lifetime. The apply examples (`05-safe-apply-pattern`) are guarded and will only call `apply()` when `NONO_APPLY=1` is set.

## Prerequisites

- Node.js 18+
- Dependencies installed (`npm install`)
- Local native addon built for your platform (`npm run build:debug`)
- TypeScript examples require Node.js with `--experimental-strip-types` support (Node 22+ recommended)

## Run Examples

List all examples:

```bash
npm run examples:list
```

Run all safe examples (JS + TS, excludes actual apply):

```bash
npm run example:all
```

Run one JavaScript example:

```bash
npm run example:js:03-query-policy
```

Run one TypeScript example:

```bash
npm run example:ts:03-query-policy
```

Run apply demo (explicit opt-in required):

```bash
NONO_APPLY=1 npm run example:js:05-safe-apply-pattern
NONO_APPLY=1 npm run example:ts:05-safe-apply-pattern
NONO_APPLY=1 npm run example:js:10-subprocess-inheritance
NONO_APPLY=1 npm run example:ts:10-subprocess-inheritance
```

`10-subprocess-inheritance` reports denied-read outcomes as:
- `BLOCKED` (`EACCES`/`EPERM`) - expected secure behavior
- `MISSING` (`ENOENT`) - target file not present on host
- `ALLOWED` - unexpected and should be investigated

Run the end-to-end demonstrator:

```bash
npm run demo:dry-run
npm run demo
npm run demo:attack-test
NONO_DEMO_KEEP_TMP=1 npm run demo:dry-run
```

## Example Layout

- `examples/js/01-support-check.js`
- `examples/js/02-build-capabilities.js`
- `examples/js/03-query-policy.js`
- `examples/js/04-state-roundtrip.js`
- `examples/js/05-safe-apply-pattern.js`
- `examples/js/06-minimal-safe-cli.js`
- `examples/js/07-agent-workspace-pattern.js`
- `examples/js/08-failure-diagnostics.js`
- `examples/js/09-config-roundtrip.js`
- `examples/js/10-subprocess-inheritance.js`
- `examples/ts/01-support-check.ts`
- `examples/ts/02-build-capabilities.ts`
- `examples/ts/03-query-policy.ts`
- `examples/ts/04-state-roundtrip.ts`
- `examples/ts/05-safe-apply-pattern.ts`
- `examples/ts/06-minimal-safe-cli.ts`
- `examples/ts/07-agent-workspace-pattern.ts`
- `examples/ts/08-failure-diagnostics.ts`
- `examples/ts/09-config-roundtrip.ts`
- `examples/ts/10-subprocess-inheritance.ts`
