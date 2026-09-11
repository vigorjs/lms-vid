export const EDIT_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
export const MAX_EDIT_SEGMENTS = 10;
export const MIN_EDIT_SEGMENT_SECONDS = 0.1;

export function outputDuration(editSpec) {
  const sourceDuration = editSpec.segments.reduce(
    (total, segment) => total + Math.max(0, segment.endSeconds - segment.startSeconds),
    0,
  );
  return sourceDuration / editSpec.speed;
}

export function normalizeCrop(crop) {
  if (!crop) return null;
  const width = Math.min(1, Math.max(0.01, Number(crop.width) || 1));
  const height = Math.min(1, Math.max(0.01, Number(crop.height) || 1));
  return {
    x: Math.min(1 - width, Math.max(0, Number(crop.x) || 0)),
    y: Math.min(1 - height, Math.max(0, Number(crop.y) || 0)),
    width,
    height,
    aspect: Number(crop.aspect) || width / height,
  };
}

function atempoFilters(speed) {
  if (speed === 0.25) return ["atempo=0.5", "atempo=0.5"];
  return [`atempo=${speed}`];
}

function rotationFilters(rotation) {
  if (rotation === 90) return ["transpose=1"];
  if (rotation === 180) return ["transpose=1", "transpose=1"];
  if (rotation === 270) return ["transpose=2"];
  return [];
}

function cropFilter(crop) {
  if (!crop) return null;
  return `crop=w='max(2,trunc(iw*${crop.width}/2)*2)':h='max(2,trunc(ih*${crop.height}/2)*2)':x='min(iw-ow,max(0,trunc(iw*${crop.x}/2)*2))':y='min(ih-oh,max(0,trunc(ih*${crop.y}/2)*2))'`;
}

export function buildFfmpegArgs(editSpec, { hasAudio = true } = {}) {
  const count = editSpec.segments.length;
  const videoSplit = count > 1 ? `[0:v]split=${count}${editSpec.segments.map((_, index) => `[v${index}s]`).join("")};` : "";
  const videoSegments = editSpec.segments.map((segment, index) => {
    const input = count > 1 ? `[v${index}s]` : "[0:v]";
    return `${input}trim=start=${segment.startSeconds}:end=${segment.endSeconds},setpts=PTS-STARTPTS[v${index}]`;
  }).join(";");
  const videoConcat = count > 1
    ? `;${editSpec.segments.map((_, index) => `[v${index}]`).join("")}concat=n=${count}:v=1:a=0[vcat]`
    : ";[v0]null[vcat]";
  const transforms = [
    ...rotationFilters(editSpec.rotation),
    cropFilter(editSpec.crop),
    editSpec.flipHorizontal ? "hflip" : null,
    editSpec.flipVertical ? "vflip" : null,
    "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    `setpts=PTS/${editSpec.speed}`,
  ].filter(Boolean);

  let filterComplex = `${videoSplit}${videoSegments}${videoConcat};[vcat]${transforms.join(",")}[vout]`;
  const includeAudio = hasAudio && !editSpec.muted;
  if (includeAudio) {
    const audioSplit = count > 1 ? `;[0:a]asplit=${count}${editSpec.segments.map((_, index) => `[a${index}s]`).join("")}` : "";
    const audioSegments = editSpec.segments.map((segment, index) => {
      const input = count > 1 ? `[a${index}s]` : "[0:a]";
      return `${input}atrim=start=${segment.startSeconds}:end=${segment.endSeconds},asetpts=PTS-STARTPTS[a${index}]`;
    }).join(";");
    const audioConcat = count > 1
      ? `;${editSpec.segments.map((_, index) => `[a${index}]`).join("")}concat=n=${count}:v=0:a=1[acat]`
      : ";[a0]anull[acat]";
    const audioTransforms = [...atempoFilters(editSpec.speed), `volume=${editSpec.volume}`];
    filterComplex += `${audioSplit};${audioSegments}${audioConcat};[acat]${audioTransforms.join(",")}[aout]`;
  }

  return [
    "-i", "input.mp4",
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    ...(includeAudio ? ["-map", "[aout]", "-c:a", "aac", "-b:a", "128k"] : ["-an"]),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "output.mp4",
  ];
}

export function summarizeEditSpec(editSpec) {
  if (!editSpec) return "Video original";
  const changes = [`${editSpec.segments?.length || 1} segmen`];
  if (editSpec.crop) changes.push("crop");
  if (editSpec.rotation) changes.push(`rotasi ${editSpec.rotation}°`);
  if (editSpec.flipHorizontal || editSpec.flipVertical) changes.push("flip");
  if (editSpec.speed !== 1) changes.push(`${editSpec.speed}x`);
  if (editSpec.muted) changes.push("mute");
  else if (editSpec.volume !== 1) changes.push(`volume ${Math.round(editSpec.volume * 100)}%`);
  return changes.join(" · ");
}
