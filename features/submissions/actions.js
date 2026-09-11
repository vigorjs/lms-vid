"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { courseAccessWhere } from "@/lib/courses/access";
import { actionErrorMessage } from "@/lib/errors";

export async function submitAttempt(_state, formData) {
  try {
    const user = await authorize(["STUDENT"]); const id = String(formData.get("id")); const submission = await db.submission.findFirst({ where: { id, studentId: user.id, course: courseAccessWhere(user) }, include: { activeVideo: true } });
    if (!submission) throw new Error("Attempt tidak ditemukan atau akses course telah dicabut.");
    if (submission.status !== "DRAFT") throw new Error("Attempt ini sudah pernah dikirim.");
    if (submission.activeVideo.status !== "READY") throw new Error("Video belum siap untuk dikirim.");
    await db.submission.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date() } }); revalidatePath(`/courses/${submission.courseId}`); revalidatePath("/dashboard");
    return { ok: true, message: "Attempt berhasil dikirim untuk direview." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Gagal mengirim attempt.") };
  }
}
