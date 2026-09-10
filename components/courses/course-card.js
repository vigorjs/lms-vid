import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCourseCoverUrl } from "@/lib/image/url";

export function CourseCard({ course, progress }) {
  const coverUrl = getCourseCoverUrl(course);
  return <Link href={`/courses/${course.id}`} aria-label={`Buka materi ${course.title}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 motion-safe:group-hover:-translate-y-1 group-hover:border-cyan-200 group-hover:shadow-xl group-active:scale-[0.99]">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-5 text-white">
        {coverUrl ? <Image src={coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 25vw" className="object-cover transition duration-300 motion-safe:group-hover:scale-105" unoptimized /> : <BookOpen className="absolute bottom-4 right-5 text-cyan-300/60" size={42} />}
        {coverUrl ? <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/20" /> : null}
        <span className="relative inline-flex rounded-full bg-slate-950/55 px-2.5 py-1 text-xs font-semibold backdrop-blur">{course.category.name}</span>
      </div>
      <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950 transition-colors group-hover:text-cyan-700">{course.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{course.description}</p></div>{course.status !== "PUBLISHED" ? <Badge tone={course.status === "DRAFT" ? "warning" : "neutral"}>{course.status}</Badge> : null}</div>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><UserRound size={14} />{course.teacher.name}</span><span className="flex items-center gap-1.5"><Clock3 size={14} />≤10 menit</span></div>
        {progress !== undefined ? <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Progress video</span><strong>{Math.round(progress)}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(progress, 100)}%` }} /></div></div> : null}
        <span className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-cyan-700">Buka materi <ArrowRight className="transition-transform motion-safe:group-hover:translate-x-1" size={17} /></span>
      </div>
    </article>
  </Link>;
}
