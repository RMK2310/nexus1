import { z } from "zod";

// Roles Enum
export enum UserRole {
  CONSUMER = "CONSUMER",
  SELLER = "SELLER",
  ADMIN = "ADMIN",
  RESTAURANT = "RESTAURANT",
  DELIVERY_PARTNER = "DELIVERY_PARTNER",
  DRIVER = "DRIVER",
  SUPPORT_AGENT = "SUPPORT_AGENT",
  RISK_ANALYST = "RISK_ANALYST",
  SUPER_ADMIN = "SUPER_ADMIN"
}

// User Registration Validation Schema
export const RegisterInputSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }),
  phone: z.string().optional()
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

// User Login Validation Schema
export const LoginInputSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(1, { message: "Password is required" })
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

// Role Switching Validation Schema
export const RoleSwitchInputSchema = z.object({
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: "Invalid user role specified" }) })
});

export type RoleSwitchInput = z.infer<typeof RoleSwitchInputSchema>;

// Product Creation Validation Schema
export const CreateProductInputSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters long" }),
  description: z.string().min(10, { message: "Product description must be at least 10 characters long" }),
  price: z.number().int({ message: "Price must be an integer amount of cents" }).positive({ message: "Price must be positive" }),
  sku: z.string().min(3, { message: "SKU is required" }),
  categoryId: z.string().uuid({ message: "Invalid Category ID format" })
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

// Checkout Cart Item validation
export const CartItemInputSchema = z.object({
  productId: z.string().uuid({ message: "Invalid Product ID format" }),
  quantity: z.number().int().positive({ message: "Quantity must be a positive integer" })
});

// Checkout Validation Schema
export const CheckoutInputSchema = z.object({
  items: z.array(CartItemInputSchema).min(1, { message: "Cart must contain at least one item to checkout" }),
  paymentMethod: z.string().min(1, { message: "Payment method token or identifier is required" }),
  idempotencyKey: z.string().uuid({ message: "Idempotency key must be a valid UUID" })
});

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

// Standard Error Response structure
export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
