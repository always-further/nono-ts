const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  CapabilitySet,
  SandboxState,
  QueryContext,
  AccessMode,
} = require('../../index.js');

console.log('nono-ts example: config roundtrip');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const dataDir = path.join(tempRoot, 'data');
const outDir = path.join(tempRoot, 'out');
const configFile = path.join(tempRoot, 'example.json');
fs.mkdirSync(dataDir);
fs.mkdirSync(outDir);
fs.writeFileSync(configFile, '{"mode":"safe"}\n', 'utf8');

const policyConfig = {
  paths: [
    { path: dataDir, access: 'read' },
    { path: outDir, access: 'readwrite' },
    { path: configFile, access: 'read', isFile: true },
  ],
  networkBlocked: true,
};

function toAccessMode(value) {
  if (value === 'read') return AccessMode.Read;
  if (value === 'write') return AccessMode.Write;
  return AccessMode.ReadWrite;
}

function capsFromConfig(config) {
  const caps = new CapabilitySet();
  for (const entry of config.paths) {
    const mode = toAccessMode(entry.access);
    if (entry.isFile) {
      caps.allowFile(entry.path, mode);
    } else {
      caps.allowPath(entry.path, mode);
    }
  }
  if (config.networkBlocked) caps.blockNetwork();
  return caps;
}

const caps = capsFromConfig(policyConfig);
const state = SandboxState.fromCaps(caps);
const json = state.toJson();
const restored = SandboxState.fromJson(json).toCaps();

const origQuery = new QueryContext(caps);
const restoredQuery = new QueryContext(restored);

const targetPath = path.join(outDir, 'result.txt');
const originalDecision = origQuery.queryPath(targetPath, AccessMode.Write);
const restoredDecision = restoredQuery.queryPath(targetPath, AccessMode.Write);

console.log('\nSerialized state JSON (trimmed):');
console.log(json.slice(0, 160) + (json.length > 160 ? '...' : ''));
console.log('\nDecision parity check:');
console.log(`- original: ${originalDecision.status} (${originalDecision.reason})`);
console.log(`- restored: ${restoredDecision.status} (${restoredDecision.reason})`);

fs.rmSync(tempRoot, { recursive: true });
