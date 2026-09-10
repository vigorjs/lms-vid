import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserForm, ResetPasswordForm } from "@/components/admin/user-form";
import { updateUserStatus } from "@/features/users/actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Pengguna" };
export default async function UsersPage() {
  await requireUser(["ADMIN"]); const users = await db.user.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return <><PageHeader eyebrow="Administrasi" title="Manajemen pengguna" description="Buat akun, atur akses, nonaktifkan akun, dan reset password." /><div className="grid gap-6 xl:grid-cols-[380px_1fr]"><Card className="h-fit"><CardHeader><h2 className="font-bold">Tambah pengguna</h2></CardHeader><CardContent><UserForm /></CardContent></Card><div className="table-wrap"><table className="data-table"><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong className="block text-slate-900">{user.name}</strong><span className="text-xs text-slate-500">{user.email}</span></td><td><Badge tone={user.role === "ADMIN" ? "danger" : user.role === "TEACHER" ? "info" : "neutral"}>{user.role}</Badge></td><td><Badge tone={user.status === "ACTIVE" ? "success" : "neutral"}>{user.status}</Badge></td><td>{formatDate(user.createdAt)}</td><td><div className="grid gap-2"><form action={updateUserStatus}><input type="hidden" name="id" value={user.id} /><input type="hidden" name="status" value={user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} /><Button size="sm" variant={user.status === "ACTIVE" ? "ghost" : "outline"}>{user.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</Button></form><ResetPasswordForm userId={user.id} /></div></td></tr>)}</tbody></table></div></div></>;
}
