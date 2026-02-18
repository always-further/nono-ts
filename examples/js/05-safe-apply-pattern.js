const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  CapabilitySet,
  QueryContext,
  AccessMode,
  isSupported,
  supportInfo,
  apply,
} = require('../../index.js');

console.log('nono-ts example: safe apply pattern');

if (!isSupported()) {
  const info = supportInfo();
  console.log(`Unsupported platform: ${info.platform}`);
  console.log(info.details);
  process.exit(0);
}

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const workDir = path.join(tempRoot, 'work');
fs.mkdirSync(workDir);

const caps = new CapabilitySet();
caps.allowPath(workDir, AccessMode.ReadWrite);
caps.blockNetwork();

const query = new QueryContext(caps);
const preflight = query.queryPath(path.join(workDir, 'out.txt'), AccessMode.Write);
console.log(`Preflight query: ${preflight.status} (${preflight.reason})`);

if (process.env.NONO_APPLY !== '1') {
  console.log('\nSet NONO_APPLY=1 to run apply(caps).');
  console.log('Skipping apply() to avoid permanently sandboxing this process.');
  fs.rmSync(tempRoot, { recursive: true });
  process.exit(0);
}

console.log('\nApplying sandbox now. This operation is irreversible for the process lifetime.');
apply(caps);
console.log('Sandbox applied.');
