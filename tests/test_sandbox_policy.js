// Scenario: sandboxing an untrusted plugin runner
//
// A host application loads third-party plugins from a known directory.
// Plugins may read their own source dir and write output to a scratch area,
// but must not touch anything else on disk or reach the network.
// Before applying the sandbox we audit the policy with QueryContext to
// confirm it behaves as expected, then serialize it so a child process
// could re-apply the same rules.

const {
  CapabilitySet,
  QueryContext,
  SandboxState,
  AccessMode,
  isSupported,
  supportInfo,
} = require('../index.js');
const os = require('os');
const path = require('path');
const fs = require('fs');

// -- formatting helpers -----------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BG_RED = '\x1b[41m';
const BG_GREEN = '\x1b[42m';

function assert(condition, msg) {
  if (!condition) {
    console.error(`\n  ${BG_RED}${WHITE}${BOLD} FAIL ${RESET} ${RED}${msg}${RESET}\n`);
    process.exit(1);
  }
}

function section(num, title) {
  const bar = DIM + '\u2500'.repeat(60) + RESET;
  console.log(`\n${bar}`);
  console.log(`${BOLD}${CYAN}  ${num}. ${title}${RESET}`);
  console.log(bar);
}

function allowed(label) {
  console.log(`  ${BG_GREEN}${WHITE}${BOLD} ALLOW ${RESET} ${label}`);
}

function denied(label, detail) {
  const extra = detail ? `  ${DIM}(${detail})${RESET}` : '';
  console.log(`  ${BG_RED}${WHITE}${BOLD} DENY  ${RESET} ${label}${extra}`);
}

function info(label, value) {
  console.log(`  ${DIM}${label}${RESET} ${value}`);
}

function pass(msg) {
  console.log(`  ${GREEN}*${RESET} ${msg}`);
}

// -- set up real directories for the policy ---------------------------------

const tmpBase = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nono-test-')));
const pluginDir = path.join(tmpBase, 'plugins');
const outputDir = path.join(tmpBase, 'output');
const secretDir = path.join(tmpBase, 'secrets');
fs.mkdirSync(pluginDir);
fs.mkdirSync(outputDir);
fs.mkdirSync(secretDir);

// Drop a marker file so we can test single-file grants
const configFile = path.join(tmpBase, 'plugin.conf');
fs.writeFileSync(configFile, 'max_memory=128m\n');

// -- banner -----------------------------------------------------------------

console.log(`\n${BOLD}${CYAN}  nono-ts${RESET}${DIM} \u2014 capability-based sandbox policy test${RESET}`);
console.log(`${DIM}  Scenario: untrusted plugin runner${RESET}`);

// ---------------------------------------------------------------------------
section(1, 'Build the capability set');
// ---------------------------------------------------------------------------

const caps = new CapabilitySet();

caps.allowPath(pluginDir, AccessMode.Read);
caps.allowPath(outputDir, AccessMode.ReadWrite);
caps.allowFile(configFile, AccessMode.Read);
caps.blockNetwork();
caps.blockCommand('curl');
caps.blockCommand('wget');
caps.allowCommand('node');

for (const line of caps.summary().split('\n')) {
  if (line.trim()) {
    console.log(`  ${DIM}${line}${RESET}`);
  }
}

// ---------------------------------------------------------------------------
section(2, 'Inspect filesystem capabilities');
// ---------------------------------------------------------------------------

const fsCaps = caps.fsCapabilities();
info('Registered capabilities:', `${BOLD}${fsCaps.length}${RESET}`);
console.log('');

const maxPath = Math.max(...fsCaps.map(fc => fc.resolved.length));
for (const fc of fsCaps) {
  const kind = fc.isFile
    ? `${YELLOW}file${RESET}`
    : `${CYAN}dir ${RESET}`;
  const padded = fc.resolved.padEnd(maxPath);
  const access = fc.access === 'read'
    ? `${GREEN}${fc.access}${RESET}`
    : `${YELLOW}${fc.access}${RESET}`;
  console.log(`  ${DIM}[${RESET}${kind}${DIM}]${RESET} ${padded}  ${access}`);
}

assert(fsCaps.length === 3, 'expected 3 fs capabilities (pluginDir, outputDir, configFile)');
assert(caps.isNetworkBlocked, 'network should be blocked');

// ---------------------------------------------------------------------------
section(3, 'pathCovered checks');
// ---------------------------------------------------------------------------

assert(
  caps.pathCovered(path.join(pluginDir, 'init.js')),
  'pluginDir/init.js should be covered'
);
pass('plugins/init.js is covered by pluginDir grant');

assert(
  !caps.pathCovered(path.join(secretDir, 'key.pem')),
  'secretDir/key.pem must NOT be covered'
);
pass('secrets/key.pem is correctly uncovered');

// ---------------------------------------------------------------------------
section(4, 'Audit the policy with QueryContext');
// ---------------------------------------------------------------------------

const ctx = new QueryContext(caps);

const q1 = ctx.queryPath(path.join(pluginDir, 'init.js'), AccessMode.Read);
assert(q1.status === 'allowed', 'read pluginDir should be allowed');
allowed(`Read  plugins/init.js`);

const q2 = ctx.queryPath(path.join(outputDir, 'result.json'), AccessMode.Write);
assert(q2.status === 'allowed', 'write outputDir should be allowed');
allowed(`Write output/result.json`);

const q6 = ctx.queryPath(configFile, AccessMode.Read);
assert(q6.status === 'allowed', 'read configFile should be allowed');
allowed(`Read  plugin.conf`);

console.log('');

const q3 = ctx.queryPath(path.join(pluginDir, 'evil.js'), AccessMode.Write);
assert(q3.status === 'denied', 'write pluginDir should be denied');
denied(`Write plugins/evil.js`, `granted=${q3.granted}, requested=${q3.requested}`);

const q4 = ctx.queryPath(path.join(secretDir, 'key.pem'), AccessMode.Read);
assert(q4.status === 'denied', 'read secretDir should be denied');
denied(`Read  secrets/key.pem`, q4.reason);

const q5 = ctx.queryNetwork();
assert(q5.status === 'denied', 'network should be denied');
denied(`Network outbound`, q5.reason);

// ---------------------------------------------------------------------------
section(5, 'Deduplication');
// ---------------------------------------------------------------------------

caps.allowPath(pluginDir, AccessMode.Read);
info('Before dedup:', `${caps.fsCapabilities().length} capabilities`);
assert(caps.fsCapabilities().length === 4, 'should have 4 before dedup');

caps.deduplicate();
info('After dedup: ', `${caps.fsCapabilities().length} capabilities`);
assert(caps.fsCapabilities().length === 3, 'should be back to 3 after dedup');
pass('Redundant grant collapsed');

// ---------------------------------------------------------------------------
section(6, 'Serialize and restore via SandboxState');
// ---------------------------------------------------------------------------

const state = SandboxState.fromCaps(caps);
const json = state.toJson();
assert(state.netBlocked === true, 'serialized state should reflect network blocked');

info('JSON size:', `${json.length} bytes`);

const restored = SandboxState.fromJson(json);
const restoredCaps = restored.toCaps();

assert(restoredCaps.isNetworkBlocked, 'restored caps should block network');
assert(restoredCaps.fsCapabilities().length === 3, 'restored caps should have 3 fs entries');

const ctx2 = new QueryContext(restoredCaps);
assert(ctx2.queryPath(path.join(pluginDir, 'init.js'), AccessMode.Read).status === 'allowed',
  'restored policy should still allow reading pluginDir');
assert(ctx2.queryPath(path.join(secretDir, 'key.pem'), AccessMode.Read).status === 'denied',
  'restored policy should still deny reading secretDir');
assert(ctx2.queryNetwork().status === 'denied',
  'restored policy should still deny network');

pass('Restored policy matches original');

// ---------------------------------------------------------------------------
section(7, 'Platform support');
// ---------------------------------------------------------------------------

const si = supportInfo();
info('Platform: ', `${BOLD}${si.platform}${RESET}`);
info('Supported:', si.isSupported ? `${GREEN}yes${RESET}` : `${RED}no${RESET}`);
info('Details:  ', si.details);

if (isSupported()) {
  console.log(`\n  ${DIM}In production, apply(caps) would be called here to${RESET}`);
  console.log(`  ${DIM}permanently restrict this process to the granted capabilities.${RESET}`);
}

// -- cleanup ----------------------------------------------------------------
fs.rmSync(tmpBase, { recursive: true });

// -- summary ----------------------------------------------------------------
console.log(`\n${BG_GREEN}${WHITE}${BOLD} PASS ${RESET} ${GREEN}All checks passed.${RESET}\n`);
