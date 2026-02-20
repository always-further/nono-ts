const fs = require('node:fs');
const path = require('node:path');
const {
  CapabilitySet,
  QueryContext,
  AccessMode,
  isSupported,
  supportInfo,
  apply,
} = require('../../index.js');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const attackTest = args.has('--attack-test');
const offline = args.has('--offline');

const demoRoot = __dirname;
const runtimeDir = path.join(demoRoot, 'runtime');
const inputDir = path.join(runtimeDir, 'input');
const outputDir = path.join(runtimeDir, 'output');
const forbiddenDir = path.join(demoRoot, 'forbidden');
const forbiddenFile = path.join(forbiddenDir, 'do-not-read.txt');

function ensureDemoFiles() {
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(forbiddenDir, { recursive: true });

  if (fs.readdirSync(inputDir).length === 0) {
    fs.writeFileSync(path.join(inputDir, 'task-1.txt'), 'transform me\n', 'utf8');
    fs.writeFileSync(path.join(inputDir, 'task-2.txt'), 'sandbox this text\n', 'utf8');
  }

  fs.writeFileSync(forbiddenFile, 'forbidden-content\n', 'utf8');
}

function buildCapabilities() {
  const caps = new CapabilitySet();
  caps.allowPath(inputDir, AccessMode.Read);
  caps.allowPath(outputDir, AccessMode.ReadWrite);
  if (offline) caps.blockNetwork();
  return caps;
}

function printPreflight(caps) {
  const query = new QueryContext(caps);
  const checks = [
    { label: 'read input', result: query.queryPath(path.join(inputDir, 'task-1.txt'), AccessMode.Read) },
    { label: 'write output', result: query.queryPath(path.join(outputDir, 'result-1.txt'), AccessMode.Write) },
    { label: 'read forbidden', result: query.queryPath(forbiddenFile, AccessMode.Read) },
    { label: 'network', result: query.queryNetwork() },
  ];

  console.log('sandboxed-file-transformer preflight');
  console.log('');
  for (const check of checks) {
    console.log(`- ${check.label}: ${check.result.status} (${check.result.reason})`);
  }

  console.log('\nCapabilities:\n');
  console.log(caps.summary());
}

function runTransform() {
  const files = fs.readdirSync(inputDir);
  let transformed = 0;
  for (const file of files) {
    const inPath = path.join(inputDir, file);
    const outPath = path.join(outputDir, `processed-${file}`);
    const content = fs.readFileSync(inPath, 'utf8');
    fs.writeFileSync(outPath, content.toUpperCase(), 'utf8');
    transformed += 1;
  }
  return transformed;
}

function runAttackTests() {
  let passed = 0;
  let failed = 0;
  const targets = [
    { label: 'forbidden demo file', path: forbiddenFile },
    { label: '~/.ssh/config', path: path.join(process.env.HOME || '', '.ssh', 'config') },
  ];

  for (const target of targets) {
    try {
      fs.readFileSync(target.path, 'utf8');
      console.log(`- ATTACK ${target.label}: FAILED (read succeeded)`);
      failed += 1;
    } catch (error) {
      const code = error && error.code ? error.code : 'UNKNOWN';
      if (code === 'EACCES' || code === 'EPERM') {
        console.log(`- ATTACK ${target.label}: PASS (${code})`);
        passed += 1;
      } else {
        console.log(`- ATTACK ${target.label}: INCONCLUSIVE (${code})`);
      }
    }
  }
  return { passed, failed };
}

function main() {
  ensureDemoFiles();
  const caps = buildCapabilities();
  printPreflight(caps);

  if (dryRun) {
    console.log('\nDry run complete. Sandbox not applied.');
    return;
  }

  if (!isSupported()) {
    const info = supportInfo();
    console.log(`\nUnsupported platform: ${info.platform}`);
    console.log(info.details);
    return;
  }

  if (process.env.NONO_APPLY !== '1') {
    console.log('\nSet NONO_APPLY=1 to apply sandbox and run transformation.');
    return;
  }

  console.log('\nApplying sandbox now (irreversible for this process).');
  apply(caps);

  const transformed = runTransform();
  let attack = { passed: 0, failed: 0 };
  if (attackTest) {
    console.log('\nRunning attack tests...');
    attack = runAttackTests();
  }

  console.log('\nDemo summary');
  console.log(`- transformed files: ${transformed}`);
  console.log(`- network mode: ${offline ? 'blocked' : 'allowed'}`);
  if (attackTest) {
    console.log(`- attack checks passed: ${attack.passed}`);
    console.log(`- attack checks failed: ${attack.failed}`);
  }
  console.log(`- output directory: ${outputDir}`);
}

main();
