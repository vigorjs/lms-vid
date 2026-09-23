"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function SetupPinForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/setup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: form.get("pin"), confirmPin: form.get("confirmPin") }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Gagal menyimpan PIN.");
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message || "Gagal menyimpan PIN.");
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-6 grid gap-4">
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <Field label="PIN baru"><input className={inputClass} name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required autoFocus /></Field>
    <Field label="Ulangi PIN"><input className={inputClass} name="confirmPin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required /></Field>
    <Button disabled={pending}>{pending ? "Menyimpan…" : "Simpan PIN dan lanjutkan"}</Button>
  </form>;
}
