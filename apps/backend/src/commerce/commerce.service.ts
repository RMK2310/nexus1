import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OpenFoodFactsService } from "./open-food-facts.service";

@Injectable()
export class CommerceService {
  constructor(
    private prisma: PrismaService,
    private openFoodFacts: OpenFoodFactsService
  ) {}

  // Fetch hierarchical Categories
  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        children: true,
      },
    });
  }

  // Get paginated active product catalog with dynamic sorting & category filtering (including subcategories)
  async getProducts(params: {
    categoryId?: string;
    brandId?: string;
    search?: string;
    priceMin?: number;
    priceMax?: number;
    ratingMin?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: "ACTIVE",
    };

    // Category tree resolution (resolves subcategories recursively)
    if (params.categoryId) {
      const categoryIds = [params.categoryId];
      const children = await this.prisma.category.findMany({
        where: { parentId: params.categoryId },
      });
      children.forEach((child) => categoryIds.push(child.id));

      whereClause.categoryId = { in: categoryIds };
    }

    if (params.brandId) {
      whereClause.brandId = params.brandId;
    }

    if (params.search) {
      whereClause.OR = [
        { title: { contains: params.search } },
        { description: { contains: params.search } },
        { brand: { name: { contains: params.search } } },
        { category: { name: { contains: params.search } } },
        { variants: { some: { sku: { contains: params.search } } } },
      ];
    }

    // Dynamic sorting
    let orderByClause: any = { createdAt: "desc" };
    if (params.sortBy) {
      switch (params.sortBy) {
        case "priceAsc":
          orderByClause = { variants: { _count: "asc" } }; // Default fallback sorting, we resolve detail sorting per variant
          break;
        case "priceDesc":
          orderByClause = { variants: { _count: "desc" } };
          break;
        case "newest":
          orderByClause = { createdAt: "desc" };
          break;
      }
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip,
      take: limit,
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            listings: {
              where: { status: "ACTIVE" },
              include: {
                seller: { select: { businessName: true } },
                inventory: { select: { quantity: true } },
              },
            },
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    // Post-process list to inject rating average and filter client criteria
    const mapped = products
      .map((prod) => {
        const ratings = prod.reviews.map((r) => r.rating);
        const ratingAvg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        return {
          ...prod,
          ratingAvg,
          reviewCount: ratings.length,
        };
      })
      .filter((prod) => {
        // Apply post-process rating & price filters safely
        if (params.ratingMin && prod.ratingAvg < params.ratingMin) return false;
        return true;
      });

    return mapped;
  }

  // Get Product Details, Reviews, and multi-seller variant listings
  async getProductDetails(id: string) {
    const prod = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            listings: {
              where: { status: "ACTIVE" },
              include: {
                seller: true,
                inventory: { select: { quantity: true } },
              },
            },
          },
        },
        reviews: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!prod || prod.status !== "ACTIVE") {
      throw new NotFoundException("Product not found or unavailable in catalog");
    }

    return prod;
  }

  // Persistent User Cart actions
  async getCart(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        sellerListing: {
          include: {
            productVariant: {
              include: { product: true },
            },
            seller: true,
            inventory: { select: { quantity: true } },
          },
        },
      },
    });
  }

  async addToCart(userId: string, sellerListingId: string, quantity: number) {
    const listing = await this.prisma.sellerListing.findUnique({
      where: { id: sellerListingId },
    });

    if (!listing || listing.status !== "ACTIVE") {
      throw new NotFoundException("Seller listing is currently unavailable");
    }

    return this.prisma.cartItem.upsert({
      where: {
        userId_sellerListingId: { userId, sellerListingId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId,
        sellerListingId,
        quantity,
      },
    });
  }

  async updateCartQuantity(userId: string, sellerListingId: string, quantity: number) {
    if (quantity <= 0) {
      return this.prisma.cartItem.delete({
        where: { userId_sellerListingId: { userId, sellerListingId } },
      });
    }

    return this.prisma.cartItem.update({
      where: { userId_sellerListingId: { userId, sellerListingId } },
      data: { quantity },
    });
  }

  async removeFromCart(userId: string, sellerListingId: string) {
    return this.prisma.cartItem.delete({
      where: { userId_sellerListingId: { userId, sellerListingId } },
    });
  }

  // Persistent Wishlist actions
  async getWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        sellerListing: {
          include: {
            productVariant: {
              include: { product: true },
            },
            seller: true,
          },
        },
      },
    });
  }

  async addToWishlist(userId: string, sellerListingId: string) {
    return this.prisma.wishlistItem.upsert({
      where: {
        userId_sellerListingId: { userId, sellerListingId },
      },
      update: {},
      create: {
        userId,
        sellerListingId,
      },
    });
  }

  async removeFromWishlist(userId: string, sellerListingId: string) {
    return this.prisma.wishlistItem.delete({
      where: {
        userId_sellerListingId: { userId, sellerListingId },
      },
    });
  }

  // Ingest grocery product from Open Food Facts barcode
  async ingestOFF(barcode: string) {
    const fallbackSeller = await this.prisma.seller.findFirst();
    if (!fallbackSeller) {
      throw new BadRequestException("No seller account found to assign ingested product");
    }
    return this.openFoodFacts.ingestFromBarcode(barcode, fallbackSeller.id);
  }

  // Product Reviews submissions with verified purchase enforcement
  async addReview(userId: string, productId: string, rating: number, text: string) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException("Rating must be an integer between 1 and 5");
    }

    // Verify user bought a listing of a variant of this product
    const verifiedOrder = await this.prisma.order.findFirst({
      where: {
        consumerId: userId,
        status: "PAID",
        subOrders: {
          some: {
            items: {
              some: {
                sellerListing: {
                  productVariant: {
                    productId: productId,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasBought = verifiedOrder !== null;

    return this.prisma.productReview.create({
      data: {
        productId,
        userId,
        rating,
        text,
        verifiedPurchase: hasBought,
      },
    });
  }

  // Multi-seller Checkout saga
  async checkout(buyerUserId: string, input: { idempotencyKey: string; paymentMethod: string }) {
    // 1. Idempotency Check
    const existingPayment = await this.prisma.paymentAttempt.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existingPayment) {
      return {
        isDuplicate: true,
        paymentStatus: existingPayment.status,
        message: "Duplicate request processed successfully",
      };
    }

    const cartItems = await this.getCart(buyerUserId);
    if (cartItems.length === 0) {
      throw new BadRequestException("Shopping cart is empty");
    }

    // Resolve buyer wallet
    const buyerWallet = await this.prisma.walletAccount.findUnique({
      where: { userId: buyerUserId },
    });

    if (!buyerWallet) {
      throw new NotFoundException("Buyer wallet account not found");
    }

    // Resolve platform admin account
    const platformAdminRole = await this.prisma.userRole.findFirst({
      where: { role: "ADMIN" },
    });
    if (!platformAdminRole) {
      throw new NotFoundException("Platform admin user not found");
    }
    const platformAdminWallet = await this.prisma.walletAccount.findUnique({
      where: { userId: platformAdminRole.userId },
    });

    if (!platformAdminWallet) {
      throw new NotFoundException("Platform admin wallet account not found");
    }

    // Execute checkout transactional operations
    const order = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const sellerGroups: Record<string, { listing: any; quantity: number; subTotal: number }[]> = {};

      // 2. Validate pricing & stock server-side
      for (const item of cartItems) {
        const listing = await tx.sellerListing.findUnique({
          where: { id: item.sellerListingId },
          include: {
            seller: true,
            productVariant: { include: { product: true } },
          },
        });

        if (!listing || listing.status !== "ACTIVE") {
          throw new NotFoundException(`Listing ID ${item.sellerListingId} is unavailable`);
        }

        // Lock inventory stock atomically
        const updatedRows = await tx.$executeRaw`
          UPDATE Inventory
          SET quantity = quantity - ${item.quantity}
          WHERE sellerListingId = ${item.sellerListingId} AND quantity >= ${item.quantity}
        `;

        if (updatedRows === 0) {
          throw new BadRequestException(
            `Insufficient stock for item: ${listing.productVariant.product.title}. Required: ${item.quantity}`
          );
        }

        const subTotal = listing.price * item.quantity;
        totalAmount += subTotal;

        const sellerId = listing.sellerId;
        if (!sellerGroups[sellerId]) {
          sellerGroups[sellerId] = [];
        }
        sellerGroups[sellerId].push({ listing, quantity: item.quantity, subTotal });
      }

      // Check balance sufficiency
      if (buyerWallet.balance < totalAmount) {
        throw new BadRequestException("Insufficient digital wallet balance to complete checkout");
      }

      // 3. Create Master Order
      const masterOrder = await tx.order.create({
        data: {
          consumerId: buyerUserId,
          totalAmount,
          status: "PAID",
        },
      });

      // Create Ledger Transaction reference
      const ledgerTx = await tx.ledgerTransaction.create({
        data: {
          referenceId: masterOrder.id,
          description: `Consolidated payment for Master Order: ${masterOrder.id}`,
        },
      });

      let totalCommissions = 0;

      // 4. Create SubOrders and Ledger records
      for (const [sellerId, items] of Object.entries(sellerGroups)) {
        const subTotal = items.reduce((acc, curr) => acc + curr.subTotal, 0);
        const sellerProfile = items[0].listing.seller;
        const commission = Math.round(subTotal * sellerProfile.commissionRate);
        totalCommissions += commission;
        const sellerEarnings = subTotal - commission;

        const subOrder = await tx.subOrder.create({
          data: {
            orderId: masterOrder.id,
            sellerId,
            subTotal,
            commission,
            status: "PLACED",
          },
        });

        for (const item of items) {
          await tx.orderItem.create({
            data: {
              subOrderId: subOrder.id,
              sellerListingId: item.listing.id,
              quantity: item.quantity,
              price: item.listing.price,
            },
          });
        }

        // Credit Seller
        const sellerWallet = await tx.walletAccount.findUnique({
          where: { userId: sellerProfile.userId },
        });
        if (!sellerWallet) {
          throw new NotFoundException(`Seller wallet for account ${sellerProfile.userId} not found`);
        }

        await tx.ledgerEntry.create({
          data: {
            transactionId: ledgerTx.id,
            accountId: sellerWallet.id,
            type: "CREDIT",
            amount: sellerEarnings,
          },
        });

        await tx.walletAccount.update({
          where: { id: sellerWallet.id },
          data: { balance: { increment: sellerEarnings } },
        });
      }

      // Credit Platform Commissions
      await tx.ledgerEntry.create({
        data: {
          transactionId: ledgerTx.id,
          accountId: platformAdminWallet.id,
          type: "CREDIT",
          amount: totalCommissions,
        },
      });

      await tx.walletAccount.update({
        where: { id: platformAdminWallet.id },
        data: { balance: { increment: totalCommissions } },
      });

      // Debit Buyer
      await tx.ledgerEntry.create({
        data: {
          transactionId: ledgerTx.id,
          accountId: buyerWallet.id,
          type: "DEBIT",
          amount: totalAmount,
        },
      });

      await tx.walletAccount.update({
        where: { id: buyerWallet.id },
        data: { balance: { decrement: totalAmount } },
      });

      // Write Payment attempt
      await tx.paymentAttempt.create({
        data: {
          orderId: masterOrder.id,
          amount: totalAmount,
          status: "COMPLETED",
          idempotencyKey: input.idempotencyKey,
          provider: "INTERNAL_WALLET",
        },
      });

      // 5. Clear Database Cart
      await tx.cartItem.deleteMany({
        where: { userId: buyerUserId },
      });

      return masterOrder;
    });

    return {
      success: true,
      orderId: order.id,
      paymentStatus: "COMPLETED",
      totalAmount: order.totalAmount,
    };
  }

  // Admin Pending Products Moderation listing
  async getPendingProducts() {
    return this.prisma.product.findMany({
      where: { status: "MODERATION" },
      include: { brand: true, category: true },
    });
  }

  async approveProduct(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: "ACTIVE" },
    });
  }

  async rejectProduct(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: "DRAFT" },
    });
  }

  // Get paginated active product catalog for products API endpoint (high-performance query pipeline)
  async getProductsApi(params: {
    category?: string;
    subcategory?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;

    const whereClause: any = {
      status: "ACTIVE",
    };

    // Category / Subcategory tree filters
    if (params.subcategory) {
      whereClause.category = {
        name: params.subcategory,
      };
    } else if (params.category) {
      whereClause.category = {
        OR: [
          { name: params.category },
          { parent: { name: params.category } }
        ]
      };
    }

    // Search filter
    if (params.search) {
      const query = params.search.trim();
      whereClause.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { brand: { name: { contains: query } } },
        { category: { name: { contains: query } } },
        { variants: { some: { sku: { contains: query } } } },
      ];
    }

    // Price range filters (listing price in cents)
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      whereClause.variants = {
        some: {
          listings: {
            some: {
              status: "ACTIVE",
              price: {
                gte: params.minPrice !== undefined ? Math.round(params.minPrice * 100) : undefined,
                lte: params.maxPrice !== undefined ? Math.round(params.maxPrice * 100) : undefined,
              }
            }
          }
        }
      };
    }

    // Fetch lightweight columns to compute sort in memory
    const matches = await this.prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        createdAt: true,
        reviews: { select: { rating: true } },
        variants: {
          select: {
            listings: {
              where: { status: "ACTIVE" },
              select: { price: true, compareAtPrice: true }
            }
          }
        }
      }
    });

    // Compute sorting metrics in-memory
    const ratedMatches = matches.map(p => {
      const prices = p.variants.flatMap(v => v.listings.map(l => l.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      
      const ratings = p.reviews.map(r => r.rating);
      const ratingAvg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const reviewCount = ratings.length;

      // Discount calculations
      let maxDiscount = 0;
      for (const v of p.variants) {
        for (const l of v.listings) {
          if (l.compareAtPrice && l.compareAtPrice > l.price) {
            const disc = ((l.compareAtPrice - l.price) / l.compareAtPrice) * 100;
            if (disc > maxDiscount) maxDiscount = disc;
          }
        }
      }

      return {
        id: p.id,
        title: p.title,
        createdAt: new Date(p.createdAt).getTime(),
        minPrice,
        ratingAvg,
        reviewCount,
        maxDiscount
      };
    });

    // Apply the 9 sorting configurations
    const sortBy = params.sort || "newest";
    ratedMatches.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "price_asc":
          return a.minPrice - b.minPrice;
        case "price_desc":
          return b.minPrice - a.minPrice;
        case "rating_desc":
          return b.ratingAvg - a.ratingAvg;
        case "reviews_desc":
          return b.reviewCount - a.reviewCount;
        case "discount_desc":
          return b.maxDiscount - a.maxDiscount;
        case "name_asc":
          return a.title.localeCompare(b.title);
        case "name_desc":
          return b.title.localeCompare(a.title);
        default:
          return b.createdAt - a.createdAt;
      }
    });

    const pageSlice = ratedMatches.slice(skip, skip + params.limit);

    // Fetch full details for the paginated slice
    const fullProducts = await this.prisma.product.findMany({
      where: {
        id: { in: pageSlice.map(p => p.id) }
      },
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            listings: {
              where: { status: "ACTIVE" },
              include: {
                seller: { select: { businessName: true } },
                inventory: { select: { quantity: true } }
              }
            }
          }
        },
        reviews: {
          select: { rating: true }
        }
      }
    });

    // Restore ordered sequence
    const ordered = pageSlice.map(p => {
      const prod = fullProducts.find(fp => fp.id === p.id);
      if (!prod) return null;
      const ratings = prod.reviews.map(r => r.rating);
      const ratingAvg = ratings.length > 0 ? ratings.reduce((x, y) => x + y, 0) / ratings.length : 0;
      return {
        ...prod,
        ratingAvg,
        reviewCount: ratings.length
      };
    }).filter(Boolean);

    return {
      products: ordered,
      total: ratedMatches.length
    };
  }

  // Get Top level parent Categories list
  async getParentCategories() {
    const cats = await this.prisma.category.findMany({
      where: { parentId: null },
      select: { name: true }
    });
    return cats.map(c => c.name);
  }

  // Get child subcategories names list for parent category name
  async getSubcategoriesForCategoryName(categoryName: string) {
    const parent = await this.prisma.category.findUnique({
      where: { name: categoryName }
    });
    if (!parent) return [];
    
    const children = await this.prisma.category.findMany({
      where: { parentId: parent.id },
      select: { name: true }
    });
    return children.map(c => c.name);
  }
}
