import { z } from "zod";

export const createPasteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Paste content cannot be empty")
    .max(500000, "Content cannot exceed 500,000 characters"),

  expiresAt: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== "" ? val : null))
    .refine(
      (val) => {
        if (!val) return true;
        const parsed = new Date(val);
        return !isNaN(parsed.getTime());
      },
      { message: "Invalid date format for expiresAt" }
    ),

  maxViews: z
    .union([
      z.number().int("Max views must be an integer").positive("Max views must be at least 1"),
      z.string().regex(/^\d+$/, "Max views must be a positive integer").transform(Number),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((val) => (typeof val === "number" && val > 0 ? val : null)),
});

export type CreatePasteInput = z.infer<typeof createPasteSchema>;
