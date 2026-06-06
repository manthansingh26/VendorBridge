const { z } = require("zod");

const rfqCreateSchema = z.object({
  title: z
    .string({ required_error: "RFQ title is required" })
    .min(5, "Title must be at least 5 characters")
    .trim(),
  description: z
    .string({ required_error: "RFQ description is required" })
    .min(10, "Description must be at least 10 characters")
    .trim(),
  itemName: z
    .string({ required_error: "Item name is required" })
    .min(2, "Item name is required")
    .trim(),
  quantity: z
    .number({ required_error: "Quantity is required" })
    .positive("Quantity must be a positive number"),
  unit: z
    .string({ required_error: "Unit (e.g. Pcs, Kgs) is required" })
    .min(1, "Unit is required")
    .trim(),
  category: z
    .string({ required_error: "Category is required" })
    .min(2, "Category is required")
    .trim(),
  deadline: z
    .string({ required_error: "Deadline date is required" })
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(date.getTime()) && date >= today;
    }, {
      message: "Deadline must be today or a future date",
    }),
  attachmentUrl: z.string().optional().nullable(),
});

const rfqUpdateSchema = rfqCreateSchema.partial();

module.exports = {
  rfqCreateSchema,
  rfqUpdateSchema,
};
