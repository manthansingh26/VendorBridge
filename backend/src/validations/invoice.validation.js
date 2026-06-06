const { z } = require("zod");

const invoiceCreateSchema = z.object({
  poId: z
    .string({ required_error: "Purchase Order reference is required" })
    .min(1, "Purchase Order reference is required"),
  dueDate: z
    .string({ required_error: "Due date is required" })
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(date.getTime()) && date >= today;
    }, {
      message: "Due date must be today or a future date",
    }),
});

module.exports = {
  invoiceCreateSchema,
};
