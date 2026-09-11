"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, History, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import { summarizeEditSpec } from "@/lib/video/edit-spec";

async function responseError(response, fallback) {
  const result = await response.json().catch(() => ({}));
  return result.error || fallback;
}

export function VideoVersionHistory({ submissionId, activeVideoId, versions }) {
  const router = useRouter();
  const [pending, setPending] = useState("");

  async function activate(videoId) {
    setPending(`activate:${videoId}`);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/active-video`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Gagal memulihkan versi."));
      toast.success("Versi video berhasil dijadikan aktif.");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  }

  async function remove(version) {
    if (!window.confirm(`Hapus versi ${version.versionNumber}? File video akan dihapus permanen dari storage.`)) return;
    setPending(`delete:${version.id}`);
    try {
      const response = await fetch(`/api/videos/${version.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response, "Gagal menghapus versi."));
      toast.success("Versi edit berhasil dihapus.");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending("");
    }
  }

  return <div className="grid gap-3">
    <div className="flex items-center gap-2"><History size={18} className="text-cyan-700"/><div><h3 className="text-sm font-bold">Riwayat versi</h3><p className="text-xs text-slate-500">Original dan hasil edit tetap tersimpan terpisah.</p></div></div>
    {versions.map((version, index) => {
      const active = version.id === activeVideoId;
      const original = version.kind === "STUDENT_ORIGINAL";
      const activating = pending === `activate:${version.id}`;
      const deleting = pending === `delete:${version.id}`;
      const summary = version.editSpec ? summarizeEditSpec(version.editSpec) : original ? "Video original" : "Hasil trim versi lama";
      return <div key={version.id} className={`rounded-xl border p-3 ${active ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{original ? "Original" : `Versi ${version.versionNumber ?? index}`}</strong>{active ? <Badge tone="success"><Check size={12} className="mr-1"/> Aktif</Badge> : null}{original ? <Badge tone="neutral">Original</Badge> : null}</div><p className="mt-1 text-xs text-slate-500">{summary}</p><p className="mt-1 text-[11px] text-slate-400">{formatDuration(version.durationSeconds, true)} · {formatBytes(version.sizeBytes)} · {formatDate(version.createdAt)}</p></div>
          <div className="flex gap-1">
            {!active ? <Button type="button" size="sm" variant="outline" onClick={() => activate(version.id)} disabled={Boolean(pending)}>{activating ? <LoaderCircle size={15} className="animate-spin"/> : <RotateCcw size={15}/>} Aktifkan</Button> : null}
            {!original && !active ? <Button type="button" size="sm" variant="ghost" className="text-rose-600" aria-label={`Hapus versi ${version.versionNumber}`} onClick={() => remove(version)} disabled={Boolean(pending)}>{deleting ? <LoaderCircle size={15} className="animate-spin"/> : <Trash2 size={15}/>}</Button> : null}
          </div>
        </div>
      </div>;
    })}
  </div>;
}
