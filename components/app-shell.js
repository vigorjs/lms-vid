import Link from "next/link";
import { BookOpen, ClipboardCheck, FolderTree, LayoutDashboard, ShieldCheck, UserCircle, Users, Video } from "lucide-react";
import { LogoutButton } from "./logout-button";
const baseLinks = [["/dashboard", "Dashboard", LayoutDashboard], ["/courses", "Jelajahi course", BookOpen]];
function linksFor(role) {
  if (role === "ADMIN") return [...baseLinks, ["/admin/users", "Pengguna", Users], ["/admin/categories", "Kategori", FolderTree], ["/admin/courses", "Semua course", Video], ["/teacher/reviews", "Review", ClipboardCheck]];
  if (role === "TEACHER") return [...baseLinks, ["/teacher/courses", "Course saya", Video], ["/teacher/reviews", "Review student", ClipboardCheck]];
  return baseLinks;
}
export function AppShell({ user, children }) {
  return <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-slate-200 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center justify-between lg:block"><Link href="/dashboard" className="flex items-center gap-3 text-white"><span className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-slate-950"><ShieldCheck size={22} /></span><span><strong className="block text-base">GerakBelajar</strong><small className="text-slate-400">Video Learning Studio</small></span></Link><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold lg:hidden">{user.role}</span></div>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:grid lg:overflow-visible">{linksFor(user.role).map(([href, label, Icon]) => <Link className="nav-link whitespace-nowrap" href={href} key={href}><Icon size={18} />{label}</Link>)}</nav>
      <div className="mt-3 hidden border-t border-slate-800 pt-4 lg:block"><Link href="/profile" className="nav-link"><UserCircle size={18} /> Profil</Link><LogoutButton /><div className="mt-4 rounded-xl bg-slate-900 p-3 text-xs text-slate-400"><span className="block truncate font-semibold text-slate-200">{user.name}</span><span className="block truncate">{user.email}</span></div></div>
    </aside>
    <main className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8"><div><span className="text-xs font-semibold uppercase tracking-widest text-cyan-700">{user.role}</span><p className="text-sm text-slate-500">Selamat belajar, {user.name.split(" ")[0]}</p></div><Link href="/profile" className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700"><UserCircle size={22} /></Link></header><div className="mx-auto w-full max-w-[1500px] p-4 md:p-6 lg:p-8">{children}</div></main>
  </div>;
}
