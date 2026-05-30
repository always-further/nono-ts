const scripts = [
	"01-support-check",
	"02-build-capabilities",
	"03-query-policy",
	"04-state-roundtrip",
	"05-safe-apply-pattern",
	"06-minimal-safe-cli",
	"07-agent-workspace-pattern",
	"08-failure-diagnostics",
	"09-config-roundtrip",
	"10-subprocess-inheritance",
];

console.log("nono-ts smoke tests");
console.log("");
for (const name of scripts) {
	console.log(`- node tests/smoke/js/${name}.js`);
	console.log(`- node --experimental-strip-types tests/smoke/ts/${name}.ts`);
}
console.log("");
console.log("Run all smoke tests: npm test");
console.log("Run demonstrator dry-run: npm run demo:dry-run");
console.log("Run demonstrator with sandbox apply: npm run demo");
