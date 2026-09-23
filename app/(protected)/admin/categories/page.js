import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButtonForm } from "@/components/form-feedback";
import { CategoryForm } from "@/components/admin/category-form";
import { toggleCategory } from "@/features/categories/actions";

export const metadata = { title: "Kategori" };
export default async function CategoriesPage() {
  await requireUser(["ADMIN"]); const categories = await db.category.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } });
  return <><PageHeader eyebrow="Katalog" title="Kategori course" description="Kategori hanya dikelola admin agar katalog tetap konsisten." /><div className="grid gap-6 xl:grid-cols-[380px_1fr]"><Card className="h-fit"><CardHeader><h2 className="font-bold">Kategori baru</h2></CardHeader><CardContent><CategoryForm /></CardContent></Card><div className="grid min-w-0 content-start gap-3">{categories.map((category) => <Card key={category.id}><CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-bold text-slate-900">{category.name}</h3><Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Aktif" : "Nonaktif"}</Badge></div><p className="mt-1 break-words text-base text-slate-700">{category.description || "Tanpa deskripsi"} · {category._count.courses} course</p></div><ActionButtonForm action={toggleCategory} fields={{ id: category.id }} pendingLabel={category.isActive ? "Menonaktifkan…" : "Mengaktifkan…"} size="sm" variant="outline">{category.isActive ? "Nonaktifkan" : "Aktifkan"}</ActionButtonForm></CardContent></Card>)}</div></div></>;
}
