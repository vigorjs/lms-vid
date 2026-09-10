import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { BookOpen, CheckCircle2, ClipboardCheck, Scissors, UploadCloud, UserRound } from "lucide-react";
import { requireUser, canManageCourse } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ActionButtonForm } from "@/components/form-feedback";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SynchronizedPlayer } from "@/components/video/synchronized-player";
import { VideoUploader } from "@/components/video/video-uploader";
import { TrimEditor } from "@/components/video/trim-editor";
import { StudentFeedback } from "@/components/reviews/student-feedback";
import { submitAttempt } from "@/features/submissions/actions";
import { formatDate } from "@/lib/utils";
import { getCourseCoverUrl } from "@/lib/image/url";

export default async function CourseDetailPage({ params }) {
  const user = await requireUser(); const { courseId } = await params;
  const course = await db.course.findUnique({ where: { id: courseId }, include: { category: true, teacher: true, referenceVideo: true, rubricCriteria: { orderBy: { sortOrder: "asc" } } } }); if (!course) notFound();
  if (user.role === "STUDENT" && course.status !== "PUBLISHED") notFound();
  if (user.role === "TEACHER" && course.status !== "PUBLISHED" && !canManageCourse(user, course)) redirect("/unauthorized");
  let submissions = [];
  if (user.role === "STUDENT") {
    await db.enrollment.upsert({ where: { courseId_studentId: { courseId, studentId: user.id } }, create: { courseId, studentId: user.id }, update: { lastOpenedAt: new Date() } });
    submissions = await db.submission.findMany({ where: { courseId, studentId: user.id }, include: { activeVideo: true, originalVideo: true, review: { include: { scores: true, comments: { orderBy: { timestampSeconds: "asc" } } } } }, orderBy: { attemptNumber: "desc" } });
  }
  const active = submissions.find((item) => item.status === "DRAFT") || submissions[0]; const canPractice = user.role === "STUDENT" && course.referenceVideo?.status === "READY"; const coverUrl = getCourseCoverUrl(course);
  return <><PageHeader eyebrow={`${course.category.name} · ${course.status}`} title={course.title} description={course.description} actions={canManageCourse(user, course) ? <Link href={`/teacher/courses/${course.id}/edit`} className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Kelola course</Link> : null} />
    {coverUrl ? <div className="relative mb-5 h-44 overflow-hidden rounded-2xl bg-slate-900 shadow-sm md:h-64"><Image src={coverUrl} alt={`Cover ${course.title}`} fill sizes="100vw" className="object-cover" priority unoptimized /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" /></div> : null}
    <div className="mb-5 flex flex-wrap gap-2"><Badge tone="info"><UserRound size={13} className="mr-1" /> {course.teacher.name}</Badge><Badge tone="neutral"><BookOpen size={13} className="mr-1" /> {course.rubricCriteria.length} kriteria</Badge><Badge tone="success">Nilai lulus {course.passThreshold}</Badge></div>
    {course.referenceVideo?.status === "READY" ? <SynchronizedPlayer referenceAssetId={course.referenceVideo.id} studentAssetId={active?.activeVideoId} courseId={course.id} trackProgress={user.role === "STUDENT"} /> : <Card><CardContent className="py-12 text-center text-slate-500">Video referensi belum tersedia.</CardContent></Card>}
    {canPractice ? <div className="mt-7 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><div className="grid content-start gap-6">{active?.status === "DRAFT" ? <Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Scissors size={20}/></span><div><h2 className="font-bold">Trim video attempt {active.attemptNumber}</h2><p className="text-xs text-slate-500">Original tetap tersimpan; hasil menjadi versi aktif.</p></div></div></CardHeader><CardContent><TrimEditor courseId={course.id} submissionId={active.id} sourceAssetId={active.activeVideoId} durationSeconds={active.activeVideo.durationSeconds} sourceSizeBytes={active.activeVideo.sizeBytes} /></CardContent></Card> : null}{active?.review ? <StudentFeedback review={active.review} threshold={course.passThreshold} /> : null}</div>
      <div className="grid content-start gap-5"><Card><CardHeader><h2 className="font-bold">Attempt latihan</h2></CardHeader><CardContent>{active?.status === "DRAFT" ? <div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Draft aktif</p><strong>Attempt {active.attemptNumber}</strong><p className="mt-1 text-xs text-slate-500">Dibuat {formatDate(active.createdAt)}</p></div><ActionButtonForm action={submitAttempt} fields={{ id: active.id }} pendingLabel="Mengirim…" className="mt-4 w-full"><ClipboardCheck size={17}/> Kirim untuk direview</ActionButtonForm><p className="mt-2 text-xs leading-5 text-slate-500">Setelah dikirim, attempt tidak dapat diedit. Teacher hanya melihat attempt yang sudah dikirim.</p></div> : <div><VideoUploader courseId={course.id} purpose="STUDENT_ORIGINAL" compact /><p className="mt-3 text-xs text-slate-500">Upload membuat attempt draft baru.</p></div>}</CardContent></Card>
        {submissions.length ? <Card><CardHeader><h2 className="font-bold">Riwayat attempt</h2></CardHeader><CardContent className="grid gap-2">{submissions.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><strong className="text-sm">Attempt {item.attemptNumber}</strong><p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p></div><Badge tone={item.review?.outcome === "PASSED" ? "success" : item.review?.outcome === "REVISION_REQUIRED" ? "danger" : item.status === "SUBMITTED" ? "warning" : "neutral"}>{item.review?.outcome || item.status}</Badge></div>)}</CardContent></Card> : null}
        <Card><CardHeader><h2 className="font-bold">Rubric course</h2></CardHeader><CardContent className="grid gap-2">{course.rubricCriteria.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><strong className="text-sm">{item.title}</strong>{item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}</div><span className="font-bold text-cyan-700">{item.weight}%</span></div>)}</CardContent></Card>
      </div></div> : user.role === "STUDENT" ? <Card className="mt-6"><CardContent className="flex items-center gap-3 text-sm text-slate-600"><UploadCloud /> Teacher perlu mengupload reference video sebelum Anda dapat berlatih.</CardContent></Card> : null}
  </>;
}
