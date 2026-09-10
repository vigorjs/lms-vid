"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProfile } from "@/features/profile/actions";
import { Field, inputClass } from "./ui/field";
import { SubmitButton, StateToast } from "./form-feedback";

export function ProfileForm({ user }) {
  const [state, action] = useActionState(updateProfile, null);
  const router = useRouter();

  useEffect(() => {
    if (!state?.logout) return;
    async function endSession() {
      try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (!response.ok) throw new Error("Sesi lama gagal ditutup.");
        router.replace("/login");
        router.refresh();
      } catch (error) {
        toast.error(error.message || "Gagal keluar setelah mengganti password.");
      }
    }
    endSession();
  }, [state, router]);

  return <form action={action} className="grid gap-5">
    <StateToast state={state} />
    <Field label="Nama lengkap"><input name="name" className={inputClass} defaultValue={user.name} required /></Field>
    <Field label="Email"><input className={inputClass} value={user.email} disabled /></Field>
    <div className="border-t border-slate-100 pt-5"><h3 className="font-semibold text-slate-900">Ganti password</h3><p className="mb-4 text-xs text-slate-500">Kosongkan bila tidak ingin mengganti password.</p><div className="grid gap-4 md:grid-cols-2"><Field label="Password saat ini"><input name="currentPassword" type="password" className={inputClass} /></Field><Field label="Password baru"><input name="newPassword" type="password" className={inputClass} /></Field></div></div>
    <SubmitButton pendingLabel="Menyimpan profil…">Simpan profil</SubmitButton>
  </form>;
}
