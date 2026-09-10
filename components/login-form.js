"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { Button } from "./ui/button";
import { Field, inputClass } from "./ui/field";
export function LoginForm() {
  const router = useRouter(); const search = useSearchParams(); const [error, setError] = useState(""); const [pending, setPending] = useState(false); const [show, setShow] = useState(false);
  async function submit(event) {
    event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const result = await response.json(); if (!response.ok) { setError(result.error || "Login gagal."); setPending(false); return; }
    const next = search.get("next"); router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"); router.refresh();
  }
  return <form onSubmit={submit} className="grid gap-5">{error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}<Field label="Email"><input className={inputClass} name="email" type="email" autoComplete="email" placeholder="nama@sekolah.id" required autoFocus /></Field><Field label="Password"><div className="relative"><input className={`${inputClass} pr-11`} name="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan password" required /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field><Button className="w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={18} /> : <LogIn size={18} />}{pending ? "Memeriksa…" : "Masuk ke LMS"}</Button></form>;
}
