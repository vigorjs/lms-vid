import { notFound, redirect } from "next/navigation";
import { requireUser, canManageCourse } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";

export default async function ReviewDetailPage({ params }) {
  const user = await requireUser(["ADMIN", "TEACHER"]); const { submissionId } = await params; const submission = await db.submission.findUnique({ where: { id: submissionId }, include: { student: true, activeVideo: true, course: { include: { rubricCriteria: { orderBy: { sortOrder: "asc" } } }, }, review: { include: { scores: true, comments: { orderBy: { timestampSeconds: "asc" } } } } } });
  if (!submission || !["SUBMITTED", "REVIEWED"].includes(submission.status)) notFound(); if (!canManageCourse(user, submission.course)) redirect("/unauthorized");
  return <><PageHeader eyebrow={`${submission.course.title} · Attempt ${submission.attemptNumber}`} title={`Review ${submission.student.name}`} description="Gunakan player sinkron untuk membandingkan reference dan video student sebelum memberi nilai." actions={<Badge tone={submission.review?.outcome === "PASSED" ? "success" : submission.review?.outcome === "REVISION_REQUIRED" ? "danger" : "warning"}>{submission.review?.outcome || "MENUNGGU"}</Badge>} /><ReviewWorkspace submission={submission} /></>;
}
