"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { ImageIcon, LoaderCircle, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  COVER_ASPECT,
  COVER_HEIGHT,
  COVER_QUALITY,
  COVER_SOURCE_TYPES,
  COVER_WIDTH,
  MAX_COVER_OUTPUT_BYTES,
  MAX_COVER_SOURCE_BYTES,
  MAX_COVER_SOURCE_PIXELS,
} from "@/lib/image/constants";
import { formatBytes } from "@/lib/utils";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
    image.src = url;
  });
}

async function inspectCover(file) {
  if (!COVER_SOURCE_TYPES.includes(file.type)) throw new Error("Gunakan gambar JPG, PNG, atau WebP.");
  if (file.size > MAX_COVER_SOURCE_BYTES) throw new Error("Ukuran gambar sumber maksimum 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > MAX_COVER_SOURCE_PIXELS) throw new Error("Resolusi gambar maksimum 20 megapiksel.");
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function canvasToWebp(canvas) {
  for (const quality of [COVER_QUALITY, 0.72, 0.62]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob?.type === "image/webp" && blob.size <= MAX_COVER_OUTPUT_BYTES) return blob;
  }
  throw new Error("Hasil crop terlalu besar. Gunakan gambar yang lebih sederhana.");
}

export async function createCroppedCover(imageUrl, area) {
  if (!area?.width || !area?.height) throw new Error("Area crop belum siap.");
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, COVER_WIDTH, COVER_HEIGHT);
  return canvasToWebp(canvas);
}

function uploadBlob(url, blob, { signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (callback) => {
      signal?.removeEventListener("abort", abort);
      callback();
    };
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "image/webp");
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(Math.round(event.loaded / event.total * 100));
    xhr.onload = () => finish(() => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload cover gagal (${xhr.status}).`)));
    xhr.onerror = () => finish(() => reject(new Error("Tidak dapat mengupload cover ke MinIO.")));
    xhr.onabort = () => finish(() => reject(new DOMException("Upload dibatalkan.", "AbortError")));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) return abort();
    xhr.send(blob);
  });
}

async function responsePayload(response, fallback) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || fallback);
  return payload;
}

export function CoverEditor({ courseId, coverUrl }) {
  const inputRef = useRef(null);
  const cancelRef = useRef(null);
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  function closeEditor() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function choose(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await inspectCover(file);
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      setSourceUrl(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      toast.error(error.message);
      event.target.value = "";
    }
  }

  async function cleanupPending(objectKey) {
    if (!objectKey) return;
    await fetch(`/api/courses/${courseId}/cover/complete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey }),
      keepalive: true,
    }).catch(() => {});
  }

  async function upload() {
    if (!sourceUrl || !area) return;
    const controller = new AbortController();
    cancelRef.current = controller;
    setPendingAction("upload");
    setProgress(0);
    let objectKey;
    try {
      const blob = await createCroppedCover(sourceUrl, area);
      const intentResponse = await fetch(`/api/courses/${courseId}/cover/upload-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: "cover.webp", contentType: "image/webp", sizeBytes: blob.size }),
        signal: controller.signal,
      });
      const intent = await responsePayload(intentResponse, "Gagal membuat upload cover.");
      ({ objectKey } = intent.data);
      await uploadBlob(intent.data.uploadUrl, blob, { signal: controller.signal, onProgress: setProgress });
      const completeResponse = await fetch(`/api/courses/${courseId}/cover/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey }),
        signal: controller.signal,
      });
      await responsePayload(completeResponse, "Gagal menyimpan cover.");
      toast.success(coverUrl ? "Cover course berhasil diganti." : "Cover course berhasil disimpan.");
      closeEditor();
      router.refresh();
    } catch (error) {
      await cleanupPending(objectKey);
      toast.error(error?.name === "AbortError" ? "Upload cover dibatalkan." : error.message || "Gagal mengupload cover.");
    } finally {
      cancelRef.current = null;
      setPendingAction(null);
      setProgress(0);
    }
  }

  async function remove() {
    setPendingAction("delete");
    try {
      const response = await fetch(`/api/courses/${courseId}/cover`, { method: "DELETE" });
      await responsePayload(response, "Gagal menghapus cover.");
      toast.success("Cover course berhasil dihapus.");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Gagal menghapus cover.");
    } finally {
      setPendingAction(null);
    }
  }

  return <div className="grid gap-4">
    <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} />
    {sourceUrl ? <>
      <div className="relative h-64 overflow-hidden rounded-xl bg-slate-950"><Cropper image={sourceUrl} crop={crop} zoom={zoom} aspect={COVER_ASPECT} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_cropped, pixels) => setArea(pixels)} /></div>
      <label className="grid gap-2 text-xs font-semibold text-slate-600">Zoom<input className="accent-cyan-500" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={Boolean(pendingAction)} /></label>
      {pendingAction === "upload" ? <div><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Memproses dan mengupload…</span><strong>{progress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div></div> : null}
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={upload} disabled={Boolean(pendingAction) || !area}>{pendingAction === "upload" ? <LoaderCircle className="animate-spin" size={17} /> : <UploadCloud size={17} />} {pendingAction === "upload" ? "Mengupload…" : "Simpan cover"}</Button><Button type="button" variant="outline" onClick={closeEditor} disabled={Boolean(pendingAction)}><X size={17} /> Batal</Button>{pendingAction === "upload" ? <Button type="button" variant="danger" onClick={() => cancelRef.current?.abort()}>Batalkan upload</Button> : null}</div>
    </> : <>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950">
        {coverUrl ? <Image src={coverUrl} alt="Cover course saat ini" fill sizes="(max-width: 1280px) 100vw, 420px" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-center text-slate-300"><div><ImageIcon className="mx-auto mb-2" size={34} /><p className="text-sm">Belum ada cover</p></div></div>}
      </div>
      <p className="text-xs leading-5 text-slate-500">JPG, PNG, atau WebP · Maks. 5 MB · Hasil crop 16:9</p>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(pendingAction)}><ImageIcon size={17} /> {coverUrl ? "Ganti cover" : "Pilih gambar"}</Button>{coverUrl ? <Button type="button" variant="danger" onClick={remove} disabled={Boolean(pendingAction)}>{pendingAction === "delete" ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />} {pendingAction === "delete" ? "Menghapus…" : "Hapus cover"}</Button> : null}</div>
    </>}
    {sourceUrl ? <p className="text-xs text-slate-500">Output: {COVER_WIDTH}×{COVER_HEIGHT} WebP, maksimal {formatBytes(MAX_COVER_OUTPUT_BYTES)}.</p> : null}
  </div>;
}
