export function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div>{eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p> : null}<h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{title}</h1>{description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}</div>{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}</div>;
}
