"use server";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { passwordSchema } from "@/lib/auth/schemas";
import { actionErrorMessage } from "@/lib/errors";

export async function updateProfile(_state, formData) {
  try {
    const user = await authorize(); const name = String(formData.get("name") || "").trim(); if (name.length < 2 || name.length > 100) throw new Error("Nama tidak valid.");
    const currentPassword = String(formData.get("currentPassword") || ""); const newPassword = String(formData.get("newPassword") || ""); const current = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const data = { name };
    if (newPassword) { if (!await verify(current.passwordHash, currentPassword)) throw new Error("Password saat ini salah."); data.passwordHash = await hash(passwordSchema.parse(newPassword), { memoryCost: 19456, timeCost: 2, parallelism: 1 }); data.authVersion = { increment: 1 }; data.mustChangePassword = false; }
    await db.user.update({ where: { id: user.id }, data }); return { ok: true, message: newPassword ? "Profil diperbarui. Silakan login kembali." : "Profil berhasil diperbarui.", logout: Boolean(newPassword) };
  } catch (error) { return { ok: false, message: actionErrorMessage(error, "Gagal memperbarui profil.") }; }
}
