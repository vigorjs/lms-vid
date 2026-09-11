import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { formatDuration } from "@/lib/utils";
import { MAX_EDIT_SEGMENTS } from "@/lib/video/edit-spec";

export function SegmentTimeline({ duration, segments, selectedIndex, onSelect, onAdd, onRemove, onMove, onBoundaryChange, disabled }) {
  const selected = segments[selectedIndex];
  return <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-bold text-slate-950">Timeline segmen</h3><p className="text-xs text-slate-500">Potongan digabungkan dari kiri ke kanan.</p></div>
      <Button type="button" size="sm" variant="outline" onClick={onAdd} disabled={disabled || segments.length >= MAX_EDIT_SEGMENTS}><Plus size={15}/> Tambah segmen</Button>
    </div>

    <div className="relative h-14 overflow-hidden rounded-xl bg-slate-950" aria-label="Peta segmen video">
      <div className="absolute inset-x-3 top-2 flex justify-between font-mono text-[10px] text-slate-500"><span>0:00</span><span>{formatDuration(duration, true)}</span></div>
      {segments.map((segment, index) => <button
        type="button"
        key={segment.id}
        aria-label={`Pilih segmen ${index + 1}`}
        onClick={() => onSelect(index)}
        className={`absolute bottom-2 h-6 min-w-2 rounded-md border transition hover:-translate-y-0.5 hover:brightness-110 ${selectedIndex === index ? "border-cyan-200 bg-cyan-400" : "border-slate-500 bg-slate-600"}`}
        style={{ left: `${(segment.startSeconds / duration) * 100}%`, width: `${Math.max(0.8, ((segment.endSeconds - segment.startSeconds) / duration) * 100)}%` }}
      ><span className="sr-only">{formatDuration(segment.startSeconds, true)} sampai {formatDuration(segment.endSeconds, true)}</span></button>)}
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {segments.map((segment, index) => <button type="button" key={segment.id} onClick={() => onSelect(index)} className={`min-w-36 rounded-xl border p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/50 ${selectedIndex === index ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white"}`}>
        <strong className="block text-xs">Segmen {index + 1}</strong>
        <span className="mt-1 block font-mono text-[11px] text-slate-500">{formatDuration(segment.startSeconds, true)} – {formatDuration(segment.endSeconds, true)}</span>
      </button>)}
    </div>

    {selected ? <div className="grid gap-4 rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Atur segmen {selectedIndex + 1}</strong><div className="flex gap-1">
        <Button type="button" size="sm" variant="ghost" aria-label="Geser segmen ke kiri" onClick={() => onMove(selectedIndex, -1)} disabled={disabled || selectedIndex === 0}><ArrowLeft size={15}/></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Geser segmen ke kanan" onClick={() => onMove(selectedIndex, 1)} disabled={disabled || selectedIndex === segments.length - 1}><ArrowRight size={15}/></Button>
        <Button type="button" size="sm" variant="ghost" className="text-rose-600" aria-label="Hapus segmen" onClick={() => onRemove(selectedIndex)} disabled={disabled || segments.length === 1}><Trash2 size={15}/></Button>
      </div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mulai (detik)"><input className={inputClass} type="number" min="0" max={selected.endSeconds - 0.1} step="0.01" value={selected.startSeconds} disabled={disabled} onChange={(event) => onBoundaryChange(selectedIndex, "startSeconds", Number(event.target.value))}/></Field>
        <Field label="Selesai (detik)"><input className={inputClass} type="number" min={selected.startSeconds + 0.1} max={duration} step="0.01" value={selected.endSeconds} disabled={disabled} onChange={(event) => onBoundaryChange(selectedIndex, "endSeconds", Number(event.target.value))}/></Field>
      </div>
      <div className="grid gap-1">
        <input aria-label="Batas mulai segmen" className="video-range w-full" type="range" min="0" max={duration} step="0.01" value={selected.startSeconds} disabled={disabled} onChange={(event) => onBoundaryChange(selectedIndex, "startSeconds", Number(event.target.value))}/>
        <input aria-label="Batas akhir segmen" className="video-range w-full" type="range" min="0" max={duration} step="0.01" value={selected.endSeconds} disabled={disabled} onChange={(event) => onBoundaryChange(selectedIndex, "endSeconds", Number(event.target.value))}/>
      </div>
    </div> : null}
  </div>;
}
