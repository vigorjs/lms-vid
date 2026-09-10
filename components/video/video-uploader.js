"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileVideo, LoaderCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration } from "@/lib/utils";
import { MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";
import { calculateMultipartProgress, createMultipartPlan, retryMultipartPart } from "@/lib/video/multipart";

export async function inspectVideo(file) {
  if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) throw new Error("Gunakan file MP4 dengan codec H.264/AAC.");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Ukuran video maksimum 100 MB.");
  const url = URL.createObjectURL(file); const video = document.createElement("video"); video.preload = "metadata"; video.src = url;
  const duration = await new Promise((resolve, reject) => { video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => reject(new Error("Video tidak dapat diputar. Pastikan codec H.264/AAC.")); });
  URL.revokeObjectURL(url); if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_DURATION_SECONDS) throw new Error("Durasi video harus antara 1 detik dan 10 menit.");
  return duration;
}

export function uploadPart(url, blob, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const handleAbort = () => xhr.abort();
    const finish = (callback) => {
      signal?.removeEventListener("abort", handleAbort);
      callback();
    };

    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded);
    };
    xhr.onload = () => finish(() => xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Upload part gagal (${xhr.status}).`)));
    xhr.onerror = () => finish(() => reject(new Error("Tidak dapat mengupload part ke MinIO.")));
    xhr.onabort = () => finish(() => reject(new DOMException("Upload dibatalkan.", "AbortError")));
    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) return handleAbort();
    xhr.send(blob);
  });
}

async function abortVideoAsset(assetId) {
  if (!assetId) return;
  await fetch(`/api/videos/${assetId}/complete`, { method: "DELETE", keepalive: true }).catch(() => {});
}

export async function uploadVideoAsset({ courseId, purpose, file, durationSeconds, parentAssetId, submissionId, trimStartSeconds, trimEndSeconds, onProgress, signal }) {
  let assetId;
  try {
    const intentResponse = await fetch("/api/videos/upload-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, purpose, fileName: file.name, contentType: "video/mp4", sizeBytes: file.size, durationSeconds, parentAssetId, submissionId, trimStartSeconds, trimEndSeconds }),
      signal,
    });
    const intent = await intentResponse.json();
    if (!intentResponse.ok) throw new Error(intent.error || "Gagal membuat upload intent.");

    ({ assetId } = intent.data);
    const plan = createMultipartPlan(file.size, intent.data.partSizeBytes);
    if (!Array.isArray(intent.data.parts) || intent.data.parts.length !== plan.length) {
      throw new Error("Daftar part upload tidak valid.");
    }

    let completedBytes = 0;
    let highestProgress = 0;
    for (const part of plan) {
      const target = intent.data.parts.find((candidate) => candidate.partNumber === part.partNumber);
      if (!target?.url) throw new Error(`URL upload part ${part.partNumber} tidak tersedia.`);
      const blob = file.slice(part.start, part.end, "video/mp4");

      await retryMultipartPart(
        () => uploadPart(target.url, blob, {
          signal,
          onProgress: (loaded) => {
            highestProgress = Math.max(highestProgress, calculateMultipartProgress(completedBytes, loaded, file.size));
            onProgress?.(highestProgress);
          },
        }),
        { signal },
      );
      completedBytes += part.size;
      highestProgress = Math.max(highestProgress, calculateMultipartProgress(completedBytes, 0, file.size));
      onProgress?.(highestProgress);
    }

    const result = await retryMultipartPart(async () => {
      const response = await fetch(`/api/videos/${assetId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
        signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal menyelesaikan upload.");
      return payload;
    }, { signal });
    onProgress?.(100);
    return result.data;
  } catch (error) {
    await abortVideoAsset(assetId);
    if (error?.name === "AbortError") throw new Error("Upload dibatalkan.");
    throw error;
  }
}

export function VideoUploader({ courseId, purpose, compact = false }) {
  const inputRef = useRef(null);
  const cancelRef = useRef(null);
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);

  async function choose(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    try {
      const seconds = await inspectVideo(selected);
      setFile(selected);
      setDuration(seconds);
    } catch (error) {
      toast.error(error.message);
      event.target.value = "";
    }
  }

  async function upload() {
    if (!file) return inputRef.current?.click();
    const controller = new AbortController();
    cancelRef.current = controller;
    setPending(true);
    setProgress(0);
    try {
      await uploadVideoAsset({
        courseId,
        purpose,
        file,
        durationSeconds: duration,
        onProgress: setProgress,
        signal: controller.signal,
      });
      toast.success(purpose === "REFERENCE" ? "Video referensi berhasil disimpan." : "Video latihan berhasil diupload.");
      setFile(null);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      toast.error(error.message);
      setProgress(0);
    } finally {
      cancelRef.current = null;
      setPending(false);
    }
  }

  return <div className={compact ? "grid gap-3" : "rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"}>
    <input ref={inputRef} className="hidden" type="file" accept="video/mp4,.mp4" onChange={choose} />
    {file ? <div className="mb-3 flex items-center gap-3 rounded-xl bg-white p-3 text-left">
      <span className="grid size-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700"><FileVideo size={20} /></span>
      <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.name}</strong><span className="text-xs text-slate-500">{formatBytes(file.size)} · {formatDuration(duration)}</span></div>
      <CheckCircle2 className="text-emerald-500" size={20} />
    </div> : !compact ? <>
      <UploadCloud className="mx-auto text-slate-400" size={36} />
      <h3 className="mt-3 font-bold">Upload video MP4</h3>
      <p className="mt-1 text-xs text-slate-500">H.264/AAC · Maks. 100 MB · 10 menit</p>
    </> : null}
    {pending ? <div className="mb-3">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
      <p className="mt-1 text-xs text-slate-500">Mengupload multipart {progress}%</p>
    </div> : null}
    <div className="mt-4 flex justify-center gap-2">
      <Button type="button" variant={file ? "outline" : "primary"} onClick={() => inputRef.current?.click()} disabled={pending}>{file ? "Ganti file" : "Pilih video"}</Button>
      {file && !pending ? <Button type="button" onClick={upload}><UploadCloud size={17} /> Upload</Button> : null}
      {pending ? <Button type="button" variant="danger" onClick={() => cancelRef.current?.abort()}><LoaderCircle className="animate-spin" size={17} /> Batalkan</Button> : null}
    </div>
  </div>;
}
