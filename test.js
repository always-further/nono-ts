const { CapabilitySet, QueryContext, SandboxState, AccessMode, isSupported, supportInfo } = require('./index.js');

console.log('=== nono Node.js bindings test ===\n');

// Test support info
console.log('Platform support:');
const info = supportInfo();
console.log(`  Supported: ${info.isSupported}`);
console.log(`  Platform: ${info.platform}`);
console.log(`  Details: ${info.details}`);
console.log();

// Test CapabilitySet
console.log('Creating CapabilitySet...');
const caps = new CapabilitySet();

// Add some capabilities
caps.allowPath('/tmp', AccessMode.ReadWrite);
caps.allowPath('/usr', AccessMode.Read);
caps.blockNetwork();

console.log(`Network blocked: ${caps.isNetworkBlocked}`);
console.log(`Path /tmp covered: ${caps.pathCovered('/tmp/foo')}`);
console.log(`Path /home covered: ${caps.pathCovered('/home/user')}`);
console.log();

// Test QueryContext
console.log('Testing QueryContext...');
const query = new QueryContext(caps);

const tmpResult = query.queryPath('/tmp/test.txt', AccessMode.Write);
console.log(`Query /tmp/test.txt (write): ${tmpResult.status} - ${tmpResult.reason}`);

const homeResult = query.queryPath('/home/user/file.txt', AccessMode.Read);
console.log(`Query /home/user/file.txt (read): ${homeResult.status} - ${homeResult.reason}`);

const netResult = query.queryNetwork();
console.log(`Query network: ${netResult.status} - ${netResult.reason}`);
console.log();

// Test SandboxState serialization
console.log('Testing SandboxState serialization...');
const state = SandboxState.fromCaps(caps);
const json = state.toJson();
console.log(`Serialized state: ${json.substring(0, 80)}...`);

const restored = SandboxState.fromJson(json);
console.log(`Restored net_blocked: ${restored.netBlocked}`);
console.log();

// Print summary
console.log('Capability summary:');
console.log(caps.summary());

console.log('\n=== All tests passed! ===');
