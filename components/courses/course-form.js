"use client";
import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createCourse, updateCourse } from "@/features/courses/actions";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton, StateToast } from "@/components/form-feedback";
import { CoverEditor } from "@/components/courses/cover-editor";
import { getCourseCoverUrl } from "@/lib/image/url";

export function CourseForm({ course, categories, teachers, isAdmin }) {
  const action = course ? updateCourse : createCourse; const [state, formAction] = useActionState(action, null);
  const [criteria, setCriteria] = useState(course?.rubricCriteria?.length ? course.rubricCriteria.map(({ title, description, weight }) => ({ title, description: description || "", weight })) : [{ title: "Ketepatan teknik", description: "", weight: 40 }, { title: "Koordinasi gerakan", description: "", weight: 35 }, { title: "Ritme dan konsistensi", description: "", weight: 25 }]);
  const total = useMemo(() => criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0), [criteria]);
  function change(index, key, value) { setCriteria((items) => items.map((item, i) => i === index ? { ...item, [key]: key === "weight" ? Number(value) : value } : item)); }
  return <form action={formAction} className="grid gap-6"><StateToast state={state} />{course ? <input type="hidden" name="id" value={course.id} /> : null}<input type="hidden" name="criteria" value={JSON.stringify(criteria)} />
    <div className="grid gap-4 md:grid-cols-2"><Field label="Judul course"><input name="title" className={inputClass} defaultValue={course?.title} placeholder="Gaya bebas" minLength={3} maxLength={120} required /></Field><Field label="Kategori"><select name="categoryId" className={inputClass} defaultValue={course?.categoryId} required><option value="">Pilih kategori</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field></div>
    {isAdmin ? <Field label="Teacher"><select name="teacherId" className={inputClass} defaultValue={course?.teacherId} required><option value="">Pilih teacher</option>{teachers.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.email}</option>)}</select></Field> : null}
    <Field label="Deskripsi"><textarea name="description" className={textareaClass} defaultValue={course?.description} placeholder="Tujuan dan ringkasan materi pembelajaran…" minLength={10} maxLength={3000} required /></Field>
    <div className="grid gap-4"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Rubric penilaian</h3><p className="text-xs text-slate-500">Bobot seluruh kriteria harus berjumlah 100%.</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${total === 100 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{total}%</span></div>
      {criteria.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1.3fr_100px_40px]"><input aria-label={`Kriteria ${index + 1}`} className={inputClass} value={item.title} onChange={(event) => change(index, "title", event.target.value)} placeholder="Nama kriteria" minLength={2} maxLength={100} required /><input aria-label="Deskripsi kriteria" className={inputClass} value={item.description} onChange={(event) => change(index, "description", event.target.value)} placeholder="Penjelasan" maxLength={300} /><input aria-label="Bobot" type="number" min="1" max="100" className={inputClass} value={item.weight} onChange={(event) => change(index, "weight", event.target.value)} required /><Button type="button" variant="ghost" className="px-0 text-rose-600" disabled={criteria.length === 1} onClick={() => setCriteria((items) => items.filter((_, i) => i !== index))}><Trash2 size={18} /></Button></div>)}
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => setCriteria((items) => [...items, { title: "", description: "", weight: 0 }])}><Plus size={17} /> Tambah kriteria</Button>
    </div>
    <Field label="Nilai minimal lulus" className="max-w-xs"><input name="passThreshold" type="number" min="1" max="100" className={inputClass} defaultValue={course?.passThreshold || 75} required /></Field>
    {course ? <section className="grid gap-3 border-t border-slate-200 pt-6"><div><h3 className="font-bold text-slate-900">Cover course</h3><p className="text-xs text-slate-500">Atur gambar yang tampil di katalog dan halaman materi.</p></div><CoverEditor courseId={course.id} coverUrl={getCourseCoverUrl(course)} /></section> : null}
    <SubmitButton className="justify-self-start" pendingLabel={course ? "Menyimpan perubahan…" : "Membuat course…"} disabled={total !== 100}>{course ? "Simpan perubahan" : "Buat course"}</SubmitButton>
  </form>;
}
