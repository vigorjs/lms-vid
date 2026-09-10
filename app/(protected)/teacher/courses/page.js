import Link from "next/link";
import { Plus, Video } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Course Saya" };
export default async function TeacherCoursesPage() {
  const user = await requireUser(["ADMIN", "TEACHER"]); const courses = await db.course.findMany({ where: user.role === "ADMIN" ? {} : { teacherId: user.id }, include: { category: true, referenceVideo: true, _count: { select: { enrollments: true, submissions: true } } }, orderBy: { updatedAt: "desc" } });
  return <><PageHeader eyebrow="Teacher workspace" title={user.role === "ADMIN" ? "Kelola seluruh course" : "Course saya"} description="Atur materi, rubric, video referensi, dan status publikasi." actions={<Link href="/teacher/courses/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold"><Plus size={18} /> Course baru</Link>} />{courses.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Course</th><th>Status</th><th>Video</th><th>Learner</th><th>Submission</th><th></th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong className="block text-slate-900">{course.title}</strong><span className="text-xs text-slate-500">{course.category.name}</span></td><td><Badge tone={course.status === "PUBLISHED" ? "success" : course.status === "DRAFT" ? "warning" : "neutral"}>{course.status}</Badge></td><td><Badge tone={course.referenceVideo?.status === "READY" ? "success" : "neutral"}>{course.referenceVideo ? course.referenceVideo.status : "Belum ada"}</Badge></td><td>{course._count.enrollments}</td><td>{course._count.submissions}</td><td><Link className="font-semibold text-cyan-700" href={`/teacher/courses/${course.id}/edit`}>Kelola →</Link></td></tr>)}</tbody></table></div> : <EmptyState icon={Video} title="Belum ada course" description="Buat course, susun rubric, lalu upload video demonstrasi." />}</>;
}
