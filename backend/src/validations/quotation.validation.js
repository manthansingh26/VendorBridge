const { z } = require("zod");

const quotationCreateSchema = z.object({
  rfqId: z
    .string({ required_error: "RFQ reference is required" })
    .min(1, "RFQ reference is required"),
  price: z
    .number({ required_error: "Quoted price is required" })
    .positive("Price must be a positive number"),
  taxPercentage: z
    .number()
    .min(0, "Tax cannot be negative")
    .max(100, "Tax cannot exceed 100%")
    .default(18.0),
  deliveryTimeline: z
    .string({ required_error: "Delivery timeline is required" })
    .min(2, "Delivery timeline details required")
    .trim(),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  paymentTerms: z.number().int().positive().optional().nullable(),
});

const quotationUpdateSchema = quotationCreateSchema.partial();

module.exports = {
  quotationCreateSchema,
  quotationUpdateSchema,
};
