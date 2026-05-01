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
  packageName: safeText,
  senderName: safeText,
  receiverName: safeText,
  receiverAddress: z.string().trim().min(6).max(240).regex(/^[^<>]*$/),
  destinationCity: safeText,
  weightKg: z.number().positive().max(100),
});

export const createBaggingSchema = z.object({
  bagCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(32)
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  destinationCity: safeText.optional(),
  resiNumbers: z.array(z.string().trim().min(1).max(64)).max(500).default([]),
  packageIds: z.array(z.string().uuid()).max(500).default([]),
});

export const createManifestSchema = createBaggingSchema;

export const updatePackageStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "PACKAGE_CREATED",
    "IN_WAREHOUSE",
    "OUT_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
  ]),
});

export const updatePackageSchema = z.object({
  id: z.string().uuid(),
  packageName: safeText,
  receiverName: safeText,
  receiverAddress: z.string().trim().min(6).max(240).regex(/^[^<>]*$/),
  destinationCity: safeText,
  weightKg: z.number().positive().max(100),
});

export const registerUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(64),
  fullName: safeText,
  role: z.enum(["admin_gudang", "kurir"]),
});

export const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: safeText,
  role: z.enum(["admin_gudang", "kurir"]),
});
