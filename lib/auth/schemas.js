import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email tidak valid.").trim().toLowerCase(),
  password: z.string().min(1, "Password wajib diisi."),
});

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .regex(/[A-Za-z]/, "Password harus memuat huruf.")
  .regex(/[0-9]/, "Password harus memuat angka.");

export const userSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  password: passwordSchema.optional(),
});
