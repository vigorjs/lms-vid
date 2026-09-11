import { Expand, Gauge, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { frameStep } from "./sync-utils";

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({ name, time, duration, playing, rate, volume, muted, onToggle, onSeek, onPause, onRate, onVolume, onMute, onFullscreen, compact = false }) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeTime = Math.min(Math.max(0, time || 0), safeDuration);
  return <div className={`grid gap-3 border-t border-slate-800 bg-slate-950 ${compact ? "p-3" : "p-4"}`}>
    <div className="flex items-center gap-3"><span className="w-14 text-right font-mono text-xs text-cyan-300">{formatDuration(safeTime, true)}</span><input aria-label={`Timeline ${name}`} className="video-range h-5 min-w-0 flex-1" type="range" min="0" max={safeDuration} step="0.01" value={safeTime} onChange={(event) => onSeek(event.target.value)} /><span className="w-14 font-mono text-xs text-slate-400">{formatDuration(safeDuration, true)}</span></div>
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <Control label={`Mundur 5 detik ${name}`} onClick={() => onSeek(safeTime - 5)}><RotateCcw size={18}/></Control>
      <Control label={`Frame sebelumnya ${name}`} onClick={() => { onPause(); onSeek(frameStep(safeTime, -1, safeDuration)); }}><SkipBack size={18}/></Control>
      <button type="button" aria-label={`${playing ? "Pause" : "Play"} ${name}`} onClick={onToggle} className="grid size-11 place-items-center rounded-full bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button>
      <Control label={`Frame berikutnya ${name}`} onClick={() => { onPause(); onSeek(frameStep(safeTime, 1, safeDuration)); }}><SkipForward size={18}/></Control>
      <Control label={`Maju 5 detik ${name}`} onClick={() => onSeek(safeTime + 5)}><RotateCw size={18}/></Control>
      <span className="mx-1 h-6 w-px bg-slate-700"/>
      <Control label={`${muted ? "Aktifkan suara" : "Mute"} ${name}`} onClick={onMute}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</Control>
      <input aria-label={`Volume ${name}`} className="video-range w-20" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => onVolume(event.target.value)} />
      <span className="mx-1 h-6 w-px bg-slate-700"/>
      <Gauge size={17} className="text-slate-400"/>
      <select aria-label={`Kecepatan playback ${name}`} value={rate} onChange={(event) => onRate(event.target.value)} className="h-9 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">{PLAYBACK_RATES.map((value) => <option key={value} value={value}>{value}x</option>)}</select>
      <Control label={`Fullscreen ${name}`} onClick={onFullscreen}><Expand size={18}/></Control>
    </div>
  </div>;
}

function Control({ label, onClick, children }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-9 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">{children}</button>;
}
