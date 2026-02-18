const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CapabilitySet, QueryContext, AccessMode } = require('../../index.js');

console.log('nono-ts example: query policy (TypeScript)');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const allowedDir = path.join(tempRoot, 'allowed');
const deniedDir = path.join(tempRoot, 'denied');

fs.mkdirSync(allowedDir);
fs.mkdirSync(deniedDir);

const caps = new CapabilitySet();
caps.allowPath(allowedDir, AccessMode.ReadWrite);
caps.blockNetwork();

const query = new QueryContext(caps);

const checks: Array<{ label: string; result: { status: string; reason: string } }> = [
  { label: 'write allowed path', result: query.queryPath(path.join(allowedDir, 'data.txt'), AccessMode.Write) },
  { label: 'read denied path', result: query.queryPath(path.join(deniedDir, 'secret.txt'), AccessMode.Read) },
  { label: 'network access', result: query.queryNetwork() },
];

for (const check of checks) {
  console.log(`- ${check.label}: ${check.result.status} (${check.result.reason})`);
}

fs.rmSync(tempRoot, { recursive: true });
