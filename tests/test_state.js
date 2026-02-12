const { CapabilitySet, SandboxState, AccessMode } = require('../index.js');

const caps = new CapabilitySet();
caps.allowPath('/tmp', AccessMode.Read);
caps.blockNetwork();

const state = SandboxState.fromCaps(caps);
const json = state.toJson();
console.log('State JSON:', json.substring(0, 200), '...');

const state2 = SandboxState.fromJson(json);
const caps2 = state2.toCaps();
console.log('Restored network blocked:', caps2.isNetworkBlocked);
console.log('Restored summary:', caps2.summary());
