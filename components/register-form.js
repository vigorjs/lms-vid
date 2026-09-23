"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), name: form.get("name") }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Registrasi gagal.");
      router.replace("/setup-pin");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message || "Registrasi gagal.");
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-6 grid gap-4">
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <Field label="Email"><input className={inputClass} name="email" type="email" autoComplete="email" required autoFocus /></Field>
    <Field label="Nama lengkap (opsional)"><input className={inputClass} name="name" type="text" maxLength={100} autoComplete="name" /></Field>
    <Button disabled={pending}>{pending ? "Mendaftarkan…" : "Daftar dan lanjutkan"}</Button>
  </form>;
}
