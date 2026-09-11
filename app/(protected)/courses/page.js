import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/empty-state";
import { courseAccessWhere } from "@/lib/courses/access";

export const metadata = { title: "Course" };
export default async function CoursesPage() {
  const user = await requireUser();
  const where = courseAccessWhere(user);
  const courses = await db.course.findMany({ where, include: { category: true, teacher: true }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  const progressRows = user.role === "STUDENT" ? await db.watchProgress.findMany({ where: { studentId: user.id } }) : []; const progress = new Map(progressRows.map((item) => [item.courseId, item.percent]));
  return <><PageHeader eyebrow="Katalog pembelajaran" title="Temukan course" description="Pilih materi, amati video teacher, lalu bandingkan gerakan Anda." />{courses.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{courses.map((course) => <CourseCard key={course.id} course={course} progress={user.role === "STUDENT" ? progress.get(course.id) || 0 : undefined} />)}</div> : <EmptyState icon={BookOpen} title="Belum ada course tersedia" description="Course yang dipublikasikan teacher akan muncul di sini." />}</>;
}
