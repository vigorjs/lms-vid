import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { readSession } from "./session";

export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session?.sub) return null;

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      authVersion: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE" || user.authVersion !== session.authVersion) return null;
  return user;
});

export async function requireUser(roles) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/unauthorized");
  return user;
}

export async function authorize(roles) {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Sesi tidak valid atau telah berakhir.", 401, "UNAUTHENTICATED");
  if (roles && !roles.includes(user.role)) {
    throw new AppError("Anda tidak memiliki izin untuk tindakan ini.", 403, "FORBIDDEN");
  }
  return user;
}

export function canManageCourse(user, course) {
  return user.role === "ADMIN" || (user.role === "TEACHER" && course.teacherId === user.id);
}
