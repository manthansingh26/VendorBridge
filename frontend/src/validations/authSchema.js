import { z } from "zod";

export const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, "Username or Email is required"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase, numbers, and underscores allowed")
    .transform(v => v.toLowerCase().trim()),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(15, "Phone must be at most 15 digits")
    .optional()
    .or(z.literal("")),
  role: z
    .string()
    .min(1, "Role is required"),
  country: z
    .string()
    .min(1, "Country is required"),
  professionalInfo: z
    .string()
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
  confirmPassword: z
    .string()
    .min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
