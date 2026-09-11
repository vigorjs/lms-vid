import { describe, expect, it } from "vitest";
import { actionErrorMessage, errorResponse } from "@/lib/errors";
import { courseSchema } from "@/lib/validation";

function invalidCourseError() {
  const result = courseSchema.safeParse({
    title: "Renang",
    description: "Pendek",
    categoryId: "category-1",
    passThreshold: 75,
    criteria: [{ title: "Teknik", description: "", weight: 100 }],
  });
  if (result.success) throw new Error("Course seharusnya tidak valid.");
  return result.error;
}

describe("validation error messages", () => {
  it("mengubah ZodError menjadi pesan action yang ramah", () => {
    expect(actionErrorMessage(invalidCourseError(), "Gagal membuat course."))
      .toBe("Deskripsi minimal 10 karakter.");
  });

  it("mengembalikan HTTP 400 untuk validasi API", async () => {
    const response = errorResponse(invalidCourseError());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Deskripsi minimal 10 karakter.",
      code: "VALIDATION_ERROR",
    });
  });

  it("menerima konfigurasi akses assigned dan daftar student", () => {
    const result = courseSchema.safeParse({
      title: "Renang gaya bebas",
      description: "Latihan koordinasi gerakan gaya bebas.",
      categoryId: "category-1",
      visibility: "ASSIGNED",
      studentIds: ["student-1", "student-2"],
      passThreshold: 75,
      criteria: [{ title: "Teknik", description: "", weight: 100 }],
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ visibility: "ASSIGNED", studentIds: ["student-1", "student-2"] });
  });

  it("menolak tipe akses course yang tidak dikenal", () => {
    const result = courseSchema.safeParse({
      title: "Renang gaya bebas",
      description: "Latihan koordinasi gerakan gaya bebas.",
      categoryId: "category-1",
      visibility: "PRIVATE",
      studentIds: [],
      passThreshold: 75,
      criteria: [{ title: "Teknik", description: "", weight: 100 }],
    });
    expect(result.success).toBe(false);
  });
});
