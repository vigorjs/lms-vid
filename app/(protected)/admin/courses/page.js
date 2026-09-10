import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/empty-state";
import { Video } from "lucide-react";

export const metadata = { title: "Semua Course" };
export default async function AdminCoursesPage() {
  await requireUser(["ADMIN"]); const courses = await db.course.findMany({ include: { category: true, teacher: true }, orderBy: { updatedAt: "desc" } });
  return <><PageHeader eyebrow="Audit katalog" title="Semua course" description="Admin memiliki akses penuh untuk membuka dan mengubah course dari seluruh teacher." actions={<Link href="/teacher/courses/new" className="inline-flex h-11 items-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold">Buat course</Link>} />{courses.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <EmptyState icon={Video} title="Belum ada course" description="Buat course pertama untuk memulai katalog." />}</>;
}
