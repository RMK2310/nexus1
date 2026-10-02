import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt, randomUUID } from "crypto";
import { promisify } from "util";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

interface SeedProduct {
  barcode: string;
  title: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  imageUrl: string;
  productType: "GROCERIES" | "ELECTRONICS";
  quantity: string;
  price: number; // in INR rupees
  compareAtPrice: number; // in INR rupees
  rating: number;
  reviewCount: number;
  attributes: Record<string, any>;
}

function isValidEnglishName(name: string | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 150) return false;
  const hasLatin = /[a-zA-Z]/.test(trimmed);
  const hasNonAscii = /[^\x20-\x7E]/.test(trimmed);
  return hasLatin && !hasNonAscii;
}

function cleanTitle(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function generateINRPrice(seedStr: string, isElectronics: boolean): { price: number; comparePrice: number } {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);

  if (isElectronics) {
    const base = 299 + (positive % 9700);
    const rounded = Math.round(base / 50) * 50 - 1;
    const compare = Math.round(rounded * 1.25);
    return { price: Math.max(199, rounded), comparePrice: compare };
  } else {
    const base = 25 + (positive % 550);
    const rounded = Math.round(base / 5) * 5;
    const compare = Math.round(rounded * 1.15);
    return { price: Math.max(20, rounded), comparePrice: compare };
  }
}

function generateRating(seedStr: string): { rating: number; count: number } {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const rating = 3.9 + ((positive % 11) / 10);
  const count = 20 + (positive % 600);
  return { rating: Math.min(5.0, Math.round(rating * 10) / 10), count };
}

function getOptimizedImageUrl(rawImageUrl?: string | null): string {
  if (!rawImageUrl || typeof rawImageUrl !== "string") return "/images/products/food-beverages.jpg";
  const trimmed = rawImageUrl.trim();
  if (trimmed.includes("openfoodfacts.org") || trimmed.includes("openproductsfacts.org")) {
    if (!trimmed.includes(".400.jpg") && !trimmed.includes(".200.jpg") && trimmed.endsWith(".jpg")) {
      return trimmed.replace(/\.jpg$/, ".400.jpg");
    }
  }
  return trimmed;
}

async function fetchOpenFoodFactsIndia(seenImages: Set<string>, seenBarcodes: Set<string>): Promise<SeedProduct[]> {
  console.log("Fetching live Indian Food Products from Open Food Facts...");
  const products: SeedProduct[] = [];

  const searchEndpoints = [
    "https://in.openfoodfacts.org/api/v2/search?countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,categories,image_url,image_front_url,image_front_small_url,nutriscore_grade,ingredients_text,quantity&page_size=100&page=1",
    "https://in.openfoodfacts.org/api/v2/search?countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,categories,image_url,image_front_url,image_front_small_url,nutriscore_grade,ingredients_text,quantity&page_size=100&page=2",
    "https://in.openfoodfacts.org/api/v2/search?countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,categories,image_url,image_front_url,image_front_small_url,nutriscore_grade,ingredients_text,quantity&page_size=100&page=3"
  ];

  for (const url of searchEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      const rawList = data.products || [];

      for (const raw of rawList) {
        const barcode = raw.code;
        if (!barcode || seenBarcodes.has(barcode)) continue;

        const rawName = raw.product_name_en || raw.product_name;
        if (!isValidEnglishName(rawName)) continue;

        const rawImg = raw.image_front_small_url || raw.image_front_url || raw.image_url;
        if (!rawImg || typeof rawImg !== "string" || !rawImg.startsWith("http")) continue;

        const img = getOptimizedImageUrl(rawImg);

        // Strict 1:1 unique image per product
        if (seenImages.has(img)) continue;
        seenImages.add(img);
        seenBarcodes.add(barcode);

        const title = cleanTitle(rawName);
        const brand = raw.brands ? cleanTitle(raw.brands.split(",")[0]) : "Indian Groceries";
        
        let subcat = "Snacks & Packaged Foods";
        if (raw.categories) {
          const firstCat = cleanTitle(raw.categories.split(",")[0]);
          if (firstCat && firstCat.length > 2) {
            subcat = firstCat;
          }
        }

        const pricing = generateINRPrice(barcode + title, false);
        const ratingInfo = generateRating(barcode);

        products.push({
          barcode,
          title,
          brand,
          category: "Food & Beverages",
          subcategory: subcat,
          description: raw.generic_name || raw.ingredients_text || `${title} from ${brand}. Authentic Indian grocery item registered in Open Food Facts.`,
          imageUrl: img,
          productType: "GROCERIES",
          quantity: raw.quantity || "Standard Pack",
          price: pricing.price,
          compareAtPrice: pricing.comparePrice,
          rating: ratingInfo.rating,
          reviewCount: ratingInfo.count,
          attributes: {
            nutriscore: raw.nutriscore_grade ? raw.nutriscore_grade.toUpperCase() : "N/A",
            ingredients: raw.ingredients_text || "Natural food ingredients",
            country: "India",
            source: "Open Food Facts"
          }
        });
      }
    } catch (e: any) {
      console.warn(`Error fetching OFF URL ${url}:`, e.message);
    }
  }

  console.log(`Fetched ${products.length} valid India Food Products with verified 1:1 unique images.`);
  return products;
}

async function fetchOpenProductsFactsElectronics(seenImages: Set<string>, seenBarcodes: Set<string>): Promise<SeedProduct[]> {
  console.log("Fetching live Electronics & Accessories from Open Products Facts...");
  const products: SeedProduct[] = [];

  const searchUrls = [
    "https://world.openproductsfacts.org/api/v2/search?categories_tags_en=electronics&fields=code,product_name,product_name_en,generic_name,brands,categories,image_url,image_front_url,image_front_small_url,quantity&page_size=100&page=1",
    "https://world.openproductsfacts.org/api/v2/search?countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,categories,image_url,image_front_url,image_front_small_url,quantity&page_size=100&page=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=cable&search_simple=1&action=process&json=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=charger&search_simple=1&action=process&json=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=headphones&search_simple=1&action=process&json=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=battery&search_simple=1&action=process&json=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=phone&search_simple=1&action=process&json=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=laptop&search_simple=1&action=process&json=1",
    "https://world.openproductsfacts.org/cgi/search.pl?search_terms=adapter&search_simple=1&action=process&json=1"
  ];

  for (const url of searchUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      const rawList = data.products || [];

      for (const raw of rawList) {
        const barcode = raw.code;
        if (!barcode || seenBarcodes.has(barcode)) continue;

        const rawName = raw.product_name_en || raw.product_name;
        if (!isValidEnglishName(rawName)) continue;

        const rawImg = raw.image_front_small_url || raw.image_front_url || raw.image_url;
        if (!rawImg || typeof rawImg !== "string" || !rawImg.startsWith("http")) continue;

        const img = getOptimizedImageUrl(rawImg);

        // Strict 1:1 unique image per product
        if (seenImages.has(img)) continue;
        seenImages.add(img);
        seenBarcodes.add(barcode);

        const title = cleanTitle(rawName);
        const brand = raw.brands ? cleanTitle(raw.brands.split(",")[0]) : "Tech Brand";
        
        let subcat = "Accessories & Gadgets";
        if (raw.categories) {
          const firstCat = cleanTitle(raw.categories.split(",")[0]);
          if (firstCat && firstCat.length > 2) {
            subcat = firstCat;
          }
        }

        const pricing = generateINRPrice(barcode + title, true);
        const ratingInfo = generateRating(barcode);

        products.push({
          barcode,
          title,
          brand,
          category: "Electronics",
          subcategory: subcat,
          description: raw.generic_name || `${title} by ${brand}. Verified electronics product catalogued in Open Products Facts.`,
          imageUrl: img,
          productType: "ELECTRONICS",
          quantity: raw.quantity || "1 Unit",
          price: pricing.price,
          compareAtPrice: pricing.comparePrice,
          rating: ratingInfo.rating,
          reviewCount: ratingInfo.count,
          attributes: {
            source: "Open Products Facts",
            country: "India",
            warranty: "1 Year Manufacturer Warranty"
          }
        });
      }
    } catch (e: any) {
      console.warn(`Error fetching OPF URL ${url}:`, e.message);
    }
  }

  console.log(`Fetched ${products.length} valid Electronics Products with verified 1:1 unique images.`);
  return products;
}

async function main() {
  console.log("=== STARTING DATABASE SEED WITH OPEN FOOD FACTS & OPEN PRODUCTS FACTS ===");

  // 1. Wipe Old Database Records
  console.log("Cleaning existing database records...");
  await prisma.productReview.deleteMany({}).catch(() => {});
  await prisma.interactionEvent.deleteMany({}).catch(() => {});
  await prisma.inventoryReservation.deleteMany({}).catch(() => {});
  await prisma.inventory.deleteMany({}).catch(() => {});
  await prisma.cartItem.deleteMany({}).catch(() => {});
  await prisma.wishlistItem.deleteMany({}).catch(() => {});
  await prisma.orderItem.deleteMany({}).catch(() => {});
  await prisma.subOrder.deleteMany({}).catch(() => {});
  await prisma.order.deleteMany({}).catch(() => {});
  await prisma.flashSale.deleteMany({}).catch(() => {});
  await prisma.sellerListing.deleteMany({}).catch(() => {});
  await prisma.productVariant.deleteMany({}).catch(() => {});
  await prisma.product.deleteMany({}).catch(() => {});
  await prisma.category.deleteMany({}).catch(() => {});
  await prisma.brand.deleteMany({}).catch(() => {});
  await prisma.seller.deleteMany({}).catch(() => {});
  await prisma.vehicle.deleteMany({}).catch(() => {});
  await prisma.ride.deleteMany({}).catch(() => {});
  await prisma.menuItem.deleteMany({}).catch(() => {});
  await prisma.foodOrder.deleteMany({}).catch(() => {});
  await prisma.restaurant.deleteMany({}).catch(() => {});
  await prisma.conversationMember.deleteMany({}).catch(() => {});
  await prisma.conversation.deleteMany({}).catch(() => {});
  await prisma.auditLog.deleteMany({}).catch(() => {});
  await prisma.deviceKey.deleteMany({}).catch(() => {});
  await prisma.refund.deleteMany({}).catch(() => {});
  await prisma.paymentAttempt.deleteMany({}).catch(() => {});
  await prisma.paymentMethod.deleteMany({}).catch(() => {});
  await prisma.ledgerEntry.deleteMany({}).catch(() => {});
  await prisma.ledgerTransaction.deleteMany({}).catch(() => {});
  await prisma.walletAccount.deleteMany({}).catch(() => {});
  await prisma.userRole.deleteMany({}).catch(() => {});
  await prisma.session.deleteMany({}).catch(() => {});
  await prisma.user.deleteMany({}).catch(() => {});

  console.log("Database cleared successfully.");

  // 2. Prepare test passwords
  const defaultPasswordHash = await hashPassword("NexusPass123!");

  // 3. Create Standard Users & Seller profiles
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@nexus.com",
      name: "Platform Administrator",
      passwordHash: defaultPasswordHash,
      phone: "+919999999999"
    }
  });
  await prisma.userRole.create({ data: { userId: adminUser.id, role: "ADMIN" } });
  await prisma.walletAccount.create({ data: { userId: adminUser.id, balance: 1000000, pinHash: await hashPassword("1234") } });

  const consumerUser = await prisma.user.create({
    data: {
      email: "consumer@nexus.com",
      name: "Alice Consumer",
      passwordHash: defaultPasswordHash,
      phone: "+919888888888"
    }
  });
  await prisma.userRole.create({ data: { userId: consumerUser.id, role: "CONSUMER" } });
  await prisma.walletAccount.create({ data: { userId: consumerUser.id, balance: 50000, pinHash: await hashPassword("1234") } });

  // Merchant 1: Bob Electronics Seller
  const bobUser = await prisma.user.create({
    data: {
      email: "seller@nexus.com",
      name: "Bob Seller",
      passwordHash: defaultPasswordHash,
      phone: "+919777777777"
    }
  });
  await prisma.userRole.create({ data: { userId: bobUser.id, role: "SELLER" } });
  await prisma.userRole.create({ data: { userId: bobUser.id, role: "CONSUMER" } });
  await prisma.walletAccount.create({ data: { userId: bobUser.id, balance: 20000, pinHash: await hashPassword("1234") } });
  const bobSeller = await prisma.seller.create({
    data: {
      userId: bobUser.id,
      businessName: "Bob's Official Tech & Gadgets Store",
      kycStatus: "APPROVED",
      commissionRate: 0.08
    }
  });

  // Merchant 2: Alice Grocery Seller
  const grocerySellerUser = await prisma.user.create({
    data: {
      email: "groceryseller@nexus.com",
      name: "Alice Grocery Seller",
      passwordHash: defaultPasswordHash,
      phone: "+919666666666"
    }
  });
  await prisma.userRole.create({ data: { userId: grocerySellerUser.id, role: "SELLER" } });
  await prisma.walletAccount.create({ data: { userId: grocerySellerUser.id, balance: 30000 } });
  const grocerySeller = await prisma.seller.create({
    data: {
      userId: grocerySellerUser.id,
      businessName: "Alice's Fresh Foods & Groceries",
      kycStatus: "APPROVED",
      commissionRate: 0.05
    }
  });

  // Merchant 3: Gizmo World
  const gadgetSellerUser = await prisma.user.create({
    data: {
      email: "gadgetseller@nexus.com",
      name: "Gizmo Merchant",
      passwordHash: defaultPasswordHash,
      phone: "+919555555555"
    }
  });
  await prisma.userRole.create({ data: { userId: gadgetSellerUser.id, role: "SELLER" } });
  await prisma.walletAccount.create({ data: { userId: gadgetSellerUser.id, balance: 25000 } });
  const gadgetSeller = await prisma.seller.create({
    data: {
      userId: gadgetSellerUser.id,
      businessName: "Gizmo Electronics Hub",
      kycStatus: "APPROVED",
      commissionRate: 0.10
    }
  });

  // Create Driver
  const driverUser = await prisma.user.create({
    data: {
      email: "driver@nexus.com",
      name: "Charlie Driver",
      passwordHash: defaultPasswordHash,
      phone: "+919876543210"
    }
  });
  await prisma.userRole.create({ data: { userId: driverUser.id, role: "DRIVER" } });
  await prisma.walletAccount.create({ data: { userId: driverUser.id, balance: 10000 } });
  await prisma.vehicle.create({
    data: {
      driverId: driverUser.id,
      make: "Hyundai",
      model: "i20 Active",
      plateNumber: "KA-01-MJ-5678"
    }
  });

  // Create Restaurant
  const restOwnerUser = await prisma.user.create({
    data: {
      email: "restaurant@nexus.com",
      name: "David Restaurant Owner",
      passwordHash: defaultPasswordHash,
      phone: "+919123456789"
    }
  });
  await prisma.userRole.create({ data: { userId: restOwnerUser.id, role: "RESTAURANT" } });
  await prisma.walletAccount.create({ data: { userId: restOwnerUser.id, balance: 15000 } });
  const rest = await prisma.restaurant.create({
    data: {
      ownerId: restOwnerUser.id,
      name: "The Curry Palace",
      cuisine: "North Indian / Mughlai",
      isActive: true
    }
  });
  await prisma.menuItem.create({
    data: {
      restaurantId: rest.id,
      name: "Butter Chicken with Butter Naan",
      price: 320,
      isAvailable: true
    }
  });
  await prisma.menuItem.create({
    data: {
      restaurantId: rest.id,
      name: "Shahi Paneer Combo",
      price: 280,
      isAvailable: true
    }
  });

  console.log("Seeded basic standard user profiles, restaurants and drivers.");

  // 4. Fetch Products directly from Open Food Facts & Open Products Facts
  const seenImages = new Set<string>();
  const seenBarcodes = new Set<string>();

  const [foodProducts, electronicsProducts] = await Promise.all([
    fetchOpenFoodFactsIndia(seenImages, seenBarcodes),
    fetchOpenProductsFactsElectronics(seenImages, seenBarcodes)
  ]);

  const allSeedProducts = [...foodProducts, ...electronicsProducts];
  console.log(`Total Unified Products to seed: ${allSeedProducts.length} (Foods: ${foodProducts.length}, Electronics: ${electronicsProducts.length})`);

  // 5. Build Category Tree
  const parentCategories = ["Food & Beverages", "Electronics"];
  const parentCategoryMap: Record<string, string> = {};

  for (const pCat of parentCategories) {
    const created = await prisma.category.create({
      data: { name: pCat, parentId: null }
    });
    parentCategoryMap[pCat] = created.id;
  }

  const subcategoryMap: Record<string, string> = {};
  for (const item of allSeedProducts) {
    const parentId = parentCategoryMap[item.category];
    const subcatName = item.subcategory;
    const key = `${item.category}:::${subcatName}`;

    if (!subcategoryMap[key]) {
      let existingSubcat = await prisma.category.findUnique({ where: { name: subcatName } });
      if (!existingSubcat) {
        existingSubcat = await prisma.category.create({
          data: {
            name: subcatName,
            parentId: parentId || null
          }
        });
      }
      subcategoryMap[key] = existingSubcat.id;
    }
  }

  // 6. Build Brands
  const uniqueBrands = new Set(allSeedProducts.map((p) => p.brand));
  const brandMap: Record<string, string> = {};

  for (const bName of uniqueBrands) {
    let existingBrand = await prisma.brand.findUnique({ where: { name: bName } });
    if (!existingBrand) {
      existingBrand = await prisma.brand.create({
        data: { name: bName }
      });
    }
    brandMap[bName] = existingBrand.id;
  }

  console.log(`Created ${Object.keys(parentCategoryMap).length} top categories, ${Object.keys(subcategoryMap).length} subcategories, and ${Object.keys(brandMap).length} brands.`);

  // 7. Insert Products, Variants, Listings, Inventory & Reviews
  let insertedCount = 0;
  for (const item of allSeedProducts) {
    const subcatKey = `${item.category}:::${item.subcategory}`;
    const categoryId = subcategoryMap[subcatKey] || parentCategoryMap[item.category];
    const brandId = brandMap[item.brand];
    const sku = `${item.productType === "ELECTRONICS" ? "OPF" : "OFF"}-${item.barcode}`;

    // Select seller based on product type
    const assignedSellerId = item.productType === "GROCERIES" 
      ? grocerySeller.id 
      : (insertedCount % 2 === 0 ? bobSeller.id : gadgetSeller.id);

    // Create Product
    const product = await prisma.product.create({
      data: {
        title: item.title,
        description: item.description,
        brandId,
        categoryId,
        status: "ACTIVE",
        productType: item.productType
      }
    });

    // Create Variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku,
        name: item.quantity,
        imageUrl: item.imageUrl,
        attributes: JSON.stringify(item.attributes),
        status: "ACTIVE"
      }
    });

    // Create Seller Listing (in paise / cents: ₹150 -> 15000)
    const listing = await prisma.sellerListing.create({
      data: {
        productVariantId: variant.id,
        sellerId: assignedSellerId,
        price: item.price * 100,
        compareAtPrice: item.compareAtPrice * 100,
        currency: "INR",
        status: "ACTIVE"
      }
    });

    // Create Inventory
    await prisma.inventory.create({
      data: {
        sellerListingId: listing.id,
        quantity: 50 + (insertedCount % 150),
        reservedQuantity: 0
      }
    });

    // Create Product Review
    await prisma.productReview.create({
      data: {
        productId: product.id,
        userId: consumerUser.id,
        rating: Math.max(1, Math.min(5, Math.round(item.rating))),
        text: `Authentic ${item.title} from ${item.brand}. Highly recommended!`,
        verifiedPurchase: true,
        status: "APPROVED"
      }
    });

    insertedCount++;
  }

  console.log(`\n🎉 Successfully seeded ${insertedCount} live products from Open Food Facts & Open Products Facts with 100% verified, unique images!`);
}

main()
  .catch((e) => {
    console.error("Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
