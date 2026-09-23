import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packages = [
  { name: "core", files: ["ffmpeg-core.js", "ffmpeg-core.wasm"] },
  { name: "core-mt", files: ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"] },
];
const urls = {};

for (const item of packages) {
  const packageRoot = path.join(root, "node_modules", "@ffmpeg", item.name);
  const { version } = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const folder = `${item.name}-${version}`;
  const destination = path.join(root, "public", "ffmpeg", folder);
  await mkdir(destination, { recursive: true });
  for (const file of item.files) {
    await copyFile(path.join(packageRoot, "dist", "umd", file), path.join(destination, file));
  }
  urls[item.name] = `/ffmpeg/${folder}`;
}

await mkdir(path.join(root, "generated"), { recursive: true });
await writeFile(path.join(root, "generated", "ffmpeg-assets.js"), `export const ffmpegAssetUrls = ${JSON.stringify(urls)};\n`);
