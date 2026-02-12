const { isSupported, supportInfo } = require('../index.js');

console.log('Supported:', isSupported());
const info = supportInfo();
console.log('Platform:', info.platform);
console.log('Details:', info.details);
