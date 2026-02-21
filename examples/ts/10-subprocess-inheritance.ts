const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const {
  CapabilitySet,
  QueryContext,
  AccessMode,
  isSupported,
  supportInfo,
  apply,
} = require('../../index.js');

console.log('nono-ts example: subprocess inheritance (TypeScript)');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const workDir = path.join(tempRoot, 'work');
fs.mkdirSync(workDir);

const caps = new CapabilitySet();
caps.allowPath(path.dirname(process.execPath), AccessMode.Read);
caps.allowPath(workDir, AccessMode.ReadWrite);
caps.allowFile(__filename, AccessMode.Read);
caps.blockNetwork();
for (const runtimePath of ['/usr', '/bin', '/lib', '/lib64', '/etc', '/opt', '/System', '/Library']) {
  if (fs.existsSync(runtimePath)) {
    try {
      caps.allowPath(runtimePath, AccessMode.Read);
    } catch (_) {
      // Best-effort runtime grants for cross-platform Node execution after apply().
    }
  }
}

const allowedPath = path.join(workDir, 'child.txt');
const deniedCandidates = [
  path.join(os.homedir(), '.ssh', 'id_rsa'),
  path.join(os.homedir(), '.ssh', 'config'),
  path.join(os.homedir(), '.aws', 'credentials'),
];
const selectedDeniedPath = deniedCandidates.find((p) => fs.existsSync(p)) || deniedCandidates[0];

const query = new QueryContext(caps);
const preAllowed = query.queryPath(allowedPath, AccessMode.Write);
const preDenied = query.queryPath(selectedDeniedPath, AccessMode.Read);
console.log(`- preflight allowed write: ${preAllowed.status} (${preAllowed.reason})`);
console.log(`- preflight denied read target: ${selectedDeniedPath}`);
console.log(`- preflight denied read: ${preDenied.status} (${preDenied.reason})`);

const childScript = `
const fs = require('node:fs');
let writeOk = false;
let deniedState = 'ALLOWED';
let deniedCode = '';
try {
  fs.writeFileSync(process.env.NONO_ALLOWED_PATH, 'child writes ok\\n', 'utf8');
  writeOk = true;
} catch (_) {}
try {
  fs.readFileSync(process.env.NONO_DENIED_PATH, 'utf8');
} catch (error) {
  deniedCode = (error && error.code) || 'UNKNOWN';
  if (deniedCode === 'EACCES' || deniedCode === 'EPERM') {
    deniedState = 'BLOCKED';
  } else if (deniedCode === 'ENOENT') {
    deniedState = 'MISSING';
  } else {
    deniedState = 'ERROR';
  }
}
console.log('- child write allowed:', writeOk ? 'PASS' : 'FAIL');
console.log('- child denied read state:', deniedState, deniedCode ? '(' + deniedCode + ')' : '');
`;

if (!isSupported()) {
  const info = supportInfo();
  console.log(`Unsupported platform: ${info.platform}`);
  console.log(info.details);
  fs.rmSync(tempRoot, { recursive: true });
  process.exit(0);
}

if (process.env.NONO_APPLY !== '1') {
  console.log('\nSet NONO_APPLY=1 to apply sandbox and verify child inheritance.');
  fs.rmSync(tempRoot, { recursive: true });
  process.exit(0);
}

console.log('\nApplying sandbox now (irreversible for this process).');
apply(caps);

const result = childProcess.spawnSync(process.execPath, ['-e', childScript], {
  env: {
    ...process.env,
    NONO_ALLOWED_PATH: allowedPath,
    NONO_DENIED_PATH: selectedDeniedPath,
  },
  encoding: 'utf8',
});

console.log(result.stdout.trim());
if (result.stderr.trim()) {
  console.log('\nChild stderr:');
  console.log(result.stderr.trim());
}
