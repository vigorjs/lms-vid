"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { courseSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

async function uniqueSlug(title, excludeId) {
  const root = slugify(title); let slug = root; let suffix = 1;
  while (await db.course.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) slug = `${root}-${++suffix}`;
  return slug;
}
function parseCourse(formData) {
  const raw = Object.fromEntries(formData); let criteria = [];
  try { criteria = JSON.parse(String(formData.get("criteria") || "[]")); } catch {}
  const values = courseSchema.parse({ ...raw, criteria });
  if (values.criteria.reduce((sum, item) => sum + item.weight, 0) !== 100) throw new Error("Total bobot rubric harus tepat 100%.");
  return values;
}
export async function createCourse(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); const values = parseCourse(formData); const teacherId = actor.role === "ADMIN" ? values.teacherId : actor.id;
    if (!teacherId) throw new Error("Teacher wajib dipilih.");
    const teacher = await db.user.findFirst({ where: { id: teacherId, role: "TEACHER", status: "ACTIVE" } }); if (!teacher) throw new Error("Teacher tidak valid.");
    const course = await db.course.create({ data: { title: values.title, slug: await uniqueSlug(values.title), description: values.description, categoryId: values.categoryId, teacherId, passThreshold: values.passThreshold, rubricCriteria: { create: values.criteria.map((item, sortOrder) => ({ ...item, sortOrder })) } } });
    redirect(`/teacher/courses/${course.id}/edit`);
  } catch (error) { if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error; return { ok: false, message: error.message || "Gagal membuat course." }; }
}
export async function updateCourse(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); const id = String(formData.get("id")); const course = await db.course.findUniqueOrThrow({ where: { id } }); if (!canManageCourse(actor, course)) throw new Error("Tidak diizinkan.");
    const values = parseCourse(formData); const teacherId = actor.role === "ADMIN" ? values.teacherId : actor.id;
    await db.$transaction(async (tx) => {
      await tx.rubricCriterion.deleteMany({ where: { courseId: id } });
      await tx.course.update({ where: { id }, data: { title: values.title, slug: await uniqueSlug(values.title, id), description: values.description, categoryId: values.categoryId, teacherId, passThreshold: values.passThreshold, rubricCriteria: { create: values.criteria.map((item, sortOrder) => ({ ...item, sortOrder })) } } });
    });
    revalidatePath(`/teacher/courses/${id}/edit`); return { ok: true, message: "Course berhasil diperbarui." };
  } catch (error) { return { ok: false, message: error.message || "Gagal memperbarui course." }; }
}
export async function publishCourse(formData) {
  const actor = await authorize(["ADMIN", "TEACHER"]); const id = String(formData.get("id")); const course = await db.course.findUniqueOrThrow({ where: { id }, include: { referenceVideo: true, rubricCriteria: true, category: true } });
  if (!canManageCourse(actor, course)) return; if (!course.category.isActive || course.referenceVideo?.status !== "READY" || !course.rubricCriteria.length || course.rubricCriteria.reduce((sum, item) => sum + item.weight, 0) !== 100) return;
  await db.course.update({ where: { id }, data: { status: "PUBLISHED", archivedAt: null } }); revalidatePath("/courses"); revalidatePath(`/teacher/courses/${id}/edit`);
}
export async function archiveCourse(formData) {
  const actor = await authorize(["ADMIN", "TEACHER"]); const id = String(formData.get("id")); const course = await db.course.findUniqueOrThrow({ where: { id } }); if (!canManageCourse(actor, course)) return;
  await db.course.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date() } }); revalidatePath("/courses"); revalidatePath("/teacher/courses");
}
