# Examples

Runnable examples for `nono-ts` are provided in both JavaScript and TypeScript.

## Safety

`apply(caps)` is irreversible for the process lifetime. The apply examples (`05-safe-apply-pattern`) are guarded and will only call `apply()` when `NONO_APPLY=1` is set.

## Prerequisites

- Node.js 18+
- Dependencies installed (`npm install`)
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
```

## Example Layout

- `examples/js/01-support-check.js`
- `examples/js/02-build-capabilities.js`
- `examples/js/03-query-policy.js`
- `examples/js/04-state-roundtrip.js`
- `examples/js/05-safe-apply-pattern.js`
- `examples/ts/01-support-check.ts`
- `examples/ts/02-build-capabilities.ts`
- `examples/ts/03-query-policy.ts`
- `examples/ts/04-state-roundtrip.ts`
- `examples/ts/05-safe-apply-pattern.ts`
