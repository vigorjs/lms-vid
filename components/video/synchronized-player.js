"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Gauge, LockKeyhole, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward, UnlockKeyhole, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { clampSynchronizedTime, commonDuration as getCommonDuration, shouldCorrectDrift } from "./sync-utils";

async function playbackUrl(assetId) {
  if (!assetId) return null; const response = await fetch(`/api/videos/${assetId}/playback-url`); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Video tidak tersedia."); return result.data.url;
}

export function SynchronizedPlayer({ referenceAssetId, studentAssetId, courseId, trackProgress = false, onTimeChange, headerActions }) {
  const teacherRef = useRef(null); const studentRef = useRef(null); const stageRef = useRef(null); const rafRef = useRef(); const loopRef = useRef(); const lastProgress = useRef(0);
  const [urls, setUrls] = useState({ teacher: null, student: null }); const [error, setError] = useState(""); const [playing, setPlaying] = useState(false); const [synced, setSynced] = useState(true); const [time, setTime] = useState(0); const [durations, setDurations] = useState({ teacher: 0, student: 0 }); const [rate, setRate] = useState(1); const [volume, setVolume] = useState(1); const [muted, setMuted] = useState(false);
  const commonDuration = getCommonDuration(durations.teacher, studentAssetId ? durations.student : 0);

  useEffect(() => { let active = true; Promise.all([playbackUrl(referenceAssetId), playbackUrl(studentAssetId)]).then(([teacher, student]) => active && setUrls({ teacher, student })).catch((reason) => active && setError(reason.message)); return () => { active = false; }; }, [referenceAssetId, studentAssetId]);

  const pauseAll = useCallback(() => { teacherRef.current?.pause(); studentRef.current?.pause(); setPlaying(false); cancelAnimationFrame(rafRef.current); }, []);
  const loop = useCallback(() => {
    const teacher = teacherRef.current; const student = studentRef.current; if (!teacher || teacher.paused) return;
    const current = teacher.currentTime; setTime(current); onTimeChange?.(current);
    if (synced && student && shouldCorrectDrift(current, student.currentTime)) student.currentTime = Math.min(current, student.duration || current);
    if (synced && Number.isFinite(commonDuration) && commonDuration > 0 && current >= commonDuration - 0.03) { pauseAll(); return; }
    if (trackProgress && courseId && current - lastProgress.current >= 10) { lastProgress.current = current; fetch(`/api/progress/${courseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positionSeconds: current, durationSeconds: durations.teacher }) }).catch(() => {}); }
    rafRef.current = requestAnimationFrame(() => loopRef.current?.());
  }, [commonDuration, courseId, durations.teacher, onTimeChange, pauseAll, synced, trackProgress]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  async function toggle() {
    if (playing) return pauseAll(); const teacher = teacherRef.current; if (!teacher) return; teacher.currentTime = time; teacher.playbackRate = rate;
    if (synced && studentRef.current) { studentRef.current.currentTime = Math.min(time, studentRef.current.duration || time); studentRef.current.playbackRate = rate; await Promise.allSettled([teacher.play(), studentRef.current.play()]); } else await teacher.play();
    setPlaying(true); rafRef.current = requestAnimationFrame(() => loopRef.current?.());
  }
  function seek(value) { const next = clampSynchronizedTime(value, commonDuration); if (teacherRef.current) teacherRef.current.currentTime = next; if (synced && studentRef.current) studentRef.current.currentTime = Math.min(next, studentRef.current.duration || next); setTime(next); onTimeChange?.(next); }
  function setPlaybackRate(value) { const next = Number(value); setRate(next); if (teacherRef.current) teacherRef.current.playbackRate = next; if (studentRef.current) studentRef.current.playbackRate = next; }
  function setAudio(value) { const next = Number(value); setVolume(next); setMuted(next === 0); [teacherRef.current, studentRef.current].forEach((video) => { if (video) { video.volume = next; video.muted = next === 0; } }); }
  function toggleMute() { const next = !muted; setMuted(next); [teacherRef.current, studentRef.current].forEach((video) => { if (video) video.muted = next; }); }
  function loaded(key, video) { setDurations((current) => ({ ...current, [key]: Number.isFinite(video.duration) ? video.duration : 0 })); video.playbackRate = rate; video.volume = volume; video.muted = muted; }
  async function fullscreen() { if (!document.fullscreenElement) await stageRef.current?.requestFullscreen(); else await document.exitFullscreen(); }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return <section ref={stageRef} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><strong className="text-sm">Studio perbandingan</strong><p className="text-xs text-slate-400">Kontrol kedua video dari satu timeline</p></div><div className="flex items-center gap-2"><button onClick={() => { pauseAll(); setSynced(!synced); }} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${synced ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{synced ? <LockKeyhole size={15}/> : <UnlockKeyhole size={15}/>} {synced ? "Sinkron aktif" : "Kontrol terpisah"}</button>{headerActions}</div></div>
    {error ? <div className="m-4 rounded-xl bg-rose-950/60 p-4 text-sm text-rose-200">{error}</div> : null}<div className="grid gap-px bg-slate-800 lg:grid-cols-2"><VideoPane label="Video teacher" subtitle="Reference video" videoRef={teacherRef} url={urls.teacher} onLoaded={(video) => loaded("teacher", video)} controls={!synced} /><VideoPane label="Video student" subtitle="Attempt aktif" videoRef={studentRef} url={urls.student} onLoaded={(video) => loaded("student", video)} controls={!synced} empty="Upload video Anda untuk mulai membandingkan." /></div>
    <div className="grid gap-3 border-t border-slate-800 p-4"><div className="flex items-center gap-3"><span className="w-14 text-right font-mono text-xs text-cyan-300">{formatDuration(time, true)}</span><input aria-label="Timeline sinkron" className="video-range h-5 min-w-0 flex-1" type="range" min="0" max={Number.isFinite(commonDuration) && commonDuration > 0 ? commonDuration : 0} step="0.01" value={Math.min(time, Number.isFinite(commonDuration) ? commonDuration : 0)} onChange={(event) => seek(event.target.value)} /><span className="w-14 font-mono text-xs text-slate-400">{formatDuration(Number.isFinite(commonDuration) ? commonDuration : 0)}</span></div>
      <div className="flex flex-wrap items-center justify-center gap-1.5"><Control label="Mundur 5 detik" onClick={() => seek(time - 5)}><RotateCcw size={18}/></Control><Control label="Frame sebelumnya" onClick={() => { pauseAll(); seek(time - 1/30); }}><SkipBack size={18}/></Control><button aria-label={playing ? "Pause" : "Play"} onClick={toggle} className="grid size-11 place-items-center rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button><Control label="Frame berikutnya" onClick={() => { pauseAll(); seek(time + 1/30); }}><SkipForward size={18}/></Control><Control label="Maju 5 detik" onClick={() => seek(time + 5)}><RotateCw size={18}/></Control><span className="mx-1 h-6 w-px bg-slate-700"/><Control label={muted ? "Aktifkan suara" : "Mute"} onClick={toggleMute}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</Control><input aria-label="Volume" className="video-range w-20" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => setAudio(event.target.value)} /><span className="mx-1 h-6 w-px bg-slate-700"/><Gauge size={17} className="text-slate-400"/><select aria-label="Kecepatan playback" value={rate} onChange={(event) => setPlaybackRate(event.target.value)} className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs">{[0.25,0.5,0.75,1,1.25,1.5,2].map((value) => <option key={value} value={value}>{value}x</option>)}</select><Control label="Fullscreen" onClick={fullscreen}><Expand size={18}/></Control></div>
    </div></section>;
}

function VideoPane({ label, subtitle, videoRef, url, onLoaded, controls, empty }) {
  return <div className="relative min-h-64 bg-black"><div className="absolute left-3 top-3 z-10 rounded-lg bg-black/60 px-3 py-2 backdrop-blur"><strong className="block text-xs">{label}</strong><span className="text-[11px] text-slate-400">{subtitle}</span></div>{url ? <video ref={videoRef} src={url} crossOrigin="anonymous" playsInline controls={controls} onLoadedMetadata={(event) => onLoaded(event.currentTarget)} className="aspect-video h-full w-full object-contain" /> : <div className="grid aspect-video place-items-center p-8 text-center text-sm text-slate-500"><span>{empty || "Memuat video…"}</span></div>}</div>;
}
function Control({ label, onClick, children }) { return <button aria-label={label} title={label} onClick={onClick} className="grid size-9 place-items-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white">{children}</button>; }
