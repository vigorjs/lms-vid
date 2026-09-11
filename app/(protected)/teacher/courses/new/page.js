import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CourseForm } from "@/components/courses/course-form";

export const metadata = { title: "Course Baru" };
export default async function NewCoursePage() {
  const user = await requireUser(["ADMIN", "TEACHER"]); const [categories, teachers, students] = await Promise.all([db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }), user.role === "ADMIN" ? db.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { name: "asc" } }) : Promise.resolve([]), db.user.findMany({ where: { role: "STUDENT", status: "ACTIVE" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } })]);
  return <><PageHeader eyebrow="Course builder" title="Buat course baru" description="Susun informasi dasar, akses student, dan rubric. Video referensi diupload setelah course tersimpan." /><Card><CardContent><CourseForm categories={categories} teachers={teachers} students={students} isAdmin={user.role === "ADMIN"} /></CardContent></Card></>;
}
