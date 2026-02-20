const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const {
  CapabilitySet,
  SandboxState,
  QueryContext,
  AccessMode,
} = require('../../index.js');

console.log('nono-ts example: subprocess inheritance');

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-example-')));
const workDir = path.join(tempRoot, 'work');
const deniedDir = path.join(tempRoot, 'denied');
fs.mkdirSync(workDir);
fs.mkdirSync(deniedDir);

const caps = new CapabilitySet();
caps.allowPath(workDir, AccessMode.ReadWrite);
caps.blockNetwork();

const stateJson = SandboxState.fromCaps(caps).toJson();
const allowedPath = path.join(workDir, 'child.txt');
const deniedPath = path.join(deniedDir, 'secret.txt');
const indexPath = path.resolve(__dirname, '../../index.js');

const childScript = `
const { SandboxState, QueryContext, AccessMode } = require(process.env.NONO_INDEX_PATH);
const state = SandboxState.fromJson(process.env.NONO_STATE_JSON);
const caps = state.toCaps();
const query = new QueryContext(caps);
const allowed = query.queryPath(process.env.NONO_ALLOWED_PATH, AccessMode.Write);
const denied = query.queryPath(process.env.NONO_DENIED_PATH, AccessMode.Read);
const network = query.queryNetwork();
console.log('- child allowed write:', allowed.status, '(' + allowed.reason + ')');
console.log('- child denied read:', denied.status, '(' + denied.reason + ')');
console.log('- child network:', network.status, '(' + network.reason + ')');
`;

const result = childProcess.spawnSync(process.execPath, ['-e', childScript], {
  env: {
    ...process.env,
    NONO_INDEX_PATH: indexPath,
    NONO_STATE_JSON: stateJson,
    NONO_ALLOWED_PATH: allowedPath,
    NONO_DENIED_PATH: deniedPath,
  },
  encoding: 'utf8',
});

const parentQuery = new QueryContext(caps);
const parentDecision = parentQuery.queryPath(allowedPath, AccessMode.Write);
console.log(`- parent allowed write: ${parentDecision.status} (${parentDecision.reason})`);
console.log(result.stdout.trim());
if (result.stderr.trim()) {
  console.log('\nChild stderr:');
  console.log(result.stderr.trim());
}

fs.rmSync(tempRoot, { recursive: true });
