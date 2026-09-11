import { describe, expect, it } from "vitest";
import { canAccessCourse, courseAccessWhere } from "@/lib/courses/access";

const admin = { id: "admin-1", role: "ADMIN" };
const owner = { id: "teacher-1", role: "TEACHER" };
const otherTeacher = { id: "teacher-2", role: "TEACHER" };
const assignedStudent = { id: "student-1", role: "STUDENT" };
const otherStudent = { id: "student-2", role: "STUDENT" };

function course(overrides = {}) {
  return {
    teacherId: owner.id,
    status: "PUBLISHED",
    visibility: "ASSIGNED",
    category: { isActive: true },
    assignments: [{ studentId: assignedStudent.id }],
    ...overrides,
  };
}

describe("course access", () => {
  it("memberi admin dan teacher pemilik akses penuh", () => {
    expect(canAccessCourse(admin, course({ status: "ARCHIVED" }))).toBe(true);
    expect(canAccessCourse(owner, course({ status: "DRAFT" }))).toBe(true);
  });

  it("membatasi teacher lain ke course public yang diterbitkan", () => {
    expect(canAccessCourse(otherTeacher, course())).toBe(false);
    expect(canAccessCourse(otherTeacher, course({ visibility: "PUBLIC" }))).toBe(true);
    expect(canAccessCourse(otherTeacher, course({ visibility: "PUBLIC", status: "DRAFT" }))).toBe(false);
  });

  it("membatasi course assigned ke student yang dipilih", () => {
    expect(canAccessCourse(assignedStudent, course())).toBe(true);
    expect(canAccessCourse(otherStudent, course())).toBe(false);
  });

  it("menolak student ketika course belum terbit atau kategori nonaktif", () => {
    expect(canAccessCourse(assignedStudent, course({ status: "DRAFT" }))).toBe(false);
    expect(canAccessCourse(assignedStudent, course({ category: { isActive: false } }))).toBe(false);
  });

  it("menghasilkan filter assignment untuk query student", () => {
    expect(courseAccessWhere(assignedStudent)).toEqual({
      status: "PUBLISHED",
      category: { isActive: true },
      OR: [
        { visibility: "PUBLIC" },
        { visibility: "ASSIGNED", assignments: { some: { studentId: assignedStudent.id } } },
      ],
    });
  });
});
