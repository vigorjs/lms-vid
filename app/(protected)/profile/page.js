import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile-form";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Profil" };
export default async function ProfilePage() {
  const user = await requireUser();
  return <><PageHeader eyebrow="Akun" title="Profil saya" description="Perbarui nama dan keamanan akun Anda." /><div className="grid gap-6 lg:grid-cols-[320px_1fr]"><Card className="h-fit"><CardContent className="text-center"><div className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-2xl font-black text-white">{user.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><h2 className="mt-4 font-bold text-slate-950">{user.name}</h2><p className="text-sm text-slate-500">{user.email}</p><Badge className="mt-3" tone="info">{user.role}</Badge><p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">Anggota sejak {formatDate(user.createdAt)}</p></CardContent></Card><Card><CardHeader><h2 className="font-bold">Informasi akun</h2></CardHeader><CardContent><ProfileForm user={user} /></CardContent></Card></div></>;
}
