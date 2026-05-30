# Development Guide

This guide covers local development of `nono-ts` alongside the nono Rust workspace.

## Project Structure

```
nono/
├── nono/                    # Main Rust workspace
│   └── crates/
│       └── nono/            # Core nono library
└── nono-ts/                 # Node.js bindings (this package)
    ├── src/
    │   └── lib.rs           # napi-rs bindings
    ├── tests/               # Vitest test suites
    ├── examples/            # JS and TS usage examples
    ├── Cargo.toml
    ├── package.json
    └── index.js
```

## Prerequisites

- Rust 1.77+
- Node.js 22+
- npm

## Setup

Install npm dependencies:

```bash
cd nono-ts
npm install
```

## Common tasks

A `Makefile` wraps all common workflows. Run `make help` to see available targets:

| Target | What it does |
|---|---|
| `make build` | Release build for the current platform |
| `make build-debug` | Debug build (faster, no optimisation) |
| `make test` | Build debug addon + run Vitest suite |
| `make lint` | `cargo fmt --check` + clippy + typecheck + Biome |
| `make format` | Auto-format Rust and JS/TS sources |
| `make examples` | Build debug addon + run all JS & TS examples |
| `make smoke` | Demonstrator dry-run + stale-docs check |
| `make ci` | Run everything CI runs, in order |
| `make clean` | Remove `.node` artefacts and Cargo build output |

### Replicating CI locally

```bash
make ci
```

This runs the same steps as GitHub Actions: Rust fmt/clippy, TypeScript typecheck, Biome lint, Vitest tests, all examples, and the smoke checks — in that order.

## Building

### Development Build

```bash
make build-debug
```

### Release Build

```bash
make build
```

This compiles the Rust code and produces a native `.node` file for your platform.

## Testing

Tests are written in TypeScript using [Vitest](https://vitest.dev/) and live in `tests/*.test.ts`.

```bash
make test
```

For manual exploration:

```javascript
const nono = require('./index.js');
console.log(nono.supportInfo());
```

## Local Cargo Workspace

The `Cargo.toml` references the nono crate via a relative path:

```toml
[dependencies]
nono = { path = "../nono/crates/nono" }
```

When making changes to the core nono library:

1. Edit the Rust code in `../nono/crates/nono/`
2. Rebuild nono-ts with `make build`
3. Changes are automatically picked up via the path dependency

### Testing Changes to Core Library

```bash
# Make changes to ../nono/crates/nono/src/...

# Rebuild bindings and run tests
make test
```

### Cargo Workspace Considerations

The nono-ts package is intentionally **not** part of the main nono workspace. This separation:

- Keeps napi-rs dependencies isolated
- Allows independent versioning
- Simplifies CI/CD for the core library

If you need to test against a specific nono version:

```toml
# Cargo.toml - use a git reference
[dependencies]
nono = { git = "https://github.com/always-further/nono", branch = "main" }

# Or a specific revision
nono = { git = "https://github.com/always-further/nono", rev = "abc123" }
```

## Adding New Bindings

1. Add the Rust function/type in `src/lib.rs`
2. Use `#[napi]` attributes to expose to JavaScript
3. Update `index.d.ts` with TypeScript types
4. Add exports to `index.js`

Example:

```rust
// src/lib.rs
#[napi]
pub fn my_new_function(arg: String) -> Result<String> {
    // Implementation
}
```

```typescript
// index.d.ts
export function myNewFunction(arg: string): string
```

```javascript
// index.js
const { myNewFunction } = nativeBinding
module.exports.myNewFunction = myNewFunction
```

## Cross-Compilation

Build for specific targets:

```bash
# macOS x64
npx napi build --platform --release --target x86_64-apple-darwin

# macOS ARM64
npx napi build --platform --release --target aarch64-apple-darwin

# Linux x64
npx napi build --platform --release --target x86_64-unknown-linux-gnu

# Linux ARM64
npx napi build --platform --release --target aarch64-unknown-linux-gnu
```

## Debugging

### Rust Panics

Enable backtraces:

```bash
RUST_BACKTRACE=1 make test
```

### Build Issues

Check cargo build directly:

```bash
cargo build --release
```

### Type Mismatches

Verify the nono crate API matches the bindings in `src/lib.rs`. Common issues:

- Renamed types in nono
- Changed function signatures
- New enum variants

## Release Process

1. Update version in `package.json` and `Cargo.toml`
2. Build for all targets
3. Run `npm run prepublishOnly`
4. Publish with `npm publish`
