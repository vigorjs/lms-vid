import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export const metadata = { title: "Daftar student" };

export default function RegisterPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-950 p-5"><section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><p className="text-sm font-semibold text-cyan-700">GerakBelajar</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Daftar sebagai student</h1><p className="mt-2 text-sm text-slate-500">Masukkan email. Setelah masuk, Anda akan membuat PIN 6 digit.</p><RegisterForm /><p className="mt-6 text-sm text-slate-600">Sudah punya akun? <Link href="/login" className="font-semibold text-cyan-700">Masuk</Link></p></section></main>;
}
