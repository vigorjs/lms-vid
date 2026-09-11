"use client";

import { useMemo, useState } from "react";
import { Check, Globe2, Search, UserRoundCheck, Users } from "lucide-react";
import { inputClass } from "@/components/ui/field";

const modes = [
  {
    value: "PUBLIC",
    title: "Public",
    description: "Tersedia untuk seluruh student aktif yang sudah login.",
    icon: Globe2,
  },
  {
    value: "ASSIGNED",
    title: "Assigned",
    description: "Hanya student yang dipilih yang dapat membuka course.",
    icon: UserRoundCheck,
  },
];

export function StudentAssignmentPicker({ students, visibility, selectedIds, onVisibilityChange, onSelectedIdsChange, requireSelection }) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(query));
  }, [search, students]);

  function chooseMode(mode) {
    onVisibilityChange(mode);
    if (mode === "PUBLIC") onSelectedIdsChange([]);
  }

  function toggle(studentId) {
    onSelectedIdsChange(selected.has(studentId)
      ? selectedIds.filter((id) => id !== studentId)
      : [...selectedIds, studentId]);
  }

  return <section className="grid gap-4 border-t border-slate-200 pt-6">
    <div><h3 className="font-bold text-slate-900">Akses course</h3><p className="text-xs text-slate-500">Tentukan siapa yang dapat menemukan dan menggunakan course setelah diterbitkan.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const active = visibility === mode.value;
        return <button key={mode.value} type="button" aria-pressed={active} onClick={() => chooseMode(mode.value)} className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${active ? "border-cyan-400 bg-cyan-50 ring-1 ring-cyan-300" : "border-slate-200 bg-white hover:border-cyan-200"}`}>
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-cyan-500 text-slate-950" : "bg-slate-100 text-slate-600 group-hover:bg-cyan-50 group-hover:text-cyan-700"}`}><Icon size={19} /></span>
          <span><strong className="flex items-center gap-2 text-sm text-slate-900">{mode.title}{active ? <Check size={15} className="text-cyan-700" /> : null}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{mode.description}</span></span>
        </button>;
      })}
    </div>
    {visibility === "ASSIGNED" ? <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Users size={18} className="text-cyan-700" /><strong className="text-sm text-slate-900">Pilih student</strong></div><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-800">{selectedIds.length} dipilih</span></div>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="search" className={`${inputClass} pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau email student" aria-label="Cari student" /></div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {filtered.length ? filtered.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-3 transition last:border-b-0 hover:bg-cyan-50/60">
          <input type="checkbox" className="size-4 accent-cyan-500" checked={selected.has(student.id)} onChange={() => toggle(student.id)} />
          <span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{student.name}</strong><span className="block truncate text-xs text-slate-500">{student.email}</span></span>
        </label>) : <p className="px-4 py-8 text-center text-sm text-slate-500">Tidak ada student yang cocok.</p>}
      </div>
      {!students.length ? <p className="text-xs text-amber-700">Belum ada student aktif yang dapat dipilih.</p> : null}
      {requireSelection && !selectedIds.length ? <p role="alert" className="text-xs font-semibold text-rose-600">Course yang sudah terbit wajib memiliki minimal satu student.</p> : !selectedIds.length ? <p className="text-xs text-amber-700">Course dapat disimpan sebagai draft, tetapi belum dapat diterbitkan.</p> : null}
    </div> : null}
  </section>;
}
