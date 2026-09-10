import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/token";

const publicPaths = ["/login", "/unauthorized", "/api/auth/login", "/api/health", "/api/media-core"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    const url = new URL("/login", request.url);
    if (!pathname.startsWith("/api/")) url.searchParams.set("next", pathname);
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 })
      : NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") return NextResponse.redirect(new URL("/unauthorized", request.url));
  if (pathname.startsWith("/teacher") && !["ADMIN", "TEACHER"].includes(session.role)) return NextResponse.redirect(new URL("/unauthorized", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|js)$).*)"],
};
