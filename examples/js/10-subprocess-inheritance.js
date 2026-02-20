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

console.log('nono-ts example: subprocess inheritance');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const workDir = path.join(tempRoot, 'work');
const deniedDir = path.join(tempRoot, 'denied');
fs.mkdirSync(workDir);
fs.mkdirSync(deniedDir);
const deniedPath = path.join(deniedDir, 'secret.txt');
fs.writeFileSync(deniedPath, 'denied content\n', 'utf8');

const caps = new CapabilitySet();
caps.allowPath(path.dirname(process.execPath), AccessMode.Read);
caps.allowPath(workDir, AccessMode.ReadWrite);
caps.allowFile(__filename, AccessMode.Read);
caps.blockNetwork();
for (const runtimePath of ['/usr', '/bin', '/lib', '/lib64', '/etc', '/opt', '/System', '/private']) {
  if (fs.existsSync(runtimePath)) {
    try {
      caps.allowPath(runtimePath, AccessMode.Read);
    } catch (_) {
      // Best-effort runtime grants for cross-platform Node execution after apply().
    }
  }
}

const allowedPath = path.join(workDir, 'child.txt');
const query = new QueryContext(caps);
const preAllowed = query.queryPath(allowedPath, AccessMode.Write);
const preDenied = query.queryPath(deniedPath, AccessMode.Read);
console.log(`- preflight allowed write: ${preAllowed.status} (${preAllowed.reason})`);
console.log(`- preflight denied read: ${preDenied.status} (${preDenied.reason})`);

const childScript = `
const fs = require('node:fs');
let writeOk = false;
let deniedBlocked = false;
try {
  fs.writeFileSync(process.env.NONO_ALLOWED_PATH, 'child writes ok\\n', 'utf8');
  writeOk = true;
} catch (_) {}
try {
  fs.readFileSync(process.env.NONO_DENIED_PATH, 'utf8');
} catch (error) {
  if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
    deniedBlocked = true;
  }
}
console.log('- child write allowed:', writeOk ? 'PASS' : 'FAIL');
console.log('- child denied read blocked:', deniedBlocked ? 'PASS' : 'FAIL');
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
    NONO_DENIED_PATH: deniedPath,
  },
  encoding: 'utf8',
});

console.log(result.stdout.trim());
if (result.stderr.trim()) {
  console.log('\nChild stderr:');
  console.log(result.stderr.trim());
}
