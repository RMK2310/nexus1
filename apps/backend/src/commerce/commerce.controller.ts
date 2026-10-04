import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { CommerceService } from "./commerce.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UserPayload } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  UserRole,
  AddToCartInput,
  AddToCartInputSchema,
  UpdateCartQuantityInput,
  UpdateCartQuantityInputSchema,
  AddToWishlistInput,
  AddToWishlistInputSchema,
  AddReviewInput,
  AddReviewInputSchema,
  ServerCheckoutInput,
  ServerCheckoutInputSchema,
  BarcodeIngestInput,
  BarcodeIngestInputSchema,
  RazorpayCommerceOrderInput,
  RazorpayCommerceOrderInputSchema,
  RazorpayCommerceVerifyInput,
  RazorpayCommerceVerifyInputSchema,
} from "@nexus/shared";

@Controller("api/v1/commerce")
export class CommerceController {
  constructor(private commerceService: CommerceService) {}

  // Hierarchical Categories Lookup
  @Get("categories")
  async getCategories() {
    const data = await this.commerceService.getCategories();
    return { success: true, data };
  }

  // Catalog Browsing & Search Filters
  @Get("products")
  async getProducts(
    @Query("categoryId") categoryId?: string,
    @Query("brandId") brandId?: string,
    @Query("search") search?: string,
    @Query("priceMin") priceMin?: string,
    @Query("priceMax") priceMax?: string,
    @Query("ratingMin") ratingMin?: string,
    @Query("sortBy") sortBy?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const data = await this.commerceService.getProducts({
      categoryId,
      brandId,
      search,
      priceMin: priceMin ? parseInt(priceMin) : undefined,
      priceMax: priceMax ? parseInt(priceMax) : undefined,
      ratingMin: ratingMin ? parseFloat(ratingMin) : undefined,
      sortBy,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, data };
  }

  // Detailed Product view (with variants & sellers listings comparisons)
  @Get("products/:id")
  async getProductDetails(@Param("id") id: string) {
    const data = await this.commerceService.getProductDetails(id);
    return { success: true, data };
  }

  // Persistent User Cart actions
  @Get("cart")
  @UseGuards(AuthGuard)
  async getCart(@CurrentUser() user: UserPayload) {
    const data = await this.commerceService.getCart(user.userId);
    return { success: true, data };
  }

  @Post("cart/items")
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(AddToCartInputSchema))
  async addToCart(
    @CurrentUser() user: UserPayload,
    @Body() input: AddToCartInput
  ) {
    const data = await this.commerceService.addToCart(user.userId, input.sellerListingId, input.quantity);
    return { success: true, data };
  }

  @Patch("cart/items/:listingId")
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(UpdateCartQuantityInputSchema))
  async updateCartQuantity(
    @CurrentUser() user: UserPayload,
    @Param("listingId") listingId: string,
    @Body() input: UpdateCartQuantityInput
  ) {
    const data = await this.commerceService.updateCartQuantity(user.userId, listingId, input.quantity);
    return { success: true, data };
  }

  @Delete("cart/items/:listingId")
  @UseGuards(AuthGuard)
  async removeFromCart(
    @CurrentUser() user: UserPayload,
    @Param("listingId") listingId: string
  ) {
    const data = await this.commerceService.removeFromCart(user.userId, listingId);
    return { success: true, data };
  }

  @Delete("cart")
  @UseGuards(AuthGuard)
  async clearCart(@CurrentUser() user: UserPayload) {
    const data = await this.commerceService.clearCart(user.userId);
    return { success: true, data };
  }

  // Persistent Wishlist actions
  @Get("wishlist")
  @UseGuards(AuthGuard)
  async getWishlist(@CurrentUser() user: UserPayload) {
    const data = await this.commerceService.getWishlist(user.userId);
    return { success: true, data };
  }

  @Post("wishlist")
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(AddToWishlistInputSchema))
  async addToWishlist(
    @CurrentUser() user: UserPayload,
    @Body() input: AddToWishlistInput
  ) {
    const data = await this.commerceService.addToWishlist(user.userId, input.sellerListingId);
    return { success: true, data };
  }

  @Delete("wishlist/:listingId")
  @UseGuards(AuthGuard)
  async removeFromWishlist(
    @CurrentUser() user: UserPayload,
    @Param("listingId") listingId: string
  ) {
    const data = await this.commerceService.removeFromWishlist(user.userId, listingId);
    return { success: true, data };
  }

  // Verified reviews ratings submission
  @Post("reviews")
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(AddReviewInputSchema))
  async addReview(
    @CurrentUser() user: UserPayload,
    @Body() input: AddReviewInput
  ) {
    const data = await this.commerceService.addReview(user.userId, input.productId, input.rating, input.text);
    return { success: true, message: "Review submitted successfully.", data };
  }

  // External Ingestion trigger (Open Food Facts barcode lookup)
  @Post("ingest")
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(BarcodeIngestInputSchema))
  async ingestOFF(
    @Body() input: BarcodeIngestInput
  ) {
    const data = await this.commerceService.ingestOFF(input.barcode);
    if (!data) {
      return { success: false, message: "External item ingestion failed. Offline fallback applied." };
    }
    return { success: true, message: "External item ingested into NEXUS database catalog successfully.", data };
  }

  // Multi-seller Checkout saga (Direct Wallet)
  @Post("checkout")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @UsePipes(new ZodValidationPipe(ServerCheckoutInputSchema))
  async checkout(
    @CurrentUser() user: UserPayload,
    @Body() input: ServerCheckoutInput
  ) {
    const data = await this.commerceService.checkout(user.userId, input);
    return { success: true, message: "Checkout executed successfully.", data };
  }

  // Razorpay Commerce Checkout - Create Order
  @Post("checkout/razorpay/create-order")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @UsePipes(new ZodValidationPipe(RazorpayCommerceOrderInputSchema))
  async createRazorpayCommerceOrder(
    @CurrentUser() user: UserPayload,
    @Body() input: RazorpayCommerceOrderInput
  ) {
    const data = await this.commerceService.createRazorpayCheckoutOrder(user.userId, input);
    return { success: true, data };
  }

  // Razorpay Commerce Checkout - Verify Payment & Complete Order
  @Post("checkout/razorpay/verify-payment")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @UsePipes(new ZodValidationPipe(RazorpayCommerceVerifyInputSchema))
  async verifyRazorpayCommercePayment(
    @CurrentUser() user: UserPayload,
    @Body() input: RazorpayCommerceVerifyInput
  ) {
    const data = await this.commerceService.verifyRazorpayCheckoutPayment(user.userId, input);
    return { success: true, message: "Payment verified and order placed successfully.", data };
  }

  // Placed Orders History & Real-Time Tracking
  @Get("orders")
  @UseGuards(AuthGuard)
  async getUserOrders(@CurrentUser() user: UserPayload) {
    const data = await this.commerceService.getUserOrders(user.userId);
    return { success: true, data };
  }

  // Amazon-Style Package Tracking
  @Get("orders/:id/track")
  @UseGuards(AuthGuard)
  async trackOrder(
    @CurrentUser() user: UserPayload,
    @Param("id") id: string
  ) {
    const data = await this.commerceService.trackOrder(id, user.userId);
    return { success: true, data };
  }

  // Admin Pending Products Moderation directory
  @Get("admin/pending")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingProducts() {
    const data = await this.commerceService.getPendingProducts();
    return { success: true, data };
  }

  @Post("admin/:id/approve")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveProduct(@Param("id") id: string) {
    const data = await this.commerceService.approveProduct(id);
    return { success: true, message: "Product approved successfully.", data };
  }

  @Post("admin/:id/reject")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectProduct(@Param("id") id: string) {
    const data = await this.commerceService.rejectProduct(id);
    return { success: true, message: "Product rejected successfully.", data };
  }
}
