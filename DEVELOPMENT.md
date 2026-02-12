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
    ├── Cargo.toml
    ├── package.json
    └── index.js
```

## Prerequisites

- Rust 1.77+
- Node.js 18+
- npm

## Setup

Install npm dependencies:

```bash
cd nono-ts
npm install
```

## Building

### Development Build

```bash
npm run build:debug
```

### Release Build

```bash
npm run build
```

This compiles the Rust code and produces a native `.node` file for your platform.

## Local Cargo Workspace

The `Cargo.toml` references the nono crate via a relative path:

```toml
[dependencies]
nono = { path = "../nono/crates/nono" }
```

When making changes to the core nono library:

1. Edit the Rust code in `../nono/crates/nono/`
2. Rebuild nono-ts with `npm run build`
3. Changes are automatically picked up via the path dependency

### Testing Changes to Core Library

```bash
# Make changes to ../nono/crates/nono/src/...

# Rebuild bindings
npm run build

# Test
npm test
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
nono = { git = "https://github.com/sigauth/nono", branch = "main" }

# Or a specific revision
nono = { git = "https://github.com/sigauth/nono", rev = "abc123" }
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

## Testing

Run the test script:

```bash
npm test
```

For manual testing:

```javascript
const nono = require('./index.js');
console.log(nono.supportInfo());
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
RUST_BACKTRACE=1 node test.js
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
