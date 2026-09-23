"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

export function LogoutButton({ compact = false }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function logout() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout gagal.");
      toast.success("Anda berhasil keluar.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Logout gagal. Coba lagi.");
      setPending(false);
    }
  }

  return <button onClick={logout} disabled={pending} aria-label={compact ? "Keluar" : undefined} className={`nav-link ${compact ? "size-11 shrink-0 justify-center bg-slate-800 p-0 text-white" : "w-full text-left"}`}>{pending ? <LoaderCircle className="animate-spin" size={18} /> : <LogOut size={18} />}{compact ? <span className="sr-only">{pending ? "Keluar…" : "Keluar"}</span> : <span>{pending ? "Keluar…" : "Keluar"}</span>}</button>;
}
