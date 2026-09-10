import { Card, CardContent } from "./ui/card";

export function StatCard({ label, value, hint, icon: Icon, tone = "cyan" }) {
  const tones = { cyan: "bg-cyan-50 text-cyan-700", indigo: "bg-indigo-50 text-indigo-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" };
  return <Card><CardContent className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}</div>{Icon ? <span className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}><Icon size={22} /></span> : null}</CardContent></Card>;
}
