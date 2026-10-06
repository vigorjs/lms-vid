export function hasWebpSignature(buffer) {
  return buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

export function hasCoverSignature(buffer, objectKey) {
  if (objectKey.endsWith(".webp")) return hasWebpSignature(buffer);
  if (objectKey.endsWith(".jpg")) {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return false;
}
