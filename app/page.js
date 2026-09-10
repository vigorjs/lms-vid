import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function Home() {
  redirect((await getCurrentUser()) ? "/dashboard" : "/login");
}
