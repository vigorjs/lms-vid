"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileVideo, LoaderCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration } from "@/lib/utils";

export async function inspectVideo(file) {
  if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) throw new Error("Gunakan file MP4 dengan codec H.264/AAC.");
  if (file.size > 500 * 1024 * 1024) throw new Error("Ukuran video maksimum 500 MB.");
  const url = URL.createObjectURL(file); const video = document.createElement("video"); video.preload = "metadata"; video.src = url;
  const duration = await new Promise((resolve, reject) => { video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => reject(new Error("Video tidak dapat diputar. Pastikan codec H.264/AAC.")); });
  URL.revokeObjectURL(url); if (!Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error("Durasi video harus antara 1 detik dan 10 menit.");
  return duration;
}

export function directUpload(url, fields, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); const body = new FormData(); Object.entries(fields).forEach(([key, value]) => body.append(key, value)); body.append("file", file);
    xhr.open("POST", url); xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload MinIO gagal (${xhr.status}).`)); xhr.onerror = () => reject(new Error("Tidak dapat terhubung ke MinIO.")); xhr.send(body);
  });
}

export async function uploadVideoAsset({ courseId, purpose, file, durationSeconds, parentAssetId, submissionId, trimStartSeconds, trimEndSeconds, onProgress }) {
  const intentResponse = await fetch("/api/videos/upload-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, purpose, fileName: file.name, contentType: "video/mp4", sizeBytes: file.size, durationSeconds, parentAssetId, submissionId, trimStartSeconds, trimEndSeconds }) });
  const intent = await intentResponse.json(); if (!intentResponse.ok) throw new Error(intent.error || "Gagal membuat upload intent.");
  const { assetId, upload } = intent.data; await directUpload(upload.postURL || upload.postUrl, upload.formData, file, onProgress);
  const completeResponse = await fetch(`/api/videos/${assetId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId }) }); const result = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(result.error || "Gagal menyelesaikan upload."); return result.data;
}

export function VideoUploader({ courseId, purpose, compact = false }) {
  const inputRef = useRef(null); const router = useRouter(); const [file, setFile] = useState(null); const [duration, setDuration] = useState(0); const [progress, setProgress] = useState(0); const [pending, setPending] = useState(false);
  async function choose(event) { const selected = event.target.files?.[0]; if (!selected) return; try { const seconds = await inspectVideo(selected); setFile(selected); setDuration(seconds); } catch (error) { toast.error(error.message); event.target.value = ""; } }
  async function upload() { if (!file) return inputRef.current?.click(); setPending(true); try { await uploadVideoAsset({ courseId, purpose, file, durationSeconds: duration, onProgress: setProgress }); toast.success(purpose === "REFERENCE" ? "Video referensi berhasil disimpan." : "Video latihan berhasil diupload."); setFile(null); setProgress(0); router.refresh(); } catch (error) { toast.error(error.message); } finally { setPending(false); } }
  return <div className={compact ? "grid gap-3" : "rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"}><input ref={inputRef} className="hidden" type="file" accept="video/mp4,.mp4" onChange={choose} />{file ? <div className="mb-3 flex items-center gap-3 rounded-xl bg-white p-3 text-left"><span className="grid size-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700"><FileVideo size={20} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.name}</strong><span className="text-xs text-slate-500">{formatBytes(file.size)} · {formatDuration(duration)}</span></div><CheckCircle2 className="text-emerald-500" size={20} /></div> : !compact ? <><UploadCloud className="mx-auto text-slate-400" size={36} /><h3 className="mt-3 font-bold">Upload video MP4</h3><p className="mt-1 text-xs text-slate-500">H.264/AAC · Maks. 500 MB · 10 menit</p></> : null}{pending ? <div className="mb-3"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-slate-500">Mengupload {progress}%</p></div> : null}<div className="mt-4 flex justify-center gap-2"><Button type="button" variant={file ? "outline" : "primary"} onClick={() => inputRef.current?.click()} disabled={pending}>{file ? "Ganti file" : "Pilih video"}</Button>{file ? <Button type="button" onClick={upload} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17} /> : <UploadCloud size={17} />} Upload</Button> : null}</div></div>;
}
