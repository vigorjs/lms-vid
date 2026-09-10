import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CourseCard({ course, progress }) {
  return <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="relative h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-5 text-white"><span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold backdrop-blur">{course.category.name}</span><BookOpen className="absolute bottom-4 right-5 text-cyan-300/60" size={42} /></div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950 group-hover:text-cyan-700">{course.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{course.description}</p></div>{course.status !== "PUBLISHED" ? <Badge tone={course.status === "DRAFT" ? "warning" : "neutral"}>{course.status}</Badge> : null}</div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><UserRound size={14} />{course.teacher.name}</span><span className="flex items-center gap-1.5"><Clock3 size={14} />≤10 menit</span></div>
      {progress !== undefined ? <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Progress video</span><strong>{Math.round(progress)}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(progress, 100)}%` }} /></div></div> : null}
      <Link href={`/courses/${course.id}`} className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-cyan-700">Buka materi <ArrowRight size={17} /></Link>
    </div>
  </article>;
}
