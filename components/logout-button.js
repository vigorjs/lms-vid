"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
export function LogoutButton() {
  const [pending, setPending] = useState(false); const router = useRouter();
  async function logout() { setPending(true); await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
  return <button onClick={logout} disabled={pending} className="nav-link w-full text-left"><LogOut size={18} /> {pending ? "Keluar…" : "Keluar"}</button>;
}
