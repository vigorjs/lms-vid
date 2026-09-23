import Link from "next/link";
import { BookOpen, ClipboardCheck, FolderTree, LayoutDashboard, ShieldCheck, UserCircle, Users, Video } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { MobileNav } from "./mobile-nav";
const baseLinks = [["/dashboard", "Dashboard", LayoutDashboard], ["/courses", "Jelajahi course", BookOpen]];
function linksFor(role) {
  if (role === "ADMIN") return [...baseLinks, ["/admin/users", "Pengguna", Users], ["/admin/categories", "Kategori", FolderTree], ["/admin/courses", "Semua course", Video], ["/teacher/reviews", "Review", ClipboardCheck]];
  if (role === "TEACHER") return [...baseLinks, ["/teacher/courses", "Course saya", Video], ["/teacher/reviews", "Review student", ClipboardCheck]];
  return baseLinks;
}
export function AppShell({ user, children }) {
  const links = linksFor(user.role);
  return <div className="min-h-screen min-w-0 bg-slate-50 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3">Lewati navigasi</a>
    <aside className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-slate-200 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center justify-between gap-2 lg:block"><Link href="/dashboard" className="flex min-w-0 items-center gap-3 text-white"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-400 text-slate-950"><ShieldCheck size={22} /></span><span><strong className="block text-base">GerakBelajar</strong><small className="hidden text-slate-300 sm:block">Video Learning Studio</small></span></Link><div className="flex items-center gap-2 lg:hidden"><LogoutButton compact /><MobileNav links={links.map(([href, label]) => [href, label])} /></div></div>
      <nav aria-label="Navigasi utama" className="mt-8 hidden lg:grid">{links.map(([href, label, Icon]) => <Link className="nav-link" href={href} key={href}><Icon size={18} />{label}</Link>)}</nav>
      <div className="mt-3 hidden border-t border-slate-800 pt-4 lg:block"><Link href="/profile" className="nav-link"><UserCircle size={18} /> Profil</Link><LogoutButton /><div className="mt-4 rounded-xl bg-slate-900 p-3 text-xs text-slate-400"><span className="block truncate font-semibold text-slate-200">{user.name}</span><span className="block truncate">{user.email}</span></div></div>
    </aside>
    <main id="main-content" className="min-w-0"><header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8"><div className="min-w-0"><span className="text-xs font-semibold uppercase tracking-widest text-cyan-700">{user.role}</span><p className="truncate text-base text-slate-700">Selamat belajar, {user.name.split(" ")[0]}</p></div><Link href="/profile" aria-label="Buka profil" className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 focus-visible:ring-2 focus-visible:ring-cyan-600"><UserCircle size={22} /></Link></header><div className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-5 sm:px-6 lg:p-8">{children}</div></main>
  </div>;
}
