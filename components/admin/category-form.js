"use client";

import { useActionState } from "react";
import { createCategory } from "@/features/categories/actions";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { SubmitButton, StateToast } from "@/components/form-feedback";

export function CategoryForm() {
  const [state, action] = useActionState(createCategory, null);
  return <form action={action} className="grid gap-4"><StateToast state={state} /><Field label="Nama kategori"><input name="name" className={inputClass} placeholder="Contoh: Renang" required /></Field><Field label="Deskripsi"><textarea name="description" className={textareaClass} placeholder="Deskripsi singkat kategori" /></Field><SubmitButton pendingLabel="Membuat kategori…">Buat kategori</SubmitButton></form>;
}
