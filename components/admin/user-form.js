"use client";
import { useActionState } from "react";
import { createUser, resetUserPassword } from "@/features/users/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton, StateToast } from "@/components/form-feedback";

export function UserForm() {
  const [state, action] = useActionState(createUser, null);
  return <form action={action} className="grid gap-4"><StateToast state={state} /><Field label="Nama"><input name="name" className={inputClass} required minLength={2} /></Field><Field label="Email"><input name="email" type="email" className={inputClass} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Role"><select name="role" className={inputClass} defaultValue="STUDENT"><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></select></Field><Field label="Password awal"><input name="password" type="password" className={inputClass} defaultValue="Demo123!" required /></Field></div><SubmitButton>Buat pengguna</SubmitButton></form>;
}
export function ResetPasswordForm({ userId }) {
  const [state, action] = useActionState(resetUserPassword, null);
  return <form action={action} className="flex items-center gap-2"><StateToast state={state} /><input type="hidden" name="id" value={userId} /><input aria-label="Password baru" name="password" type="password" className={`${inputClass} h-9 min-w-32`} placeholder="Password baru" required /><SubmitButton variant="outline">Reset</SubmitButton></form>;
}
