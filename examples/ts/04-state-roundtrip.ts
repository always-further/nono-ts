const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CapabilitySet, SandboxState, QueryContext, AccessMode } = require('../../index.js');

console.log('nono-ts example: sandbox state roundtrip (TypeScript)');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const workDir = path.join(tempRoot, 'work');
fs.mkdirSync(workDir);

const caps = new CapabilitySet();
caps.allowPath(workDir, AccessMode.ReadWrite);
caps.blockNetwork();

const state = SandboxState.fromCaps(caps);
const json = state.toJson();
console.log(`Serialized bytes: ${json.length}`);

const restoredState = SandboxState.fromJson(json);
const restoredCaps = restoredState.toCaps();
const query = new QueryContext(restoredCaps);

const allowed = query.queryPath(path.join(workDir, 'log.txt'), AccessMode.Write);
const denied = query.queryNetwork();

console.log(`Roundtrip path query: ${allowed.status} (${allowed.reason})`);
console.log(`Roundtrip network query: ${denied.status} (${denied.reason})`);
console.log(`Restored network blocked: ${restoredCaps.isNetworkBlocked}`);

fs.rmSync(tempRoot, { recursive: true });
