import { readFile } from "node:fs/promises";
import path from "node:path";

const allowed = {
  "single-js": ["@ffmpeg", "core", "dist", "umd", "ffmpeg-core.js", "text/javascript"],
  "single-wasm": ["@ffmpeg", "core", "dist", "umd", "ffmpeg-core.wasm", "application/wasm"],
  "mt-js": ["@ffmpeg", "core-mt", "dist", "umd", "ffmpeg-core.js", "text/javascript"],
  "mt-wasm": ["@ffmpeg", "core-mt", "dist", "umd", "ffmpeg-core.wasm", "application/wasm"],
  "mt-worker": ["@ffmpeg", "core-mt", "dist", "umd", "ffmpeg-core.worker.js", "text/javascript"],
};

export async function GET(request) {
  const key = new URL(request.url).searchParams.get("asset"); const parts = allowed[key];
  if (!parts) return new Response("Not found", { status: 404 });
  const contentType = parts.at(-1); const filePath = path.join(process.cwd(), "node_modules", ...parts.slice(0, -1));
  try {
    const body = await readFile(filePath);
    return new Response(body, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable", "Cross-Origin-Resource-Policy": "same-origin" } });
  } catch { return new Response("Core asset unavailable", { status: 404 }); }
}
