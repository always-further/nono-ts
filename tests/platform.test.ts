import { describe, expect, it } from "vitest";
import { isSupported, supportInfo } from "../index.js";

describe("platform", () => {
	it("isSupported returns a boolean", () => {
		expect(typeof isSupported()).toBe("boolean");
	});

	it("supportInfo returns expected fields", () => {
		const info = supportInfo();
		expect(typeof info.isSupported).toBe("boolean");
		expect(typeof info.platform).toBe("string");
		expect(info.platform.length).toBeGreaterThan(0);
		expect(typeof info.details).toBe("string");
	});

	it("supportInfo.isSupported matches isSupported()", () => {
		expect(supportInfo().isSupported).toBe(isSupported());
	});
});
