import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { SetupPinForm } from "@/components/setup-pin-form";

export const metadata = { title: "Atur PIN" };

export default async function SetupPinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.needsPinSetup) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center bg-slate-950 p-5"><section role="dialog" aria-modal="true" aria-labelledby="setup-title" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><p className="text-sm font-semibold text-cyan-700">Akun {user.email}</p><h1 id="setup-title" className="mt-2 text-2xl font-bold text-slate-950">{user.mustChangePassword ? "Ganti PIN awal" : "Buat PIN akun"}</h1><p className="mt-2 text-sm text-slate-500">Masukkan PIN pribadi 6 digit angka untuk melanjutkan ke LMS.</p><SetupPinForm /><p className="mt-6 text-xs text-slate-500">Selesaikan pengaturan PIN sebelum membuka materi.</p></section></main>;
}
