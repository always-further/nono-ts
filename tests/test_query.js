const { CapabilitySet, QueryContext, AccessMode } = require('../index.js');

const caps = new CapabilitySet();
caps.allowPath('/tmp', AccessMode.ReadWrite);

const ctx = new QueryContext(caps);

// Should be allowed
let result = ctx.queryPath('/tmp/test.txt', AccessMode.Read);
console.log('Query /tmp/test.txt READ:', JSON.stringify(result, null, 2));

// Should be denied
result = ctx.queryPath('/etc/passwd', AccessMode.Read);
console.log('Query /etc/passwd READ:', JSON.stringify(result, null, 2));

// Network
const caps2 = new CapabilitySet();
caps2.blockNetwork();
const ctx2 = new QueryContext(caps2);
console.log('Network query:', JSON.stringify(ctx2.queryNetwork(), null, 2));
