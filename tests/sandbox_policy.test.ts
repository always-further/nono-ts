import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	AccessMode,
	CapabilitySet,
	isSupported,
	QueryContext,
	SandboxState,
	supportInfo,
} from "../index.js";

let tmpBase: string;
let pluginDir: string;
let outputDir: string;
let secretDir: string;
let configFile: string;

beforeAll(() => {
	tmpBase = realpathSync(mkdtempSync(join(tmpdir(), "nono-test-")));
	pluginDir = join(tmpBase, "plugins");
	outputDir = join(tmpBase, "output");
	secretDir = join(tmpBase, "secrets");
	mkdirSync(pluginDir);
	mkdirSync(outputDir);
	mkdirSync(secretDir);
	configFile = join(tmpBase, "plugin.conf");
	writeFileSync(configFile, "max_memory=128m\n");
});

afterAll(() => {
	rmSync(tmpBase, { recursive: true });
});

describe("capability set construction", () => {
	it("builds a capability set without throwing", () => {
		const caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		caps.allowPath(outputDir, AccessMode.ReadWrite);
		caps.allowFile(configFile, AccessMode.Read);
		caps.blockNetwork();
		caps.blockCommand("curl");
		caps.allowCommand("node");
		expect(caps.fsCapabilities().length).toBe(3);
		expect(caps.isNetworkBlocked).toBe(true);
	});
});

describe("filesystem capabilities", () => {
	it("registers the correct number of capabilities", () => {
		const caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		caps.allowPath(outputDir, AccessMode.ReadWrite);
		caps.allowFile(configFile, AccessMode.Read);
		expect(caps.fsCapabilities().length).toBe(3);
	});

	it("pathCovered returns true for a path inside a granted directory", () => {
		const caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		expect(caps.pathCovered(join(pluginDir, "init.js"))).toBe(true);
	});

	it("pathCovered returns false for an ungrated path", () => {
		const caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		expect(caps.pathCovered(join(secretDir, "key.pem"))).toBe(false);
	});
});

describe("QueryContext policy audit", () => {
	let caps: CapabilitySet;
	let ctx: QueryContext;

	beforeAll(() => {
		caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		caps.allowPath(outputDir, AccessMode.ReadWrite);
		caps.allowFile(configFile, AccessMode.Read);
		caps.blockNetwork();
		ctx = new QueryContext(caps);
	});

	it("allows reading inside pluginDir", () => {
		expect(
			ctx.queryPath(join(pluginDir, "init.js"), AccessMode.Read).status,
		).toBe("allowed");
	});

	it("allows writing inside outputDir", () => {
		expect(
			ctx.queryPath(join(outputDir, "result.json"), AccessMode.Write).status,
		).toBe("allowed");
	});

	it("allows reading the single-file config grant", () => {
		expect(ctx.queryPath(configFile, AccessMode.Read).status).toBe("allowed");
	});

	it("denies writing inside pluginDir", () => {
		expect(
			ctx.queryPath(join(pluginDir, "evil.js"), AccessMode.Write).status,
		).toBe("denied");
	});

	it("denies reading inside secretDir", () => {
		expect(
			ctx.queryPath(join(secretDir, "key.pem"), AccessMode.Read).status,
		).toBe("denied");
	});

	it("denies network access", () => {
		expect(ctx.queryNetwork().status).toBe("denied");
	});
});

describe("deduplication", () => {
	it("collapses redundant grants", () => {
		const caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		caps.allowPath(outputDir, AccessMode.ReadWrite);
		caps.allowFile(configFile, AccessMode.Read);
		caps.allowPath(pluginDir, AccessMode.Read);
		expect(caps.fsCapabilities().length).toBe(4);
		caps.deduplicate();
		expect(caps.fsCapabilities().length).toBe(3);
	});
});

describe("SandboxState serialization roundtrip", () => {
	it("restores an equivalent policy from JSON", () => {
		const caps = new CapabilitySet();
		caps.allowPath(pluginDir, AccessMode.Read);
		caps.allowPath(outputDir, AccessMode.ReadWrite);
		caps.allowFile(configFile, AccessMode.Read);
		caps.blockNetwork();

		const state = SandboxState.fromCaps(caps);
		expect(state.netBlocked).toBe(true);

		const restored = SandboxState.fromJson(state.toJson()).toCaps();
		expect(restored.isNetworkBlocked).toBe(true);
		expect(restored.fsCapabilities().length).toBe(3);

		const ctx = new QueryContext(restored);
		expect(
			ctx.queryPath(join(pluginDir, "init.js"), AccessMode.Read).status,
		).toBe("allowed");
		expect(
			ctx.queryPath(join(secretDir, "key.pem"), AccessMode.Read).status,
		).toBe("denied");
		expect(ctx.queryNetwork().status).toBe("denied");
	});
});

describe("platform support", () => {
	it("supportInfo reflects the current platform", () => {
		const info = supportInfo();
		expect(typeof info.platform).toBe("string");
		expect(typeof info.isSupported).toBe("boolean");
		expect(info.isSupported).toBe(isSupported());
	});
});
