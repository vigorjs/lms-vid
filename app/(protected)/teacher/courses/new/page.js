import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CourseForm } from "@/components/courses/course-form";

export const metadata = { title: "Course Baru" };
export default async function NewCoursePage() {
  const user = await requireUser(["ADMIN", "TEACHER"]); const [categories, teachers] = await Promise.all([db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }), user.role === "ADMIN" ? db.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { name: "asc" } }) : Promise.resolve([])]);
  return <><PageHeader eyebrow="Course builder" title="Buat course baru" description="Susun informasi dasar dan rubric terlebih dahulu. Video referensi diupload setelah course tersimpan." /><Card><CardContent><CourseForm categories={categories} teachers={teachers} isAdmin={user.role === "ADMIN"} /></CardContent></Card></>;
}
