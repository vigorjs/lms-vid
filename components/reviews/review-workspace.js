"use client";
import { useActionState, useMemo, useState } from "react";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { saveReview } from "@/features/reviews/actions";
import { SynchronizedPlayer } from "@/components/video/synchronized-player";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton, StateToast } from "@/components/form-feedback";
import { formatDuration } from "@/lib/utils";

export function ReviewWorkspace({ submission }) {
  const [currentTime, setCurrentTime] = useState(0);
  return <div className="grid gap-6"><SynchronizedPlayer referenceAssetId={submission.referenceVideoId} studentAssetId={submission.activeVideoId} onTimeChange={setCurrentTime} /><ReviewForm submission={submission} currentTime={currentTime} /></div>;
}

function ReviewForm({ submission, currentTime }) {
  const existing = submission.review; const [state, action] = useActionState(saveReview, null);
  const [scores, setScores] = useState(submission.course.rubricCriteria.map((criterion) => ({ criterionId: criterion.id, title: criterion.title, weight: criterion.weight, score: existing?.scores.find((item) => item.criterionId === criterion.id || item.criterionTitle === criterion.title)?.score ?? 75 })));
  const [comments, setComments] = useState(existing?.comments.map(({ timestampSeconds, comment }) => ({ timestampSeconds, comment })) || []);
  const total = useMemo(() => scores.reduce((sum, item) => sum + Number(item.score) * item.weight / 100, 0), [scores]);
  function changeScore(id, value) { setScores((items) => items.map((item) => item.criterionId === id ? { ...item, score: Math.max(0, Math.min(100, Number(value))) } : item)); }
  function addComment() { setComments((items) => [...items, { timestampSeconds: Number(currentTime.toFixed(2)), comment: "" }]); }
  return <form action={action} className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><StateToast state={state} /><input type="hidden" name="submissionId" value={submission.id}/><input type="hidden" name="scores" value={JSON.stringify(scores.map(({ criterionId, score }) => ({ criterionId, score })))}/><input type="hidden" name="comments" value={JSON.stringify(comments)}/>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Rubric assessment</p><h2 className="mt-1 text-xl font-bold">Nilai attempt {submission.attemptNumber}</h2></div><div className="rounded-2xl bg-slate-950 px-5 py-3 text-right text-white"><span className="block text-xs text-slate-400">Nilai akhir</span><strong className="text-2xl text-cyan-300">{total.toFixed(1)}</strong><span className="ml-2 text-xs text-slate-400">/ 100</span></div></div>
    <div className="grid gap-3">{scores.map((item) => <div key={item.criterionId} className="grid items-center gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_180px_70px]"><div><strong className="text-sm">{item.title}</strong><p className="text-xs text-slate-500">Bobot {item.weight}%</p></div><input aria-label={`Nilai ${item.title}`} className="accent-cyan-500" type="range" min="0" max="100" value={item.score} onChange={(event) => changeScore(item.criterionId, event.target.value)} /><input aria-label={`Angka nilai ${item.title}`} className={inputClass} type="number" min="0" max="100" value={item.score} onChange={(event) => changeScore(item.criterionId, event.target.value)} /></div>)}</div>
    <div className="grid gap-4 md:grid-cols-[220px_1fr]"><Field label="Keputusan"><select name="outcome" className={inputClass} defaultValue={existing?.outcome || (total >= submission.course.passThreshold ? "PASSED" : "REVISION_REQUIRED")}><option value="PASSED" disabled={total < submission.course.passThreshold}>Lulus</option><option value="REVISION_REQUIRED">Perlu revisi</option></select></Field><Field label="Feedback umum"><textarea name="generalFeedback" className={textareaClass} defaultValue={existing?.generalFeedback} placeholder="Ringkas kekuatan dan bagian yang perlu diperbaiki…" required /></Field></div>
    <div><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Feedback bertimestamp</h3><p className="text-xs text-slate-500">Posisi player saat ini: {formatDuration(currentTime, true)}</p></div><Button type="button" variant="outline" onClick={addComment}><MessageSquarePlus size={17}/> Tambah di timestamp ini</Button></div><div className="mt-3 grid gap-3">{comments.map((item, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[120px_1fr_40px]"><input aria-label="Timestamp feedback" className={inputClass} type="number" min="0" max={submission.activeVideo.durationSeconds || 600} step="0.01" value={item.timestampSeconds} onChange={(event) => setComments((items) => items.map((entry, i) => i === index ? { ...entry, timestampSeconds: Number(event.target.value) } : entry))}/><input aria-label="Komentar timestamp" className={inputClass} value={item.comment} onChange={(event) => setComments((items) => items.map((entry, i) => i === index ? { ...entry, comment: event.target.value } : entry))} placeholder="Apa yang terjadi pada gerakan ini?" required/><Button type="button" variant="ghost" className="px-0 text-rose-600" onClick={() => setComments((items) => items.filter((_, i) => i !== index))}><Trash2 size={17}/></Button></div>)}{!comments.length ? <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Putar video ke momen tertentu, lalu tambahkan feedback.</div> : null}</div></div>
    <div className="flex justify-end"><SubmitButton pendingLabel="Mempublikasikan…">Publikasikan review</SubmitButton></div>
  </form>;
}
