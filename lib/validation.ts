import { z } from "zod";

const noAngleBrackets = z.regex(/^[^<>]*$/, "Input cannot contain angle brackets");

const safeText = z.string().trim().min(2).max(120).check(noAngleBrackets);

// Permissive email — accepts short TLDs like a@a.a, used for internal ops data
const emailField = z
  .string()
  .trim()
  .max(254)
  .check(z.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"));

export const resiSchema = z
  .string()
  .trim()
  .toUpperCase()
  .check(z.regex(/^NEKO-\d{4}-[A-Z0-9]{4}$/, "Invalid tracking number format"));

export const createPackageSchema = z.object({
  packageName: safeText,
  senderName: safeText,
  senderPhone: z.string().trim().max(30).optional().nullable(),
  senderEmail: emailField.optional().nullable(),
  receiverName: safeText,
  receiverPhone: z.string().trim().max(30).optional().nullable(),
  receiverAddress: z.string().trim().min(6).max(240).check(noAngleBrackets),
  receiverState: z.string().trim().max(80).optional().nullable(),
  receiverZip: z.string().trim().max(20).optional().nullable(),
  destinationCity: safeText,
  weightKg: z.number().positive().max(100),
  lengthCm: z.number().min(0).max(500).optional().nullable(),
  widthCm: z.number().min(0).max(500).optional().nullable(),
  heightCm: z.number().min(0).max(500).optional().nullable(),
  targetLatitude: z.number().min(-90).max(90).optional().nullable(),
  targetLongitude: z.number().min(-180).max(180).optional().nullable(),
});

export const createBaggingSchema = z.object({
  bagCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(32)
    .check(z.regex(/^[A-Z0-9-]+$/))
    .optional(),
  destinationCity: safeText.optional(),
  resiNumbers: z.array(z.string().trim().min(1).max(64)).max(500).default([]),
  packageIds: z.array(z.uuid()).max(500).default([]),
});

export const createManifestSchema = createBaggingSchema;

export const updatePackageStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum([
    "PACKAGE_CREATED",
    "IN_WAREHOUSE",
    "OUT_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
  ]),
});

export const updatePackageSchema = z.object({
  id: z.uuid(),
  packageName: safeText,
  receiverName: safeText,
  receiverAddress: z.string().trim().min(6).max(240).check(noAngleBrackets),
  destinationCity: safeText,
  weightKg: z.number().positive().max(100),
});

export const registerUserSchema = z.object({
  email: emailField.toLowerCase(),
  password: z.string().min(10).max(64),
  fullName: safeText,
  role: z.enum(["admin_gudang", "kurir"]),
});

export const updateUserSchema = z.object({
  userId: z.uuid(),
  fullName: safeText,
  role: z.enum(["admin_gudang", "kurir"]),
});
