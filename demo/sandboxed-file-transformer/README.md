# sandboxed-file-transformer

End-to-end `nono-ts` demonstrator that:

1. Builds a least-privilege capability set
2. Prints preflight allow/deny decisions
3. Optionally applies the sandbox
4. Transforms input files into output files
5. Optionally runs forbidden-read attack checks

## Run

From the `nono-ts` repository root:

```bash
npm run build:debug
npm run demo:dry-run
npm run demo
npm run demo:attack-test
NONO_DEMO_KEEP_TMP=1 npm run demo:dry-run
```

`demo` and `demo:attack-test` set `NONO_APPLY=1` in npm scripts.
