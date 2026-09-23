"use server";
import { hash } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { pinSchema, userSchema } from "@/lib/auth/schemas";
import { actionErrorMessage } from "@/lib/errors";

const hashOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
export async function createUser(_state, formData) {
  try {
    await authorize(["ADMIN"]);
    const values = userSchema.parse(Object.fromEntries(formData));
    const passwordHash = await hash("696969", hashOptions);
    await db.user.create({ data: { name: values.name, email: values.email, role: values.role, passwordHash, mustChangePassword: true } });
    revalidatePath("/admin/users"); return { ok: true, message: "Pengguna berhasil dibuat." };
  } catch (error) { return { ok: false, message: error.code === "P2002" ? "Email sudah digunakan." : actionErrorMessage(error, "Gagal membuat pengguna.") }; }
}
export async function updateUserStatus(_state, formData) {
  try {
    const actor = await authorize(["ADMIN"]); const id = String(formData.get("id")); const status = String(formData.get("status"));
    if (!["ACTIVE", "INACTIVE"].includes(status)) throw new Error("Status pengguna tidak valid.");
    if (actor.id === id && status === "INACTIVE") throw new Error("Anda tidak dapat menonaktifkan akun sendiri.");
    const target = await db.user.findUniqueOrThrow({ where: { id } });
    if (target.role === "ADMIN" && status === "INACTIVE") {
      const activeAdmins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (activeAdmins <= 1) throw new Error("Admin aktif terakhir tidak dapat dinonaktifkan.");
    }
    await db.user.update({ where: { id }, data: { status, authVersion: { increment: 1 } } }); revalidatePath("/admin/users");
    return { ok: true, message: status === "ACTIVE" ? "Pengguna berhasil diaktifkan." : "Pengguna berhasil dinonaktifkan." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Gagal memperbarui status pengguna.") };
  }
}
export async function resetUserPin(_state, formData) {
  try {
    await authorize(["ADMIN"]); const id = String(formData.get("id")); const pin = pinSchema.parse(formData.get("pin"));
    await db.user.update({ where: { id }, data: { passwordHash: await hash(pin, hashOptions), mustChangePassword: true, authVersion: { increment: 1 } } });
    return { ok: true, message: "PIN berhasil direset." };
  } catch (error) { return { ok: false, message: actionErrorMessage(error, "Gagal mereset PIN.") }; }
}
