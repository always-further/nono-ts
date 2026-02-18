const fs = require('fs');
const os = require('os');
const path = require('path');
const { CapabilitySet, AccessMode } = require('../../index.js');

console.log('nono-ts example: build capabilities');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const inputDir = path.join(tempRoot, 'input');
const outputDir = path.join(tempRoot, 'output');
const configFile = path.join(tempRoot, 'app.conf');

fs.mkdirSync(inputDir);
fs.mkdirSync(outputDir);
fs.writeFileSync(configFile, 'mode=safe\n', 'utf8');

const caps = new CapabilitySet();
caps.allowPath(inputDir, AccessMode.Read);
caps.allowPath(outputDir, AccessMode.ReadWrite);
caps.allowFile(configFile, AccessMode.Read);
caps.blockNetwork();
caps.blockCommand('curl');
caps.allowCommand('node');

console.log('\nSummary:\n');
console.log(caps.summary());

console.log('\nFilesystem capabilities:');
for (const cap of caps.fsCapabilities()) {
  const kind = cap.isFile ? 'file' : 'dir';
  console.log(`- ${kind}: ${cap.resolved} (${cap.access})`);
}

console.log(`\nNetwork blocked: ${caps.isNetworkBlocked}`);

fs.rmSync(tempRoot, { recursive: true });
