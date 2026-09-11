"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import { PlayerControls } from "./player-controls";
import { clampSynchronizedTime, commonDuration as getCommonDuration, resyncTime, shouldCorrectDrift } from "./sync-utils";

const INITIAL_TRACK = { time: 0, duration: 0, playing: false, rate: 1, volume: 1, muted: false };

async function playbackUrl(assetId) {
  if (!assetId) return null;
  const response = await fetch(`/api/videos/${assetId}/playback-url`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Video tidak tersedia.");
  return result.data.url;
}

export function SynchronizedPlayer({ referenceAssetId, studentAssetId, courseId, trackProgress = false, onTimeChange, headerActions }) {
  const teacherRef = useRef(null);
  const studentRef = useRef(null);
  const teacherPaneRef = useRef(null);
  const studentPaneRef = useRef(null);
  const stageRef = useRef(null);
  const rafRef = useRef();
  const loopRef = useRef();
  const lastProgress = useRef(0);
  const sourceKey = `${referenceAssetId || ""}:${studentAssetId || ""}`;
  const [media, setMedia] = useState({ sourceKey: "", urls: { teacher: null, student: null }, error: "" });
  const [synced, setSynced] = useState(true);
  const [tracks, setTracks] = useState({ teacher: { ...INITIAL_TRACK }, student: { ...INITIAL_TRACK } });
  const tracksRef = useRef(tracks);
  const urls = media.sourceKey === sourceKey ? media.urls : { teacher: null, student: null };
  const error = media.sourceKey === sourceKey ? media.error : "";
  const commonDuration = getCommonDuration(tracks.teacher.duration, studentAssetId ? tracks.student.duration : 0);

  const updateTracks = useCallback((updater) => {
    setTracks((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      tracksRef.current = next;
      return next;
    });
  }, []);

  const updateTrack = useCallback((key, patch) => {
    updateTracks((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, [updateTracks]);

  useEffect(() => {
    let active = true;
    Promise.all([playbackUrl(referenceAssetId), playbackUrl(studentAssetId)])
      .then(([teacher, student]) => {
        if (!active) return;
        setMedia({ sourceKey, urls: { teacher, student }, error: "" });
        updateTracks({ teacher: { ...INITIAL_TRACK }, student: { ...INITIAL_TRACK } });
      })
      .catch((reason) => {
        if (active) setMedia({ sourceKey, urls: { teacher: null, student: null }, error: reason.message });
      });
    return () => { active = false; };
  }, [referenceAssetId, sourceKey, studentAssetId, updateTracks]);

  const pauseAll = useCallback(() => {
    teacherRef.current?.pause();
    studentRef.current?.pause();
    updateTracks((current) => ({
      teacher: { ...current.teacher, playing: false },
      student: { ...current.student, playing: false },
    }));
    cancelAnimationFrame(rafRef.current);
  }, [updateTracks]);

  const loop = useCallback(() => {
    const teacher = teacherRef.current;
    const student = studentRef.current;
    const teacherPlaying = Boolean(teacher && !teacher.paused && !teacher.ended);
    const studentPlaying = Boolean(student && !student.paused && !student.ended);
    const teacherTime = teacher?.currentTime || 0;
    const studentTime = student?.currentTime || 0;

    if (synced && teacherPlaying && student && shouldCorrectDrift(teacherTime, studentTime)) {
      student.currentTime = Math.min(teacherTime, student.duration || teacherTime);
    }
    if (synced && teacherPlaying && Number.isFinite(commonDuration) && commonDuration > 0 && teacherTime >= commonDuration - 0.03) {
      if (teacher) teacher.currentTime = commonDuration;
      if (student) student.currentTime = commonDuration;
      pauseAll();
      onTimeChange?.(commonDuration);
      return;
    }

    updateTracks((current) => ({
      teacher: { ...current.teacher, time: teacherTime, playing: teacherPlaying },
      student: { ...current.student, time: studentTime, playing: studentPlaying },
    }));
    onTimeChange?.(synced || !student ? teacherTime : studentTime);

    if (trackProgress && courseId && teacherPlaying && teacherTime - lastProgress.current >= 10) {
      lastProgress.current = teacherTime;
      fetch(`/api/progress/${courseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positionSeconds: teacherTime, durationSeconds: tracksRef.current.teacher.duration }) }).catch(() => {});
    }
    if (teacherPlaying || studentPlaying) rafRef.current = requestAnimationFrame(() => loopRef.current?.());
  }, [commonDuration, courseId, onTimeChange, pauseAll, synced, trackProgress, updateTracks]);

  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const startLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => loopRef.current?.());
  }, []);

  function videoFor(key) {
    return key === "teacher" ? teacherRef.current : studentRef.current;
  }

  function setElementState(key, video) {
    updateTrack(key, { time: video.currentTime || 0, duration: Number.isFinite(video.duration) ? video.duration : 0, playing: !video.paused && !video.ended, rate: video.playbackRate, volume: video.volume, muted: video.muted });
  }

  async function toggleTrack(key) {
    const video = videoFor(key);
    if (!video) return;
    if (!video.paused) {
      video.pause();
      updateTrack(key, { playing: false });
      return;
    }
    try {
      await video.play();
      updateTrack(key, { playing: true });
      startLoop();
    } catch (reason) {
      setMedia((current) => ({ ...current, error: reason.message || "Video tidak dapat diputar." }));
    }
  }

  function pauseTrack(key) {
    const video = videoFor(key);
    video?.pause();
    updateTrack(key, { playing: false });
  }

  function seekTrack(key, value) {
    const video = videoFor(key);
    const next = clampSynchronizedTime(value, tracksRef.current[key].duration);
    if (video) video.currentTime = next;
    updateTrack(key, { time: next });
    if (!synced && (key === "student" || !studentRef.current)) onTimeChange?.(next);
  }

  function setTrackRate(key, value) {
    const next = Number(value);
    const video = videoFor(key);
    if (video) video.playbackRate = next;
    updateTrack(key, { rate: next });
  }

  function setTrackVolume(key, value) {
    const next = Number(value);
    const video = videoFor(key);
    if (video) { video.volume = next; video.muted = next === 0; }
    updateTrack(key, { volume: next, muted: next === 0 });
  }

  function toggleTrackMute(key) {
    const next = !tracksRef.current[key].muted;
    const video = videoFor(key);
    if (video) video.muted = next;
    updateTrack(key, { muted: next });
  }

  async function toggleSynchronizedPlayback() {
    const teacher = teacherRef.current;
    const student = studentRef.current;
    if (!teacher) return;
    if (!teacher.paused) return pauseAll();
    const next = clampSynchronizedTime(tracksRef.current.teacher.time, commonDuration);
    teacher.currentTime = next;
    if (student) student.currentTime = Math.min(next, student.duration || next);
    try {
      const results = await Promise.allSettled([teacher.play(), student?.play()]);
      if (results[0].status === "rejected") throw results[0].reason;
      setElementState("teacher", teacher);
      if (student) setElementState("student", student);
      startLoop();
    } catch (reason) {
      setMedia((current) => ({ ...current, error: reason?.message || "Video tidak dapat diputar." }));
    }
  }

  function seekSynchronized(value) {
    const next = clampSynchronizedTime(value, commonDuration);
    if (teacherRef.current) teacherRef.current.currentTime = next;
    if (studentRef.current) studentRef.current.currentTime = Math.min(next, studentRef.current.duration || next);
    updateTracks((current) => ({ teacher: { ...current.teacher, time: next }, student: { ...current.student, time: next } }));
    onTimeChange?.(next);
  }

  function setSynchronizedRate(value) {
    const next = Number(value);
    [teacherRef.current, studentRef.current].forEach((video) => { if (video) video.playbackRate = next; });
    updateTracks((current) => ({ teacher: { ...current.teacher, rate: next }, student: { ...current.student, rate: next } }));
  }

  function setSynchronizedVolume(value) {
    const next = Number(value);
    [teacherRef.current, studentRef.current].forEach((video) => { if (video) { video.volume = next; video.muted = next === 0; } });
    updateTracks((current) => ({ teacher: { ...current.teacher, volume: next, muted: next === 0 }, student: { ...current.student, volume: next, muted: next === 0 } }));
  }

  function toggleSynchronizedMute() {
    const next = !tracksRef.current.teacher.muted;
    [teacherRef.current, studentRef.current].forEach((video) => { if (video) video.muted = next; });
    updateTracks((current) => ({ teacher: { ...current.teacher, muted: next }, student: { ...current.student, muted: next } }));
  }

  async function toggleSyncMode() {
    if (synced) {
      setSynced(false);
      return;
    }
    const teacher = teacherRef.current;
    const student = studentRef.current;
    if (!teacher) { setSynced(true); return; }
    const nextTime = resyncTime(teacher.currentTime, teacher.duration, student?.duration || 0);
    teacher.currentTime = nextTime;
    if (student) {
      student.currentTime = nextTime;
      student.playbackRate = teacher.playbackRate;
      student.volume = teacher.volume;
      student.muted = teacher.muted;
      if (teacher.paused) student.pause();
      else await student.play().catch(() => {});
    }
    updateTracks((current) => ({
      teacher: { ...current.teacher, time: nextTime, playing: !teacher.paused },
      student: { ...current.student, time: nextTime, playing: Boolean(student && !student.paused), rate: teacher.playbackRate, volume: teacher.volume, muted: teacher.muted },
    }));
    setSynced(true);
    onTimeChange?.(nextTime);
    if (!teacher.paused) startLoop();
  }

  function loaded(key, video) {
    const state = tracksRef.current[key];
    video.playbackRate = state.rate;
    video.volume = state.volume;
    video.muted = state.muted;
    setElementState(key, video);
  }

  async function fullscreen(targetRef) {
    if (!document.fullscreenElement) await targetRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  }

  return <section ref={stageRef} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><strong className="text-sm">Studio perbandingan</strong><p className="text-xs text-slate-400">{synced ? "Kontrol kedua video dari satu timeline" : "Setiap video memiliki kontrol custom sendiri"}</p></div><div className="flex items-center gap-2"><button type="button" aria-label={synced ? "Aktifkan kontrol terpisah" : "Aktifkan sinkronisasi"} onClick={toggleSyncMode} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${synced ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"}`}>{synced ? <LockKeyhole size={15}/> : <UnlockKeyhole size={15}/>} {synced ? "Sinkron aktif" : "Kontrol terpisah"}</button>{headerActions}</div></div>
    {error ? <div className="m-4 rounded-xl bg-rose-950/60 p-4 text-sm text-rose-200">{error}</div> : null}
    <div className="grid gap-px bg-slate-800 lg:grid-cols-2">
      <VideoPane label="Video teacher" subtitle="Reference video" paneRef={teacherPaneRef} videoRef={teacherRef} url={urls.teacher} onLoaded={(video) => loaded("teacher", video)} onPlay={() => { updateTrack("teacher", { playing: true }); startLoop(); }} onPause={() => updateTrack("teacher", { playing: false })} controls={!synced ? <PlayerControls name="Video teacher" {...tracks.teacher} compact onToggle={() => toggleTrack("teacher")} onSeek={(value) => seekTrack("teacher", value)} onPause={() => pauseTrack("teacher")} onRate={(value) => setTrackRate("teacher", value)} onVolume={(value) => setTrackVolume("teacher", value)} onMute={() => toggleTrackMute("teacher")} onFullscreen={() => fullscreen(teacherPaneRef)} /> : null} />
      <VideoPane label="Video student" subtitle="Attempt aktif" paneRef={studentPaneRef} videoRef={studentRef} url={urls.student} onLoaded={(video) => loaded("student", video)} onPlay={() => { updateTrack("student", { playing: true }); startLoop(); }} onPause={() => updateTrack("student", { playing: false })} controls={!synced && urls.student ? <PlayerControls name="Video student" {...tracks.student} compact onToggle={() => toggleTrack("student")} onSeek={(value) => seekTrack("student", value)} onPause={() => pauseTrack("student")} onRate={(value) => setTrackRate("student", value)} onVolume={(value) => setTrackVolume("student", value)} onMute={() => toggleTrackMute("student")} onFullscreen={() => fullscreen(studentPaneRef)} /> : null} empty="Upload video Anda untuk mulai membandingkan." />
    </div>
    {synced ? <PlayerControls name="sinkron" {...tracks.teacher} duration={commonDuration} onToggle={toggleSynchronizedPlayback} onSeek={seekSynchronized} onPause={pauseAll} onRate={setSynchronizedRate} onVolume={setSynchronizedVolume} onMute={toggleSynchronizedMute} onFullscreen={() => fullscreen(stageRef)} /> : null}
  </section>;
}

function VideoPane({ label, subtitle, paneRef, videoRef, url, onLoaded, onPlay, onPause, controls, empty }) {
  return <div ref={paneRef} className="relative min-h-64 bg-black"><div className="absolute left-3 top-3 z-10 rounded-lg bg-black/60 px-3 py-2 backdrop-blur"><strong className="block text-xs">{label}</strong><span className="text-[11px] text-slate-400">{subtitle}</span></div>{url ? <><video ref={videoRef} src={url} crossOrigin="anonymous" playsInline controls={false} onLoadedMetadata={(event) => onLoaded(event.currentTarget)} onPlay={onPlay} onPause={onPause} onEnded={onPause} className="aspect-video w-full object-contain" />{controls}</> : <div className="grid aspect-video place-items-center p-8 text-center text-sm text-slate-500"><span>{empty || "Memuat video…"}</span></div>}</div>;
}
