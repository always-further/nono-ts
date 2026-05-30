import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function run(args: string[], env: Record<string, string> = {}) {
	return spawnSync(process.execPath, args, {
		cwd: root,
		env: { ...process.env, ...env },
		encoding: "utf8",
		timeout: 30_000,
	});
}

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
];

const applyScripts = ["10-subprocess-inheritance"];

describe("smoke: JS", () => {
	for (const name of scripts) {
		it(name, () => {
			const result = run([join("tests/smoke/js", `${name}.js`)]);
			expect(result.status, result.stderr).toBe(0);
		});
	}

	for (const name of applyScripts) {
		it(`${name} (NONO_APPLY=1)`, () => {
			const result = run([join("tests/smoke/js", `${name}.js`)], {
				NONO_APPLY: "1",
			});
			expect(result.status, result.stderr).toBe(0);
		});
	}
});

describe("smoke: TS", () => {
	for (const name of scripts) {
		it(name, () => {
			const result = run([
				"--experimental-strip-types",
				join("tests/smoke/ts", `${name}.ts`),
			]);
			expect(result.status, result.stderr).toBe(0);
		});
	}

	for (const name of applyScripts) {
		it(`${name} (NONO_APPLY=1)`, () => {
			const result = run(
				["--experimental-strip-types", join("tests/smoke/ts", `${name}.ts`)],
				{ NONO_APPLY: "1" },
			);
			expect(result.status, result.stderr).toBe(0);
		});
	}
});
