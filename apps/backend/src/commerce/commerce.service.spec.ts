// Set required environment variables for tests BEFORE any imports that trigger getConfig()
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:d:/NEXUS1/nexus.db";
process.env.JWT_ACCESS_SECRET = "test_access_secret_for_unit_tests_32chars!";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_for_unit_tests_32chars!";

import { Test, TestingModule } from "@nestjs/testing";
import { CommerceService } from "./commerce.service";
import { OpenFoodFactsService } from "./open-food-facts.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtModule } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { BadRequestException } from "@nestjs/common";

jest.setTimeout(30000);

describe("CommerceService Integration & Concurrency", () => {
  let service: CommerceService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: "test_secret" }),
      ],
      providers: [CommerceService, OpenFoodFactsService, PrismaService],
    }).compile();

    service = module.get<CommerceService>(CommerceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Atomic Checkout Concurrency Lock", () => {
    let buyerId: string;
    let sellerId: string;
    let categoryId: string;
    let sellerListingId: string;

    beforeEach(async () => {
      // Clean DB in order
      await prisma.flashSale.deleteMany({});
      await prisma.interactionEvent.deleteMany({});
      await prisma.productReview.deleteMany({});
      await prisma.wishlistItem.deleteMany({});
      await prisma.cartItem.deleteMany({});
      await prisma.inventory.deleteMany({});
      await prisma.inventoryReservation.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.subOrder.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.paymentAttempt.deleteMany({});
      await prisma.sellerListing.deleteMany({});
      await prisma.productVariant.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.brand.deleteMany({});
      await prisma.userRole.deleteMany({});
      await prisma.walletAccount.deleteMany({});
      await prisma.user.deleteMany({});

      // 1. Create Category
      const category = await prisma.category.create({
        data: { name: "Electronics Specs" },
      });
      categoryId = category.id;

      // 2. Create Platform Admin
      const admin = await prisma.user.create({
        data: {
          email: "admin-spec@nexus.com",
          name: "Admin Spec",
          passwordHash: "hash",
        },
      });
      await prisma.userRole.create({
        data: { userId: admin.id, role: "ADMIN" },
      });
      await prisma.walletAccount.create({
        data: { userId: admin.id, balance: 10000 },
      });

      // 3. Create Seller User & Profile
      const sellerUser = await prisma.user.create({
        data: {
          email: "seller-spec@nexus.com",
          name: "Seller Spec",
          passwordHash: "hash",
        },
      });
      await prisma.userRole.create({
        data: { userId: sellerUser.id, role: "SELLER" },
      });
      await prisma.walletAccount.create({
        data: { userId: sellerUser.id, balance: 0 },
      });
      const seller = await prisma.seller.create({
        data: {
          userId: sellerUser.id,
          businessName: "Spec Shop",
          kycStatus: "APPROVED",
          commissionRate: 0.10,
        },
      });
      sellerId = seller.id;

      // 4. Create Buyer User & Wallet
      const buyer = await prisma.user.create({
        data: {
          email: "buyer-spec@nexus.com",
          name: "Buyer Spec",
          passwordHash: "hash",
        },
      });
      await prisma.userRole.create({
        data: { userId: buyer.id, role: "CONSUMER" },
      });
      await prisma.walletAccount.create({
        data: { userId: buyer.id, balance: 100000 }, // ₹1000.00
      });
      buyerId = buyer.id;

      // 5. Create Catalog Product, Variant, and Seller Listing
      const product = await prisma.product.create({
        data: {
          title: "Limited Headset Pro",
          description: "Only 3 units left in warehouse",
          categoryId: category.id,
          status: "ACTIVE",
          productType: "ELECTRONICS",
        },
      });

      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: "NX-LIMIT-01",
          name: "Wireless Black",
          status: "ACTIVE",
        },
      });

      const listing = await prisma.sellerListing.create({
        data: {
          productVariantId: variant.id,
          sellerId: seller.id,
          price: 2000, // ₹20.00
          compareAtPrice: 2500,
          currency: "INR",
          status: "ACTIVE",
        },
      });
      sellerListingId = listing.id;

      // Set Stock to exactly 3
      await prisma.inventory.create({
        data: {
          sellerListingId: listing.id,
          quantity: 3,
        },
      });
    });

    it("should process checkout SAGA successfully for persistent database cart", async () => {
      // Add to persistent DB cart
      await service.addToCart(buyerId, sellerListingId, 1);

      const checkoutResult = await service.checkout(buyerId, {
        paymentMethod: "INTERNAL_WALLET",
        idempotencyKey: randomUUID(),
      });

      expect(checkoutResult.success).toBe(true);
      expect(checkoutResult.paymentStatus).toBe("COMPLETED");

      // Verify wallet balance decremented
      const wallet = await prisma.walletAccount.findUnique({ where: { userId: buyerId } });
      expect(wallet?.balance).toBe(98000); // 100000 - 2000

      // Verify inventory decremented
      const inv = await prisma.inventory.findUnique({ where: { sellerListingId } });
      expect(inv?.quantity).toBe(2);

      // Verify cart is cleared
      const cart = await service.getCart(buyerId);
      expect(cart.length).toBe(0);
    });

    it("should prevent overselling by running concurrent checkouts and asserting that only 3 succeed", async () => {
      // Create 10 concurrent requests to purchase 1 item each
      // Since checkout reads from the database cart, we simulate multiple concurrent checkout executions!
      // In NestJS/Prisma, we run multiple checkout transactions concurrently
      
      // Let's seed 10 distinct consumer wallets to checkout concurrently
      const buyers = [];
      for (let i = 0; i < 10; i++) {
        const u = await prisma.user.create({
          data: {
            email: `buyer-con-${i}@nexus.com`,
            name: `Buyer Con ${i}`,
            passwordHash: "hash",
          },
        });
        await prisma.userRole.create({ data: { userId: u.id, role: "CONSUMER" } });
        await prisma.walletAccount.create({ data: { userId: u.id, balance: 10000 } });
        // Add to their cart
        await service.addToCart(u.id, sellerListingId, 1);
        buyers.push(u.id);
      }

      const requests = buyers.map((bId) =>
        service.checkout(bId, {
          paymentMethod: "INTERNAL_WALLET",
          idempotencyKey: randomUUID(),
        })
      );

      const results = await Promise.allSettled(requests);

      const succeeded = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      // Assert exactly 3 checkouts succeeded and 7 failed
      expect(succeeded.length).toBe(3);
      expect(failed.length).toBe(7);

      // Verify final stock is exactly 0
      const finalInventory = await prisma.inventory.findUnique({ where: { sellerListingId } });
      expect(finalInventory?.quantity).toBe(0);
    });
  });
});
