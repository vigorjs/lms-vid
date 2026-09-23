"use server";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { pinSchema } from "@/lib/auth/schemas";
import { actionErrorMessage } from "@/lib/errors";

export async function updateProfile(_state, formData) {
  try {
    const user = await authorize(); const name = String(formData.get("name") || "").trim(); if (name.length < 2 || name.length > 100) throw new Error("Nama tidak valid.");
    const currentPin = String(formData.get("currentPin") || ""); const newPin = String(formData.get("newPin") || ""); const current = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const data = { name };
    if (newPin) { if (!current.passwordHash || !await verify(current.passwordHash, currentPin)) throw new Error("PIN saat ini salah."); data.passwordHash = await hash(pinSchema.parse(newPin), { memoryCost: 19456, timeCost: 2, parallelism: 1 }); data.authVersion = { increment: 1 }; data.mustChangePassword = false; }
    await db.user.update({ where: { id: user.id }, data }); return { ok: true, message: newPin ? "Profil diperbarui. Silakan masuk kembali." : "Profil berhasil diperbarui.", logout: Boolean(newPin) };
  } catch (error) { return { ok: false, message: actionErrorMessage(error, "Gagal memperbarui profil.") }; }
}
