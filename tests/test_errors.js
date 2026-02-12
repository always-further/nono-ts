const { CapabilitySet, AccessMode } = require('../index.js');

const caps = new CapabilitySet();

try {
    caps.allowPath('/nonexistent/path/xyz', AccessMode.Read);
} catch (e) {
    console.log('Caught expected error:', e.message);
}

try {
    caps.allowPath('/etc/hosts', AccessMode.Read);
} catch (e) {
    console.log('Caught expected error:', e.message);
}
