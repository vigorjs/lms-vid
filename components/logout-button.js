"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

export function LogoutButton() {
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

  return <button onClick={logout} disabled={pending} className="nav-link w-full text-left">{pending ? <LoaderCircle className="animate-spin" size={18} /> : <LogOut size={18} />} {pending ? "Keluar…" : "Keluar"}</button>;
}
