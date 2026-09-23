import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Email tidak valid."));

export const loginSchema = z.object({
  email: emailSchema,
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus terdiri dari 6 angka."),
});

export const pinSchema = z.string().regex(/^[0-9]{6}$/, "PIN harus terdiri dari 6 angka.");

export const registrationSchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(100, "Nama maksimal 100 karakter.").optional(),
});

export const userSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  pin: pinSchema.optional(),
});
