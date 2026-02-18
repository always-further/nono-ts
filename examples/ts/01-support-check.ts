const { isSupported, supportInfo } = require('../../index.js');

console.log('nono-ts example: support check (TypeScript)');

const info = supportInfo();
console.log(`Platform: ${info.platform}`);
console.log(`Supported: ${info.isSupported}`);
console.log(`Details: ${info.details}`);

if (!isSupported()) {
  console.log('Sandboxing is not supported on this platform.');
  process.exit(0);
}

console.log('Sandboxing is available.');
