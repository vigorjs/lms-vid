"use client";

import { useActionState } from "react";
import { createUser, resetUserPin } from "@/features/users/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton, StateToast } from "@/components/form-feedback";

export function UserForm() {
  const [state, action] = useActionState(createUser, null);
  return <form action={action} className="grid gap-4"><StateToast state={state} /><Field label="Nama"><input name="name" className={inputClass} required minLength={2} /></Field><Field label="Email"><input name="email" type="email" className={inputClass} required /></Field><Field label="Role"><select name="role" className={inputClass} defaultValue="STUDENT"><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></select></Field><p className="text-xs text-slate-500">PIN awal 696969. Pengguna wajib menggantinya saat login pertama.</p><SubmitButton pendingLabel="Membuat pengguna…">Buat pengguna</SubmitButton></form>;
}

export function ResetPinForm({ userId }) {
  const [state, action] = useActionState(resetUserPin, null);
  return <form action={action} className="flex items-center gap-2"><StateToast state={state} /><input type="hidden" name="id" value={userId} /><input aria-label="PIN baru" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} className={`${inputClass} h-9 min-w-32`} placeholder="PIN 6 angka" required /><SubmitButton pendingLabel="Mereset…" variant="outline">Reset PIN</SubmitButton></form>;
}
