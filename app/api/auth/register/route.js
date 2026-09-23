import { db } from "@/lib/db";
import { registrationSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { errorResponse, AppError } from "@/lib/errors";

export async function POST(request) {
  try {
    const input = registrationSchema.parse(await request.json());
    const name = input.name || input.email.split("@")[0];
    let user = await db.user.findUnique({ where: { email: input.email } });
    if (user) {
      if (user.role !== "STUDENT" || user.status !== "ACTIVE" || user.passwordHash) {
        throw new AppError("Email sudah terdaftar. Silakan masuk.", 409, "EMAIL_EXISTS");
      }
      const updated = await db.user.updateMany({
        where: { id: user.id, passwordHash: null, role: "STUDENT", status: "ACTIVE" },
        data: { name, authVersion: { increment: 1 } },
      });
      if (!updated.count) throw new AppError("Email sudah terdaftar. Silakan masuk.", 409, "EMAIL_EXISTS");
      user = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    } else {
      user = await db.user.create({ data: { email: input.email, name, role: "STUDENT", passwordHash: null } });
    }
    await createSession(user);
    return Response.json({ data: { name: user.name } }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") return errorResponse(new AppError("Email sudah terdaftar. Silakan masuk.", 409, "EMAIL_EXISTS"));
    return errorResponse(error);
  }
}
