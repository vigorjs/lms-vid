"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { categorySchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export async function createCategory(_state, formData) {
  try {
    await authorize(["ADMIN"]); const values = categorySchema.parse(Object.fromEntries(formData));
    let slug = slugify(values.name); let suffix = 1;
    while (await db.category.findUnique({ where: { slug } })) slug = `${slugify(values.name)}-${++suffix}`;
    await db.category.create({ data: { ...values, slug } }); revalidatePath("/admin/categories");
    return { ok: true, message: "Kategori berhasil dibuat." };
  } catch (error) { return { ok: false, message: error.message || "Gagal membuat kategori." }; }
}
export async function toggleCategory(formData) {
  await authorize(["ADMIN"]); const id = String(formData.get("id")); const category = await db.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { courses: { where: { status: "PUBLISHED" } } } } } });
  if (category.isActive && category._count.courses > 0) return;
  await db.category.update({ where: { id }, data: { isActive: !category.isActive } }); revalidatePath("/admin/categories");
}
