import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }) {
  return <label className={cn("grid gap-2 text-sm font-medium text-slate-700", className)}><span>{label}</span>{children}{hint && !error ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}{error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}</label>;
}
export const inputClass = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:bg-slate-100";
export const textareaClass = "min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:bg-slate-100";
