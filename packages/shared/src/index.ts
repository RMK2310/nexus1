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

// ── Commerce Mutation Validation Schemas ──

// Add to Cart
export const AddToCartInputSchema = z.object({
  sellerListingId: z.string().min(1, { message: "Seller listing ID is required" }),
  quantity: z.number().int().positive({ message: "Quantity must be a positive integer" }).default(1),
});

export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;

// Update Cart Item Quantity
export const UpdateCartQuantityInputSchema = z.object({
  quantity: z.number().int({ message: "Quantity must be an integer" }),
});

export type UpdateCartQuantityInput = z.infer<typeof UpdateCartQuantityInputSchema>;

// Add to Wishlist
export const AddToWishlistInputSchema = z.object({
  sellerListingId: z.string().min(1, { message: "Seller listing ID is required" }),
});

export type AddToWishlistInput = z.infer<typeof AddToWishlistInputSchema>;

// Product Review Submission
export const AddReviewInputSchema = z.object({
  productId: z.string().min(1, { message: "Product ID is required" }),
  rating: z.number().int().min(1, { message: "Rating must be at least 1" }).max(5, { message: "Rating cannot exceed 5" }),
  text: z.string().min(1, { message: "Review text is required" }).max(2000, { message: "Review text must be under 2000 characters" }),
});

export type AddReviewInput = z.infer<typeof AddReviewInputSchema>;

// Server-side Checkout (uses persistent cart, not client-provided items)
export const ServerCheckoutInputSchema = z.object({
  idempotencyKey: z.string().min(1, { message: "Idempotency key is required" }),
  paymentMethod: z.string().min(1, { message: "Payment method is required" }),
});

export type ServerCheckoutInput = z.infer<typeof ServerCheckoutInputSchema>;

// Barcode Ingestion
export const BarcodeIngestInputSchema = z.object({
  barcode: z.string().min(3, { message: "Barcode must be at least 3 characters" }).max(50, { message: "Barcode must be under 50 characters" }),
});

export type BarcodeIngestInput = z.infer<typeof BarcodeIngestInputSchema>;

// ── Wallet & Ledger Validation Schemas ──

export const WalletTransferInputSchema = z.object({
  recipient: z.string().min(1, { message: "Recipient email, phone, or User ID is required" }),
  amount: z.number().positive({ message: "Transfer amount must be positive" }),
  pin: z.string().length(4, { message: "Security PIN must be exactly 4 digits" }).regex(/^\d{4}$/, { message: "PIN must be numeric" }),
  note: z.string().max(200, { message: "Note must be under 200 characters" }).optional(),
});

export type WalletTransferInput = z.infer<typeof WalletTransferInputSchema>;

export const WalletTopUpInputSchema = z.object({
  amount: z.number().positive({ message: "Top-up amount must be positive" }),
  paymentMethod: z.string().min(1, { message: "Payment method is required" }).default("UPI"),
});

export type WalletTopUpInput = z.infer<typeof WalletTopUpInputSchema>;

export const WalletSetPinInputSchema = z.object({
  pin: z.string().length(4, { message: "New PIN must be exactly 4 digits" }).regex(/^\d{4}$/, { message: "PIN must be numeric" }),
  currentPin: z.string().optional(),
});

export type WalletSetPinInput = z.infer<typeof WalletSetPinInputSchema>;

export const WalletVerifyPinInputSchema = z.object({
  pin: z.string().length(4, { message: "PIN must be exactly 4 digits" }).regex(/^\d{4}$/, { message: "PIN must be numeric" }),
});

export type WalletVerifyPinInput = z.infer<typeof WalletVerifyPinInputSchema>;

// ── Razorpay Integration Validation Schemas ──

export const RazorpayCreateOrderInputSchema = z.object({
  amount: z.number().positive({ message: "Amount must be a positive number in INR" }),
  currency: z.string().default("INR"),
  notes: z.record(z.string()).optional(),
});

export type RazorpayCreateOrderInput = z.infer<typeof RazorpayCreateOrderInputSchema>;

export const RazorpayVerifyPaymentInputSchema = z.object({
  razorpay_order_id: z.string().min(1, { message: "Razorpay Order ID is required" }),
  razorpay_payment_id: z.string().min(1, { message: "Razorpay Payment ID is required" }),
  razorpay_signature: z.string().optional(),
  amount: z.number().positive({ message: "Amount must be positive" }),
  paymentMethod: z.string().default("CARD"),
  paymentDetails: z.object({
    cardNetwork: z.string().optional(),
    last4: z.string().optional(),
    bank: z.string().optional(),
    vpa: z.string().optional(),
  }).optional(),
});

export type RazorpayVerifyPaymentInput = z.infer<typeof RazorpayVerifyPaymentInputSchema>;

// ── Razorpay E-Commerce Checkout Schemas ──

export const RazorpayCommerceOrderInputSchema = z.object({
  shippingAddress: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  buyNow: z.object({
    sellerListingId: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
  }).optional(),
});

export type RazorpayCommerceOrderInput = z.infer<typeof RazorpayCommerceOrderInputSchema>;

export const RazorpayCommerceVerifyInputSchema = z.object({
  razorpay_order_id: z.string().min(1, { message: "Razorpay Order ID is required" }),
  razorpay_payment_id: z.string().min(1, { message: "Razorpay Payment ID is required" }),
  razorpay_signature: z.string().optional(),
  amount: z.number().positive({ message: "Amount must be positive" }).optional(),
  paymentMethod: z.string().default("CARD"),
  paymentDetails: z.record(z.any()).optional(),
  shippingAddress: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  buyNow: z.object({
    sellerListingId: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
  }).optional(),
});

export type RazorpayCommerceVerifyInput = z.infer<typeof RazorpayCommerceVerifyInputSchema>;

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

export { resolvePreciseProductImage, getOptimizedImageUrl, PRODUCT_IMAGE_RULES, type ImageRule } from "./product-images";

