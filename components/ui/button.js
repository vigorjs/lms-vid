import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-sm shadow-cyan-950/20",
  secondary: "border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
};

export function Button({ className, variant = "primary", size = "md", ...props }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500", size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm", variants[variant], className)} {...props} />;
}
