export function videoSourceType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov") || file.type === "video/quicktime") return "video/quicktime";
  if (name.endsWith(".mp4") || name.endsWith(".m4v") || ["video/mp4", "video/x-m4v"].includes(file.type)) return "video/mp4";
  throw new Error("Gunakan video MP4 atau MOV dari galeri perangkat.");
}
