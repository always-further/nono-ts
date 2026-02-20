const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CapabilitySet, QueryContext, AccessMode } = require('../../index.js');

console.log('nono-ts example: agent workspace pattern (TypeScript)');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const inputDir = path.join(tempRoot, 'input');
const outputDir = path.join(tempRoot, 'output');
const inputFile = path.join(inputDir, 'task.txt');
const outputFile = path.join(outputDir, 'result.txt');
fs.mkdirSync(inputDir);
fs.mkdirSync(outputDir);
fs.writeFileSync(inputFile, 'summarize these notes\n', 'utf8');

const caps = new CapabilitySet();
caps.allowPath(inputDir, AccessMode.Read);
caps.allowPath(outputDir, AccessMode.ReadWrite);
caps.blockNetwork();
caps.blockCommand('curl');
caps.blockCommand('scp');

const query = new QueryContext(caps);
const checks = [
  {
    label: 'read input',
    result: query.queryPath(inputFile, AccessMode.Read),
  },
  {
    label: 'write output',
    result: query.queryPath(outputFile, AccessMode.Write),
  },
  {
    label: 'read ~/.ssh/config',
    result: query.queryPath(path.join(os.homedir(), '.ssh', 'config'), AccessMode.Read),
  },
  {
    label: 'network',
    result: query.queryNetwork(),
  },
];

console.log('\nAgent policy checks:\n');
for (const check of checks) {
  console.log(`- ${check.label}: ${check.result.status} (${check.result.reason})`);
}

console.log('\nSummary:\n');
console.log(caps.summary());

fs.rmSync(tempRoot, { recursive: true });
