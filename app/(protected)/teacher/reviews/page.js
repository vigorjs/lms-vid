import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Review Student" };
export default async function ReviewsPage() {
  const user = await requireUser(["ADMIN", "TEACHER"]); const submissions = await db.submission.findMany({ where: { status: { in: ["SUBMITTED", "REVIEWED"] }, ...(user.role === "TEACHER" ? { course: { teacherId: user.id } } : {}) }, include: { student: true, course: true, review: true }, orderBy: [{ status: "asc" }, { submittedAt: "asc" }] });
  return <><PageHeader eyebrow="Assessment" title="Review submission student" description="Bandingkan video, isi rubric, dan berikan feedback pada momen yang tepat." />{submissions.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Course</th><th>Attempt</th><th>Dikirim</th><th>Status</th><th>Nilai</th><th></th></tr></thead><tbody>{submissions.map((item) => <tr key={item.id}><td><strong className="text-slate-900">{item.student.name}</strong><span className="block text-xs text-slate-500">{item.student.email}</span></td><td>{item.course.title}</td><td>#{item.attemptNumber}</td><td>{formatDate(item.submittedAt)}</td><td><Badge tone={item.review?.outcome === "PASSED" ? "success" : item.review?.outcome === "REVISION_REQUIRED" ? "danger" : "warning"}>{item.review?.outcome || "MENUNGGU"}</Badge></td><td>{item.review?.finalScore?.toFixed(1) || "—"}</td><td><Link className="font-semibold text-cyan-700" href={`/teacher/reviews/${item.id}`}>{item.review ? "Perbarui" : "Review"} →</Link></td></tr>)}</tbody></table></div> : <EmptyState icon={ClipboardCheck} title="Tidak ada antrean review" description="Submission student yang dikirim akan muncul di sini." />}</>;
}
