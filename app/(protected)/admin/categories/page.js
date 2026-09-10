import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/admin/category-form";
import { toggleCategory } from "@/features/categories/actions";

export const metadata = { title: "Kategori" };
export default async function CategoriesPage() {
  await requireUser(["ADMIN"]); const categories = await db.category.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } });
  return <><PageHeader eyebrow="Katalog" title="Kategori course" description="Kategori hanya dikelola admin agar katalog tetap konsisten." /><div className="grid gap-6 xl:grid-cols-[380px_1fr]"><Card className="h-fit"><CardHeader><h2 className="font-bold">Kategori baru</h2></CardHeader><CardContent><CategoryForm /></CardContent></Card><div className="grid content-start gap-3">{categories.map((category) => <Card key={category.id}><CardContent className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{category.name}</h3><Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Aktif" : "Nonaktif"}</Badge></div><p className="mt-1 text-sm text-slate-500">{category.description || "Tanpa deskripsi"} · {category._count.courses} course</p></div><form action={toggleCategory}><input type="hidden" name="id" value={category.id} /><Button size="sm" variant="outline">{category.isActive ? "Nonaktifkan" : "Aktifkan"}</Button></form></CardContent></Card>)}</div></div></>;
}
