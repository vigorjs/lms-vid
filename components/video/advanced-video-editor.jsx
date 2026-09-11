"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { FlipHorizontal2, FlipVertical2, LoaderCircle, PlaySquare, RotateCw, Save, Square, TriangleAlert, Undo2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { PlayerControls } from "./player-controls";
import { SegmentTimeline } from "./segment-timeline";
import { uploadVideoAsset } from "./video-uploader";
import { buildFfmpegArgs, EDIT_SPEEDS, normalizeCrop, outputDuration } from "@/lib/video/edit-spec";
import { MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";
import { formatBytes, formatDuration } from "@/lib/utils";

const ASPECTS = [
  { key: "source", label: "Original" },
  { key: "16:9", label: "16:9", value: 16 / 9 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "9:16", label: "9:16", value: 9 / 16 },
];

function newSegment(start, end) {
  return { id: crypto.randomUUID(), startSeconds: Number(start.toFixed(2)), endSeconds: Number(end.toFixed(2)) };
}

async function detectAudio(ffmpeg) {
  await ffmpeg.ffprobe(["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", "input.mp4", "-o", "audio.txt"]);
  const result = await ffmpeg.readFile("audio.txt");
  return new TextDecoder().decode(result).trim() === "audio";
}

export function AdvancedVideoEditor({ courseId, submissionId, sourceAssetId, durationSeconds, sourceSizeBytes = 0 }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const ffmpegRef = useRef(null);
  const abortRef = useRef(null);
  const sequenceRef = useRef(null);
  const cancelledRef = useRef(false);
  const [url, setUrl] = useState("");
  const [segments, setSegments] = useState(() => [newSegment(0, durationSeconds)]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState(null);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [aspectKey, setAspectKey] = useState("source");
  const [sourceAspect, setSourceAspect] = useState(16 / 9);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  const selectedSegment = segments[selectedIndex];
  const aspect = ASPECTS.find((item) => item.key === aspectKey)?.value || sourceAspect;
  const previewAspect = cropEnabled ? aspect : rotation % 180 === 0 ? sourceAspect : 1 / sourceAspect;
  const editSpec = useMemo(() => ({
    segments: segments.map(({ startSeconds, endSeconds }) => ({ startSeconds, endSeconds })),
    crop: cropEnabled && cropArea ? normalizeCrop({
      x: cropArea.x / 100,
      y: cropArea.y / 100,
      width: cropArea.width / 100,
      height: cropArea.height / 100,
      aspect,
    }) : null,
    rotation,
    flipHorizontal,
    flipVertical,
    speed,
    volume,
    muted,
  }), [aspect, cropArea, cropEnabled, flipHorizontal, flipVertical, muted, rotation, segments, speed, volume]);
  const resultDuration = outputDuration(editSpec);

  useEffect(() => {
    let active = true;
    fetch(`/api/videos/${sourceAssetId}/playback-url`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Video tidak tersedia.");
        if (active) setUrl(result.data.url);
      })
      .catch((error) => active && toast.error(error.message));
    return () => { active = false; };
  }, [sourceAssetId]);

  useEffect(() => () => {
    abortRef.current?.abort();
    ffmpegRef.current?.terminate();
  }, []);

  const captureVideoRef = useCallback((ref) => {
    videoRef.current = ref?.current || null;
  }, []);

  function pause() {
    videoRef.current?.pause();
    setPlaying(false);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !selectedSegment) return;
    if (!video.paused) return pause();
    sequenceRef.current = null;
    if (video.currentTime < selectedSegment.startSeconds || video.currentTime >= selectedSegment.endSeconds) video.currentTime = selectedSegment.startSeconds;
    video.playbackRate = speed;
    video.volume = volume;
    video.muted = muted;
    try {
      await video.play();
      setPlaying(true);
    } catch {
      toast.error("Preview video tidak dapat diputar.");
    }
  }

  async function previewSequence() {
    const video = videoRef.current;
    if (!video || !segments.length) return;
    sequenceRef.current = 0;
    setSelectedIndex(0);
    video.currentTime = segments[0].startSeconds;
    video.playbackRate = speed;
    video.volume = volume;
    video.muted = muted;
    try {
      await video.play();
      setPlaying(true);
      toast.info("Preview rangkaian dimulai.");
    } catch {
      sequenceRef.current = null;
      toast.error("Preview video tidak dapat diputar.");
    }
  }

  function handleTimeUpdate(event) {
    const video = event.currentTarget;
    setTime(video.currentTime);
    const sequenceIndex = sequenceRef.current;
    const activeSegment = sequenceIndex === null ? segments[selectedIndex] : segments[sequenceIndex];
    if (!activeSegment || video.currentTime < activeSegment.endSeconds - 0.02) return;
    if (sequenceIndex !== null && sequenceIndex < segments.length - 1) {
      const next = sequenceIndex + 1;
      sequenceRef.current = next;
      setSelectedIndex(next);
      video.currentTime = segments[next].startSeconds;
      return;
    }
    sequenceRef.current = null;
    video.pause();
    setPlaying(false);
  }

  function seek(value) {
    const next = Math.max(0, Math.min(durationSeconds, Number(value) || 0));
    if (videoRef.current) videoRef.current.currentTime = next;
    sequenceRef.current = null;
    setTime(next);
  }

  function changeSpeed(value) {
    const next = Number(value);
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  function changeVolume(value) {
    const next = Number(value);
    setVolume(next);
    setMuted(next === 0);
    if (videoRef.current) { videoRef.current.volume = next; videoRef.current.muted = next === 0; }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  }

  function addSegment() {
    if (segments.length >= 10) return toast.error("Maksimal 10 segmen.");
    let start = Math.min(time, durationSeconds - 0.1);
    let end = Math.min(durationSeconds, start + 2);
    if (end - start < 0.1) { start = Math.max(0, durationSeconds - 2); end = durationSeconds; }
    setSegments((current) => [...current, newSegment(start, end)]);
    setSelectedIndex(segments.length);
    toast.success("Segmen baru ditambahkan.");
  }

  function removeSegment(index) {
    if (segments.length === 1) return;
    setSegments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSelectedIndex(Math.max(0, Math.min(index, segments.length - 2)));
    toast.success("Segmen dihapus dari timeline.");
  }

  function moveSegment(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= segments.length) return;
    setSegments((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex(target);
  }

  function changeBoundary(index, field, rawValue) {
    setSegments((current) => current.map((segment, itemIndex) => {
      if (itemIndex !== index) return segment;
      if (field === "startSeconds") return { ...segment, startSeconds: Math.max(0, Math.min(rawValue, segment.endSeconds - 0.1)) };
      return { ...segment, endSeconds: Math.min(durationSeconds, Math.max(rawValue, segment.startSeconds + 0.1)) };
    }));
  }

  function reset() {
    pause();
    setSegments([newSegment(0, durationSeconds)]);
    setSelectedIndex(0);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropArea(null);
    setCropEnabled(false);
    setAspectKey("source");
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    changeSpeed(1);
    changeVolume(1);
    setMuted(false);
    seek(0);
    toast.success("Pengaturan editor direset.");
  }

  async function renderVideo() {
    if (!url || pending) return;
    if (resultDuration <= 0 || resultDuration > MAX_VIDEO_DURATION_SECONDS) return toast.error("Durasi hasil harus antara 0,1 detik dan 10 menit.");
    pause();
    cancelledRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setProgress(2);
    setStatus("Memuat engine editor…");
    try {
      const [{ FFmpeg }, { fetchFile }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;
      ffmpeg.on("progress", ({ progress: value }) => setProgress(Math.max(20, Math.min(70, Math.round(20 + value * 50)))));
      ffmpeg.on("log", ({ message }) => { if (message.includes("frame=")) setStatus("Merender dan menggabungkan segmen…"); });
      const multi = window.crossOriginIsolated;
      await ffmpeg.load(multi ? {
        coreURL: "/api/media-core?asset=mt-js",
        wasmURL: "/api/media-core?asset=mt-wasm",
        workerURL: "/api/media-core?asset=mt-worker",
      } : {
        coreURL: "/api/media-core?asset=single-js",
        wasmURL: "/api/media-core?asset=single-wasm",
      });
      if (cancelledRef.current) throw new DOMException("Dibatalkan", "AbortError");
      setProgress(12);
      setStatus("Mengunduh video ke editor browser…");
      await ffmpeg.writeFile("input.mp4", await fetchFile(url));
      const hasAudio = await detectAudio(ffmpeg).catch(() => false);
      setProgress(20);
      setStatus("Menyiapkan timeline dan transformasi…");
      const exitCode = await ffmpeg.exec(buildFfmpegArgs(editSpec, { hasAudio }));
      if (exitCode !== 0) throw new Error("FFmpeg gagal merender video.");
      if (cancelledRef.current) throw new DOMException("Dibatalkan", "AbortError");
      const data = await ffmpeg.readFile("output.mp4");
      const file = new File([data.buffer], `edit-${crypto.randomUUID()}.mp4`, { type: "video/mp4" });
      if (!file.size) throw new Error("Hasil render kosong.");
      if (file.size > MAX_VIDEO_BYTES) throw new Error(`Hasil render ${formatBytes(file.size)} melebihi batas 100 MB. Kurangi durasi atau area video.`);
      setProgress(72);
      setStatus("Mengupload versi baru ke MinIO…");
      await uploadVideoAsset({
        courseId,
        purpose: "STUDENT_EDIT",
        file,
        durationSeconds: resultDuration,
        parentAssetId: sourceAssetId,
        submissionId,
        editSpec,
        onProgress: (value) => setProgress(72 + Math.round(value * 0.28)),
        signal: controller.signal,
      });
      toast.success("Versi edit baru berhasil disimpan dan diaktifkan.");
      router.refresh();
    } catch (error) {
      if (!cancelledRef.current) toast.error(error.message || "Editor kehabisan memori atau gagal memproses video.");
    } finally {
      ffmpegRef.current?.terminate();
      ffmpegRef.current = null;
      abortRef.current = null;
      setPending(false);
      setStatus("");
      setProgress(0);
    }
  }

  function cancel() {
    cancelledRef.current = true;
    abortRef.current?.abort();
    ffmpegRef.current?.terminate();
    ffmpegRef.current = null;
    setPending(false);
    setStatus("");
    setProgress(0);
    toast.info("Proses editing dibatalkan.");
  }

  return <div className="grid gap-5">
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><TriangleAlert className="mt-0.5 shrink-0" size={18}/><p>Render berlangsung di perangkat Anda. Source {formatBytes(sourceSizeBytes)} dapat menggunakan memori besar, terutama pada mobile. Jangan tutup halaman selama proses berlangsung.</p></div>

    <div ref={stageRef} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white"><div><strong className="text-sm">Preview editor</strong><p className="text-xs text-slate-400">Preview memakai transformasi global dan segmen terpilih.</p></div><Button type="button" size="sm" variant="secondary" onClick={previewSequence} disabled={pending || !url}><PlaySquare size={16}/> Preview rangkaian</Button></div>
      <div className="relative h-[280px] overflow-hidden bg-black sm:h-[420px]">
        {url ? <div className="size-full" style={{ transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})` }}><Cropper
          video={url}
          crop={crop}
          zoom={cropEnabled ? zoom : 1}
          rotation={rotation}
          aspect={previewAspect}
          objectFit="contain"
          showGrid={cropEnabled}
          onCropChange={cropEnabled ? setCrop : () => {}}
          onZoomChange={cropEnabled ? setZoom : () => {}}
          onCropComplete={(area) => setCropArea(area)}
          onMediaLoaded={(media) => {
            const width = media.naturalWidth || media.width;
            const height = media.naturalHeight || media.height;
            if (width && height) setSourceAspect(width / height);
          }}
          setVideoRef={captureVideoRef}
          mediaProps={{ crossOrigin: "anonymous", playsInline: true, controls: false, autoPlay: false, loop: false, muted, onTimeUpdate: handleTimeUpdate, onPlay: () => setPlaying(true), onPause: () => setPlaying(false) }}
        /></div> : <div className="grid size-full place-items-center text-sm text-slate-400"><LoaderCircle className="mr-2 inline animate-spin" size={16}/> Memuat video…</div>}
      </div>
      <PlayerControls name="editor" time={time} duration={durationSeconds} playing={playing} rate={speed} volume={volume} muted={muted} onToggle={togglePlayback} onSeek={seek} onPause={pause} onRate={changeSpeed} onVolume={changeVolume} onMute={toggleMute} onFullscreen={async () => { if (!document.fullscreenElement) await stageRef.current?.requestFullscreen(); else await document.exitFullscreen(); }}/>
    </div>

    <SegmentTimeline duration={durationSeconds} segments={segments} selectedIndex={selectedIndex} onSelect={(index) => { setSelectedIndex(index); seek(segments[index].startSeconds); }} onAdd={addSegment} onRemove={removeSegment} onMove={moveSegment} onBoundaryChange={changeBoundary} disabled={pending}/>

    <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-2">
      <div className="grid content-start gap-4"><div><h3 className="text-sm font-bold">Crop dan orientasi</h3><p className="text-xs text-slate-500">Berlaku ke seluruh segmen.</p></div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={cropEnabled} onChange={(event) => setCropEnabled(event.target.checked)} disabled={pending}/> Aktifkan crop</label>
        <div className="flex flex-wrap gap-2">{ASPECTS.map((item) => <Button type="button" size="sm" key={item.key} variant={aspectKey === item.key ? "secondary" : "outline"} onClick={() => { setAspectKey(item.key); setCropEnabled(true); }} disabled={pending}>{item.label}</Button>)}</div>
        <Field label={`Zoom ${zoom.toFixed(1)}x`}><input className="video-range w-full" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={pending || !cropEnabled}/></Field>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setRotation((value) => (value + 90) % 360)} disabled={pending}><RotateCw size={16}/> Rotasi {rotation}°</Button><Button type="button" size="sm" variant={flipHorizontal ? "secondary" : "outline"} onClick={() => setFlipHorizontal((value) => !value)} disabled={pending}><FlipHorizontal2 size={16}/> Horizontal</Button><Button type="button" size="sm" variant={flipVertical ? "secondary" : "outline"} onClick={() => setFlipVertical((value) => !value)} disabled={pending}><FlipVertical2 size={16}/> Vertikal</Button></div>
      </div>
      <div className="grid content-start gap-4"><div><h3 className="text-sm font-bold">Kecepatan dan audio</h3><p className="text-xs text-slate-500">Speed ikut diterapkan ke audio hasil render.</p></div>
        <Field label="Playback speed"><select className={inputClass} value={speed} onChange={(event) => changeSpeed(event.target.value)} disabled={pending}>{EDIT_SPEEDS.map((value) => <option key={value} value={value}>{value}x</option>)}</select></Field>
        <Field label={`Volume ${muted ? 0 : Math.round(volume * 100)}%`}><div className="flex items-center gap-3"><Volume2 size={18} className="text-slate-400"/><input className="video-range min-w-0 flex-1" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => changeVolume(event.target.value)} disabled={pending}/><Button type="button" size="sm" variant={muted ? "secondary" : "outline"} onClick={toggleMute} disabled={pending}>{muted ? "Aktifkan audio" : "Mute"}</Button></div></Field>
        <div className="rounded-xl bg-slate-50 p-4"><span className="text-xs text-slate-500">Estimasi hasil</span><strong className="mt-1 block text-lg">{formatDuration(resultDuration, true)}</strong><p className={`mt-1 text-xs ${resultDuration > MAX_VIDEO_DURATION_SECONDS ? "text-rose-600" : "text-slate-500"}`}>MP4 H.264/AAC · Maks. 1080p · Maks. 100 MB</p></div>
      </div>
    </div>

    {pending ? <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4"><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-cyan-900"><LoaderCircle className="animate-spin" size={15}/>{status}</span><strong>{progress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-cyan-100"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }}/></div></div> : null}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={reset} disabled={pending}><Undo2 size={17}/> Reset editor</Button><Button type="button" onClick={renderVideo} disabled={pending || !url || resultDuration > MAX_VIDEO_DURATION_SECONDS}><Save size={17}/> Render dan simpan versi</Button>{pending ? <Button type="button" variant="danger" onClick={cancel}><Square size={15}/> Batalkan</Button> : null}</div>
  </div>;
}
