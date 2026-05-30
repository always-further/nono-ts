import { describe, expect, it } from "vitest";
import { AccessMode, CapabilitySet, SandboxState } from "../../index.js";

describe("SandboxState", () => {
	it("serializes and restores capabilities", () => {
		const caps = new CapabilitySet();
		caps.allowPath("/tmp", AccessMode.Read);
		caps.blockNetwork();

		const json = SandboxState.fromCaps(caps).toJson();
		expect(typeof json).toBe("string");
		expect(json.length).toBeGreaterThan(0);

		const restored = SandboxState.fromJson(json).toCaps();
		expect(restored.isNetworkBlocked).toBe(true);
		expect(restored.fsCapabilities().length).toBe(1);
	});

	it("netBlocked reflects blockNetwork()", () => {
		const caps = new CapabilitySet();
		caps.blockNetwork();
		const state = SandboxState.fromCaps(caps);
		expect(state.netBlocked).toBe(true);
	});

	it("roundtrip preserves path access", () => {
		const caps = new CapabilitySet();
		caps.allowPath("/tmp", AccessMode.ReadWrite);

		const restored = SandboxState.fromJson(
			SandboxState.fromCaps(caps).toJson(),
		).toCaps();
		const fc = restored.fsCapabilities()[0];
		expect(fc.access).toBe("read+write");
	});
});
