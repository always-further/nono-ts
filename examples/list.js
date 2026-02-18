const examples = [
  '01-support-check',
  '02-build-capabilities',
  '03-query-policy',
  '04-state-roundtrip',
  '05-safe-apply-pattern',
];

console.log('nono-ts examples');
console.log('');
for (const name of examples) {
  console.log(`- npm run example:js:${name}`);
  console.log(`- npm run example:ts:${name}`);
}
console.log('');
console.log('Run all safe examples: npm run example:all');
console.log('Run apply demo explicitly: NONO_APPLY=1 npm run example:js:05-safe-apply-pattern');
