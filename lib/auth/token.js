import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET wajib dikonfigurasi pada production.");
  }
  return encoder.encode(value || "development-only-secret-change-me-32chars");
}

export async function signSessionToken(user) {
  return new SignJWT({ role: user.role, authVersion: user.authVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || !payload.role || !payload.authVersion) return null;
    return payload;
  } catch {
    return null;
  }
}
