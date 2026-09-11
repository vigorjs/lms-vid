export function courseAccessWhere(user) {
  if (user.role === "ADMIN") return {};

  if (user.role === "TEACHER") {
    return {
      OR: [
        { teacherId: user.id },
        { status: "PUBLISHED", visibility: "PUBLIC" },
      ],
    };
  }

  return {
    status: "PUBLISHED",
    category: { isActive: true },
    OR: [
      { visibility: "PUBLIC" },
      { visibility: "ASSIGNED", assignments: { some: { studentId: user.id } } },
    ],
  };
}

export function canAccessCourse(user, course) {
  if (!course) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "TEACHER") {
    return course.teacherId === user.id || (course.status === "PUBLISHED" && course.visibility === "PUBLIC");
  }
  if (course.status !== "PUBLISHED" || course.category?.isActive !== true) return false;
  if (course.visibility === "PUBLIC") return true;
  return course.visibility === "ASSIGNED"
    && course.assignments?.some((assignment) => assignment.studentId === user.id) === true;
}
