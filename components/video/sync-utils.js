export function commonDuration(referenceDuration, studentDuration) {
  const reference = Number(referenceDuration) || 0; const student = Number(studentDuration) || 0;
  return student > 0 ? Math.min(reference, student) : reference;
}
export function clampSynchronizedTime(value, duration) {
  return Math.max(0, Math.min(Number(value) || 0, Math.max(0, Number(duration) || 0)));
}
export function shouldCorrectDrift(masterTime, followerTime, tolerance = 0.12) {
  return Math.abs(Number(masterTime) - Number(followerTime)) > tolerance;
}
