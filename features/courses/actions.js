"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { courseSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/errors";

async function uniqueSlug(title, excludeId) {
  const root = slugify(title); let slug = root; let suffix = 1;
  while (await db.course.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) slug = `${root}-${++suffix}`;
  return slug;
}
function parseCourse(formData) {
  const raw = Object.fromEntries(formData); let criteria = []; let studentIds = [];
  try {
    criteria = JSON.parse(String(formData.get("criteria") || "[]"));
    studentIds = JSON.parse(String(formData.get("studentIds") || "[]"));
  } catch {
    throw new Error("Data rubric atau assignment student tidak valid.");
  }
  const values = courseSchema.parse({ ...raw, criteria, studentIds });
  if (values.criteria.reduce((sum, item) => sum + item.weight, 0) !== 100) throw new Error("Total bobot rubric harus tepat 100%.");
  return values;
}

async function validatedStudentIds(values) {
  if (values.visibility === "PUBLIC") return [];
  const studentIds = [...new Set(values.studentIds)];
  if (!studentIds.length) return [];
  const students = await db.user.findMany({
    where: { id: { in: studentIds }, role: "STUDENT", status: "ACTIVE" },
    select: { id: true },
  });
  if (students.length !== studentIds.length) throw new Error("Salah satu student assignment tidak valid atau sudah nonaktif.");
  return studentIds;
}

function revalidateCoursePages(id) {
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  if (id) revalidatePath(`/teacher/courses/${id}/edit`);
}

export async function createCourse(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); const values = parseCourse(formData); const teacherId = actor.role === "ADMIN" ? values.teacherId : actor.id;
    if (!teacherId) throw new Error("Teacher wajib dipilih.");
    const teacher = await db.user.findFirst({ where: { id: teacherId, role: "TEACHER", status: "ACTIVE" } }); if (!teacher) throw new Error("Teacher tidak valid.");
    const studentIds = await validatedStudentIds(values);
    const course = await db.course.create({ data: { title: values.title, slug: await uniqueSlug(values.title), description: values.description, categoryId: values.categoryId, teacherId, visibility: values.visibility, passThreshold: values.passThreshold, rubricCriteria: { create: values.criteria.map((item, sortOrder) => ({ ...item, sortOrder })) }, assignments: { create: studentIds.map((studentId) => ({ studentId })) } } });
    revalidateCoursePages(course.id);
    return { ok: true, message: "Course berhasil dibuat.", redirectTo: `/teacher/courses/${course.id}/edit` };
  } catch (error) { return { ok: false, message: actionErrorMessage(error, "Gagal membuat course.") }; }
}
export async function updateCourse(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); const id = String(formData.get("id")); const course = await db.course.findUniqueOrThrow({ where: { id } }); if (!canManageCourse(actor, course)) throw new Error("Tidak diizinkan.");
    const values = parseCourse(formData); const teacherId = actor.role === "ADMIN" ? values.teacherId : actor.id;
    const studentIds = await validatedStudentIds(values);
    if (course.status === "PUBLISHED" && values.visibility === "ASSIGNED" && !studentIds.length) throw new Error("Course assigned yang sudah terbit wajib memiliki minimal satu student aktif.");
    const slug = await uniqueSlug(values.title, id);
    await db.course.update({
      where: { id },
      data: {
        title: values.title,
        slug,
        description: values.description,
        categoryId: values.categoryId,
        teacherId,
        visibility: values.visibility,
        passThreshold: values.passThreshold,
        rubricCriteria: {
          deleteMany: {},
          create: values.criteria.map((item, sortOrder) => ({ ...item, sortOrder })),
        },
        assignments: {
          deleteMany: {},
          create: studentIds.map((studentId) => ({ studentId })),
        },
      },
    });
    revalidateCoursePages(id); return { ok: true, message: "Course berhasil diperbarui." };
  } catch (error) { return { ok: false, message: actionErrorMessage(error, "Gagal memperbarui course.") }; }
}
export async function publishCourse(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); const id = String(formData.get("id")); const course = await db.course.findUniqueOrThrow({ where: { id }, include: { referenceVideo: true, rubricCriteria: true, category: true, assignments: { where: { student: { role: "STUDENT", status: "ACTIVE" } }, select: { id: true } } } });
    if (!canManageCourse(actor, course)) throw new Error("Anda tidak diizinkan mengelola course ini.");
    if (!course.category.isActive) throw new Error("Aktifkan kategori course terlebih dahulu.");
    if (course.referenceVideo?.status !== "READY") throw new Error("Reference video harus siap sebelum course diterbitkan.");
    if (!course.rubricCriteria.length || course.rubricCriteria.reduce((sum, item) => sum + item.weight, 0) !== 100) throw new Error("Total bobot rubric harus tepat 100%.");
    if (course.visibility === "ASSIGNED" && !course.assignments.length) throw new Error("Pilih minimal satu student aktif sebelum menerbitkan course assigned.");
    await db.course.update({ where: { id }, data: { status: "PUBLISHED", archivedAt: null } }); revalidateCoursePages(id);
    return { ok: true, message: "Course berhasil diterbitkan." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Gagal menerbitkan course.") };
  }
}
export async function archiveCourse(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); const id = String(formData.get("id")); const course = await db.course.findUniqueOrThrow({ where: { id } }); if (!canManageCourse(actor, course)) throw new Error("Anda tidak diizinkan mengelola course ini.");
    await db.course.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date() } }); revalidateCoursePages(id);
    return { ok: true, message: "Course berhasil diarsipkan." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Gagal mengarsipkan course.") };
  }
}
