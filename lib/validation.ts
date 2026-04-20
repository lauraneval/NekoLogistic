import { z } from "zod";

const safeText = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[^<>]*$/, "Input cannot contain angle brackets");

export const resiSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^NEKO-\d{4}-[A-Z0-9]{4}$/, "Invalid tracking number format");

export const createPackageSchema = z.object({
  senderName: safeText,
  receiverName: safeText,
  receiverAddress: z.string().trim().min(6).max(240).regex(/^[^<>]*$/),
  weightKg: z.number().positive().max(100),
});

export const createManifestSchema = z.object({
  bagCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^BAG-\d{4}-[A-Z0-9]{4}$/)
    .optional(),
  resiNumbers: z.array(resiSchema).min(1).max(500),
});

export const registerUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(64),
  fullName: safeText,
  role: z.enum(["admin_gudang", "kurir"]),
});
