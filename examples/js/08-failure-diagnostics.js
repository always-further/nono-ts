const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  CapabilitySet,
  QueryContext,
  AccessMode,
  isSupported,
  supportInfo,
  apply,
} = require('../../index.js');

console.log('nono-ts example: failure diagnostics');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const allowedDir = path.join(tempRoot, 'allowed');
const deniedDir = path.join(tempRoot, 'denied');
const deniedFile = path.join(deniedDir, 'secret.txt');
fs.mkdirSync(allowedDir);
fs.mkdirSync(deniedDir);
fs.writeFileSync(deniedFile, 'top secret\n', 'utf8');

const caps = new CapabilitySet();
caps.allowPath(allowedDir, AccessMode.ReadWrite);
caps.blockNetwork();

const query = new QueryContext(caps);
const deniedQuery = query.queryPath(deniedFile, AccessMode.Read);
console.log(`Preflight denied path: ${deniedQuery.status} (${deniedQuery.reason})`);
const netQuery = query.queryNetwork();
console.log(`Preflight network: ${netQuery.status} (${netQuery.reason})`);

if (!isSupported()) {
  const info = supportInfo();
  console.log(`\nUnsupported platform: ${info.platform}`);
  console.log(info.details);
  fs.rmSync(tempRoot, { recursive: true });
  process.exit(0);
}

if (process.env.NONO_APPLY !== '1') {
  console.log('\nSet NONO_APPLY=1 to trigger a real runtime denial.');
  fs.rmSync(tempRoot, { recursive: true });
  process.exit(0);
}

console.log('\nApplying sandbox now (irreversible for this process).');
apply(caps);

try {
  fs.readFileSync(deniedFile, 'utf8');
  console.log('Unexpected: denied file read succeeded.');
} catch (error) {
  console.log(`Runtime denial captured: ${error.code || 'UNKNOWN'} - ${error.message}`);
  console.log(`Diagnostic hint: preflight reason was "${deniedQuery.reason}".`);
}
