import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { AppError, errorResponse } from "@/lib/errors";
import { courseAccessWhere } from "@/lib/courses/access";
import { saveWatchProgress } from "@/lib/progress/update";

const schema = z.object({ positionSeconds: z.coerce.number().min(0), durationSeconds: z.coerce.number().positive().max(600) });
export async function PATCH(request, { params }) {
  try {
    const user = await authorize(["STUDENT"]); const { courseId } = await params; const values = schema.parse(await request.json());
    const course = await db.course.findFirst({ where: { id: courseId, ...courseAccessWhere(user) }, select: { id: true } }); if (!course) throw new AppError("Course tidak ditemukan.", 404, "NOT_FOUND");
    await db.enrollment.upsert({ where: { courseId_studentId: { courseId, studentId: user.id } }, create: { courseId, studentId: user.id }, update: { lastOpenedAt: new Date() } });
    const percent = await saveWatchProgress(db, { courseId, studentId: user.id, ...values });
    return Response.json({ data: { percent } });
  } catch (error) { return errorResponse(error); }
}
