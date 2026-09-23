import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }) {
  return <label className={cn("grid gap-2 text-base font-medium text-slate-700 lg:text-sm", className)}><span>{label}</span>{children}{hint && !error ? <span className="text-base font-normal text-slate-600 lg:text-xs">{hint}</span> : null}{error ? <span className="text-base font-normal text-rose-700 lg:text-xs">{error}</span> : null}</label>;
}
export const inputClass = "min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10 disabled:bg-slate-100";
export const textareaClass = "min-h-28 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10 disabled:bg-slate-100";
