import { notFound, redirect } from "next/navigation";
import { Archive, CheckCircle2, UploadCloud } from "lucide-react";
import { requireUser, canManageCourse } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseForm } from "@/components/courses/course-form";
import { VideoUploader } from "@/components/video/video-uploader";
import { archiveCourse, publishCourse } from "@/features/courses/actions";
import { formatBytes, formatDuration } from "@/lib/utils";

export default async function EditCoursePage({ params }) {
  const user = await requireUser(["ADMIN", "TEACHER"]); const { courseId } = await params; const course = await db.course.findUnique({ where: { id: courseId }, include: { rubricCriteria: { orderBy: { sortOrder: "asc" } }, referenceVideo: true } }); if (!course) notFound(); if (!canManageCourse(user, course)) redirect("/unauthorized");
  const [categories, teachers] = await Promise.all([db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }), user.role === "ADMIN" ? db.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { name: "asc" } }) : Promise.resolve([])]);
  const publishReady = course.referenceVideo?.status === "READY" && course.rubricCriteria.length && course.rubricCriteria.reduce((sum,item) => sum + item.weight,0) === 100;
  return <><PageHeader eyebrow="Course builder" title={`Kelola ${course.title}`} description="Perbarui detail, rubric, reference video, dan status publikasi." actions={<Badge tone={course.status === "PUBLISHED" ? "success" : course.status === "DRAFT" ? "warning" : "neutral"}>{course.status}</Badge>} /><div className="grid gap-6 xl:grid-cols-[1fr_420px]"><Card><CardHeader><h2 className="font-bold">Informasi dan rubric</h2></CardHeader><CardContent><CourseForm course={course} categories={categories} teachers={teachers} isAdmin={user.role === "ADMIN"} /></CardContent></Card><div className="grid content-start gap-5"><Card><CardHeader><h2 className="font-bold">Reference video</h2></CardHeader><CardContent>{course.referenceVideo ? <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><CheckCircle2 className="text-emerald-600"/><div className="min-w-0"><strong className="block truncate text-sm">{course.referenceVideo.originalName}</strong><span className="text-xs text-emerald-700">{formatDuration(course.referenceVideo.durationSeconds)} · {formatBytes(course.referenceVideo.sizeBytes)}</span></div></div> : <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><UploadCloud className="mb-2"/>Belum ada video demonstrasi.</div>}<VideoUploader courseId={course.id} purpose="REFERENCE" compact /></CardContent></Card><Card><CardHeader><h2 className="font-bold">Publikasi</h2></CardHeader><CardContent className="grid gap-3"><p className="text-sm leading-6 text-slate-500">Course dapat diterbitkan setelah reference video siap dan total rubric 100%.</p>{course.status !== "PUBLISHED" ? <form action={publishCourse}><input type="hidden" name="id" value={course.id}/><Button className="w-full" disabled={!publishReady}>Terbitkan course</Button></form> : null}{course.status !== "ARCHIVED" ? <form action={archiveCourse}><input type="hidden" name="id" value={course.id}/><Button variant="danger" className="w-full"><Archive size={17}/> Arsipkan course</Button></form> : null}</CardContent></Card></div></div></>;
}
