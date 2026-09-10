export function getCourseCoverUrl(course) {
  if (!course?.coverImageKey) return null;
  const updated = course.coverUpdatedAt ? new Date(course.coverUpdatedAt).getTime() : 0;
  return `/api/courses/${course.id}/cover?v=${Number.isFinite(updated) ? updated : 0}`;
}
