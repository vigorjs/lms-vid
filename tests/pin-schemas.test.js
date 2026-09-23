import { describe, expect, it } from "vitest";
import { loginSchema, pinSchema, registrationSchema } from "@/lib/auth/schemas";

describe("email and PIN input", () => {
  it("accepts exactly six numeric characters, including leading zeroes", () => {
    expect(pinSchema.parse("012345")).toBe("012345");
    for (const invalid of ["12345", "1234567", "12345a", "１２３４５６", 123456]) {
      expect(pinSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("normalizes an email and permits registration without a name", () => {
    expect(registrationSchema.parse({ email: "  Siti@School.test  " }).email).toBe("siti@school.test");
    expect(registrationSchema.parse({ email: "siti@school.test" }).name).toBeUndefined();
    expect(loginSchema.safeParse({ email: "siti@school.test", pin: "123456" }).success).toBe(true);
  });
});
