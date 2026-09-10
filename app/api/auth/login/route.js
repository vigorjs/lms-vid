import { verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { errorResponse, AppError } from "@/lib/errors";

export async function POST(request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    const now = new Date();
    if (!user || user.status !== "ACTIVE") throw new AppError("Email atau password salah.", 401, "INVALID_CREDENTIALS");
    if (user.lockedUntil && user.lockedUntil > now) throw new AppError("Akun terkunci sementara. Coba kembali beberapa menit lagi.", 423, "ACCOUNT_LOCKED");

    const valid = await verify(user.passwordHash, input.password);
    if (!valid) {
      const failures = user.failedLoginCount + 1;
      await db.user.update({ where: { id: user.id }, data: { failedLoginCount: failures >= 5 ? 0 : failures, lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null } });
      throw new AppError("Email atau password salah.", 401, "INVALID_CREDENTIALS");
    }
    const sessionUser = await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
      select: { id: true, role: true, authVersion: true, name: true },
    });
    await createSession(sessionUser);
    return Response.json({ data: { name: sessionUser.name, role: sessionUser.role } });
  } catch (error) {
    return errorResponse(error);
  }
}
