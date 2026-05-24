import { describe, expect, it } from "vitest";
import { AccessMode, CapabilitySet, QueryContext } from "../index.js";

describe("QueryContext", () => {
	it("allows a path that was granted", () => {
		const caps = new CapabilitySet();
		caps.allowPath("/tmp", AccessMode.ReadWrite);
		const ctx = new QueryContext(caps);
		expect(ctx.queryPath("/tmp/test.txt", AccessMode.Read).status).toBe(
			"allowed",
		);
	});

	it("denies a path that was not granted", () => {
		const caps = new CapabilitySet();
		caps.allowPath("/tmp", AccessMode.ReadWrite);
		const ctx = new QueryContext(caps);
		expect(ctx.queryPath("/etc/passwd", AccessMode.Read).status).toBe("denied");
	});

	it("denies write when only read was granted", () => {
		const caps = new CapabilitySet();
		caps.allowPath("/tmp", AccessMode.Read);
		const ctx = new QueryContext(caps);
		expect(ctx.queryPath("/tmp/out.txt", AccessMode.Write).status).toBe(
			"denied",
		);
	});

	it("allows network when not blocked", () => {
		const caps = new CapabilitySet();
		const ctx = new QueryContext(caps);
		expect(ctx.queryNetwork().status).toBe("allowed");
	});

	it("denies network when blocked", () => {
		const caps = new CapabilitySet();
		caps.blockNetwork();
		const ctx = new QueryContext(caps);
		expect(ctx.queryNetwork().status).toBe("denied");
	});
});
