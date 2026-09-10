import { beforeAll, describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/auth/token";

beforeAll(() => { process.env.JWT_SECRET = "unit-test-secret-with-at-least-32-characters"; });
describe("JWT session", () => {
  it("round-trips minimal claims", async () => { const token = await signSessionToken({ id: "user-1", role: "STUDENT", authVersion: 3 }); const payload = await verifySessionToken(token); expect(payload.sub).toBe("user-1"); expect(payload.role).toBe("STUDENT"); expect(payload.authVersion).toBe(3); });
  it("rejects malformed tokens", async () => { expect(await verifySessionToken("not-a-jwt")).toBeNull(); });
});
