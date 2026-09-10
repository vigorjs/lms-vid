import { deleteSession } from "@/lib/auth/session";

export async function POST() {
  await deleteSession();
  return Response.json({ data: { success: true } });
}
