import { MULTIPART_MAX_ATTEMPTS, MULTIPART_PART_SIZE_BYTES } from "./constants";

export function createMultipartPlan(sizeBytes, partSizeBytes = MULTIPART_PART_SIZE_BYTES) {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) throw new Error("Ukuran file tidak valid.");
  if (!Number.isInteger(partSizeBytes) || partSizeBytes <= 0) throw new Error("Ukuran part tidak valid.");

  const partCount = Math.ceil(sizeBytes / partSizeBytes);
  return Array.from({ length: partCount }, (_, index) => {
    const start = index * partSizeBytes;
    const end = Math.min(start + partSizeBytes, sizeBytes);
    return { partNumber: index + 1, start, end, size: end - start };
  });
}

export function calculateMultipartProgress(completedBytes, currentPartBytes, totalBytes) {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.round(((completedBytes + currentPartBytes) / totalBytes) * 100));
}

export function normalizeUploadedParts(sizeBytes, partSizeBytes, uploadedParts) {
  if (!Array.isArray(uploadedParts)) return null;
  const expected = createMultipartPlan(sizeBytes, partSizeBytes);
  const actual = [...uploadedParts].sort((left, right) => left.part - right.part);
  if (actual.length !== expected.length) return null;

  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index]?.part !== expected[index].partNumber
      || Number(actual[index]?.size) !== expected[index].size
      || !actual[index]?.etag) return null;
  }
  return actual.map(({ part, etag }) => ({ part, etag }));
}

function abortError() {
  return new DOMException("Upload dibatalkan.", "AbortError");
}

export async function retryMultipartPart(task, {
  attempts = MULTIPART_MAX_ATTEMPTS,
  delays = [1000, 2000, 4000],
  signal,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (signal?.aborted) throw abortError();
    try {
      return await task(attempt);
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") throw abortError();
      lastError = error;
      if (attempt < attempts) await sleep(delays[attempt - 1] ?? delays.at(-1) ?? 0);
    }
  }
  throw lastError;
}
