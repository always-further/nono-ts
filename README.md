<p align="center">
  <img src="assets/nono-ts.png" alt="nono-ts" width="200">
</p>

<p align="center">
  Node.js/TypeScript bindings for <a href="https://github.com/sigauth/nono">nono</a> capability-based sandboxing
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nono-ts"><img src="https://img.shields.io/npm/v/nono-ts.svg" alt="npm version"></a>
  <a href="https://github.com/sigauth/nono/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
</p>

---

OS-enforced sandboxing for Node.js applications via [Landlock](https://landlock.io/) (Linux) and [Seatbelt](https://developer.apple.com/library/archive/documentation/Darwin/Reference/ManPages/man7/sandbox.7.html) (macOS).

## Installation

```bash
npm install nono-ts
```

## Usage

```typescript
import { CapabilitySet, AccessMode, apply, isSupported, supportInfo } from 'nono-ts';

// Check platform support
if (!isSupported()) {
  console.log('Sandboxing not supported on this platform');
  process.exit(1);
}

// Build capabilities
const caps = new CapabilitySet();
caps.allowPath('/tmp', AccessMode.ReadWrite);
caps.allowPath('/usr', AccessMode.Read);
caps.allowFile('/etc/hosts', AccessMode.Read);
caps.blockNetwork();

// Apply sandbox (irreversible)
apply(caps);

// From this point, the process can only access granted resources
```

## API

### `CapabilitySet`

Build a set of capabilities to grant the sandboxed process.

```typescript
const caps = new CapabilitySet();

// Directory access
caps.allowPath('/data', AccessMode.Read);
caps.allowPath('/tmp', AccessMode.ReadWrite);

// Single file access
caps.allowFile('/etc/passwd', AccessMode.Read);

// Network
caps.blockNetwork();

// Commands
caps.allowCommand('git');
caps.blockCommand('curl');

// Platform-specific rules (macOS Seatbelt)
caps.platformRule('(allow file-read* (subpath "/opt"))');

// Utilities
caps.deduplicate();              // Remove duplicate capabilities
caps.pathCovered('/tmp/foo');    // Check if path is covered
caps.fsCapabilities();           // List all filesystem capabilities
caps.summary();                  // Human-readable summary
```

### `AccessMode`

```typescript
enum AccessMode {
  Read,
  Write,
  ReadWrite
}
```

### `QueryContext`

Query whether operations would be permitted without applying the sandbox.

```typescript
const caps = new CapabilitySet();
caps.allowPath('/tmp', AccessMode.ReadWrite);
caps.blockNetwork();

const query = new QueryContext(caps);

const result = query.queryPath('/tmp/test.txt', AccessMode.Write);
// { status: 'allowed', reason: 'granted_path', grantedPath: '/private/tmp', access: 'read+write' }

const netResult = query.queryNetwork();
// { status: 'denied', reason: 'network_blocked' }
```

### `SandboxState`

Serialize and deserialize sandbox state for process inheritance.

```typescript
// Serialize
const state = SandboxState.fromCaps(caps);
const json = state.toJson();

// Deserialize
const restored = SandboxState.fromJson(json);
const restoredCaps = restored.toCaps();
```

### Functions

```typescript
// Apply sandbox with capabilities (irreversible)
apply(caps: CapabilitySet): void

// Check if sandboxing is supported
isSupported(): boolean

// Get detailed support information
supportInfo(): SupportInfoResult
// Returns: { isSupported: boolean, platform: string, details: string }
```

## Platform Support

| Platform | Backend | Status |
|----------|---------|--------|
| Linux 5.13+ | Landlock | Supported |
| macOS 10.5+ | Seatbelt | Supported |
| Windows | - | Not supported |

## License

Apache-2.0
