"use server";
import { hash } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { passwordSchema, userSchema } from "@/lib/auth/schemas";

const hashOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
export async function createUser(_state, formData) {
  try {
    await authorize(["ADMIN"]);
    const values = userSchema.extend({ password: passwordSchema }).parse(Object.fromEntries(formData));
    const passwordHash = await hash(values.password, hashOptions);
    await db.user.create({ data: { name: values.name, email: values.email, role: values.role, passwordHash, mustChangePassword: true } });
    revalidatePath("/admin/users"); return { ok: true, message: "Pengguna berhasil dibuat." };
  } catch (error) { return { ok: false, message: error.code === "P2002" ? "Email sudah digunakan." : error.message || "Gagal membuat pengguna." }; }
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
    return { ok: false, message: error.message || "Gagal memperbarui status pengguna." };
  }
}
export async function resetUserPassword(_state, formData) {
  try {
    await authorize(["ADMIN"]); const id = String(formData.get("id")); const password = passwordSchema.parse(formData.get("password"));
    await db.user.update({ where: { id }, data: { passwordHash: await hash(password, hashOptions), mustChangePassword: true, authVersion: { increment: 1 } } });
    return { ok: true, message: "Password berhasil direset." };
  } catch (error) { return { ok: false, message: error.message || "Gagal mereset password." }; }
}
