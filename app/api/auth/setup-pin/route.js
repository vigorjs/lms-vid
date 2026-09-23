import { hash, verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { pinSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { errorResponse, AppError } from "@/lib/errors";

const hashOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("Sesi tidak valid.", 401, "UNAUTHENTICATED");
    if (!user.needsPinSetup) throw new AppError("PIN sudah diatur.", 409, "PIN_ALREADY_SET");
    const input = await request.json();
    const pin = pinSchema.parse(input.pin);
    if (pin !== input.confirmPin) throw new AppError("Konfirmasi PIN tidak sama.", 400, "PIN_MISMATCH");
    if (user.mustChangePassword) {
      const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
      if (current.passwordHash && await verify(current.passwordHash, pin)) {
        throw new AppError("Pilih PIN selain PIN awal.", 400, "DEFAULT_PIN");
      }
    }
    const passwordHash = await hash(pin, hashOptions);
    const updated = await db.user.updateMany({
      where: { id: user.id, authVersion: user.authVersion, OR: [{ passwordHash: null }, { mustChangePassword: true }] },
      data: { passwordHash, mustChangePassword: false, authVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
    });
    if (!updated.count) throw new AppError("Sesi berubah. Silakan masuk kembali.", 409, "SESSION_CHANGED");
    const sessionUser = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, role: true, authVersion: true } });
    await createSession(sessionUser);
    return Response.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
