"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";

export async function submitAttempt(_state, formData) {
  try {
    const user = await authorize(["STUDENT"]); const id = String(formData.get("id")); const submission = await db.submission.findUniqueOrThrow({ where: { id }, include: { activeVideo: true } });
    if (submission.studentId !== user.id) throw new Error("Attempt ini bukan milik Anda.");
    if (submission.status !== "DRAFT") throw new Error("Attempt ini sudah pernah dikirim.");
    if (submission.activeVideo.status !== "READY") throw new Error("Video belum siap untuk dikirim.");
    await db.submission.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date() } }); revalidatePath(`/courses/${submission.courseId}`); revalidatePath("/dashboard");
    return { ok: true, message: "Attempt berhasil dikirim untuk direview." };
  } catch (error) {
    return { ok: false, message: error.message || "Gagal mengirim attempt." };
  }
}
