import { cn } from "@/lib/utils";

export function Card({ className, ...props }) { return <div className={cn("min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm", className)} {...props} />; }
export function CardHeader({ className, ...props }) { return <div className={cn("min-w-0 border-b border-slate-100 p-4 sm:p-5", className)} {...props} />; }
export function CardContent({ className, ...props }) { return <div className={cn("min-w-0 p-4 sm:p-5", className)} {...props} />; }
