export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">{Icon ? <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Icon size={24} /></span> : null}<h3 className="mt-4 font-bold text-slate-900">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div>;
}
