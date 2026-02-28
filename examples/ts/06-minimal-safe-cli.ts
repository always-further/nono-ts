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

console.log('nono-ts example: minimal safe cli (TypeScript)');

if (!isSupported()) {
  const info = supportInfo();
  console.log(`Unsupported platform: ${info.platform}`);
  console.log(info.details);
  process.exit(0);
}

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const inputFile = path.join(tempRoot, 'input.txt');
const outputFile = path.join(tempRoot, 'output.txt');
fs.writeFileSync(inputFile, 'hello from minimal-safe-cli\n', 'utf8');

const caps = new CapabilitySet();
caps.allowPath(tempRoot, AccessMode.ReadWrite);
caps.blockNetwork();

const query = new QueryContext(caps);
const preflight = query.queryPath(outputFile, AccessMode.Write);
console.log(`Preflight write check: ${preflight.status} (${preflight.reason})`);
console.log('\nSummary:\n');
console.log(caps.summary());

if (process.env.NONO_APPLY !== '1') {
  console.log('\nSet NONO_APPLY=1 to run apply(caps) + transform.');
  fs.rmSync(tempRoot, { recursive: true });
  process.exit(0);
}

console.log('\nApplying sandbox now (irreversible for this process).');
apply(caps);

const content = fs.readFileSync(inputFile, 'utf8');
fs.writeFileSync(outputFile, content.toUpperCase(), 'utf8');
console.log(`Wrote transformed file: ${outputFile}`);
