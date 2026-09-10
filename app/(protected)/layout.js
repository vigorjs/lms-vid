import { requireUser } from "@/lib/auth/dal";
import { AppShell } from "@/components/app-shell";
export default async function ProtectedLayout({ children }) { const user = await requireUser(); return <AppShell user={user}>{children}</AppShell>; }
