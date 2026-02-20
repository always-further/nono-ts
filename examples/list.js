const examples = [
  '01-support-check',
  '02-build-capabilities',
  '03-query-policy',
  '04-state-roundtrip',
  '05-safe-apply-pattern',
  '06-minimal-safe-cli',
  '07-agent-workspace-pattern',
  '08-failure-diagnostics',
  '09-config-roundtrip',
  '10-subprocess-inheritance',
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
console.log('Run demonstrator dry-run: npm run demo:dry-run');
console.log('Run demonstrator with sandbox apply: npm run demo');
