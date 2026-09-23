"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, UserCircle, X } from "lucide-react";

export function MobileNav({ links }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeMenu = useCallback(() => { setOpen(false); triggerRef.current?.focus(); }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("button")?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") closeMenu();
      if (event.key !== "Tab") return;
      const focusable = [...panelRef.current.querySelectorAll("a, button")];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [open, closeMenu]);

  return <div className="lg:hidden">
    <button ref={triggerRef} type="button" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="grid size-11 place-items-center rounded-xl bg-slate-800 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
      {open ? <X size={22} /> : <Menu size={22} />}
    </button>
    {open ? <>
      <button type="button" aria-label="Tutup menu navigasi" className="fixed inset-0 z-40 bg-slate-950/60" onClick={closeMenu} />
      <nav ref={panelRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigasi utama" className="fixed inset-x-0 top-0 z-50 max-h-dvh overflow-y-auto bg-slate-950 p-4 pb-8 shadow-2xl">
        <div className="mb-4 flex items-center justify-between text-base font-bold text-white"><span>Menu GerakBelajar</span><button type="button" aria-label="Tutup menu" onClick={closeMenu} className="grid size-11 place-items-center rounded-xl bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-400"><X size={22}/></button></div>
        <div className="grid gap-2">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-900 px-4 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-cyan-400">{label}</Link>)}<Link href="/profile" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-900 px-4 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-cyan-400"><UserCircle size={20}/> Profil</Link></div>
      </nav>
    </> : null}
  </div>;
}
