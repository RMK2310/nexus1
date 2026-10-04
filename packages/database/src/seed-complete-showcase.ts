import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(currentVal);
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}

async function main() {
  console.log("==========================================");
  console.log("   NEXUS COMPLETE SUPER-APP SHOWCASE SEED  ");
  console.log("==========================================");

  const defaultPasswordHash = await hashPassword("NexusPass123!");

  // 1. Ensure Core Users
  console.log("1. Creating / Ensuring User Personas...");

  // Consumer (Alice)
  let consumer = await prisma.user.findUnique({ where: { email: "consumer@nexus.com" } });
  if (!consumer) {
    consumer = await prisma.user.create({
      data: {
        email: "consumer@nexus.com",
        name: "Alice Consumer",
        passwordHash: defaultPasswordHash,
        phone: "+919876543210",
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: consumer.id, role: "CONSUMER" } },
    create: { userId: consumer.id, role: "CONSUMER" },
    update: {},
  });
  await prisma.walletAccount.upsert({
    where: { userId: consumer.id },
    create: { userId: consumer.id, balance: 500000 }, // ₹5,000.00
    update: { balance: 500000 },
  });

  // Admin
  let admin = await prisma.user.findUnique({ where: { email: "admin@nexus.com" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "admin@nexus.com",
        name: "Platform Administrator",
        passwordHash: defaultPasswordHash,
        phone: "+919999999999",
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: admin.id, role: "ADMIN" } },
    create: { userId: admin.id, role: "ADMIN" },
    update: {},
  });

  // Seller (Bob)
  let sellerUser = await prisma.user.findUnique({ where: { email: "seller@nexus.com" } });
  if (!sellerUser) {
    sellerUser = await prisma.user.create({
      data: {
        email: "seller@nexus.com",
        name: "Bob Seller",
        passwordHash: defaultPasswordHash,
        phone: "+919888877777",
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: sellerUser.id, role: "SELLER" } },
    create: { userId: sellerUser.id, role: "SELLER" },
    update: {},
  });
  let seller = await prisma.seller.findFirst({ where: { userId: sellerUser.id } });
  if (!seller) {
    seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        businessName: "Nexus Prime Merchants",
        kycStatus: "APPROVED",
        commissionRate: 0.1,
      },
    });
  }

  // Driver (Charlie)
  let driverUser = await prisma.user.findUnique({ where: { email: "driver@nexus.com" } });
  if (!driverUser) {
    driverUser = await prisma.user.create({
      data: {
        email: "driver@nexus.com",
        name: "Charlie Driver",
        passwordHash: defaultPasswordHash,
        phone: "+919777766666",
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: driverUser.id, role: "DRIVER" } },
    create: { userId: driverUser.id, role: "DRIVER" },
    update: {},
  });
  await prisma.walletAccount.upsert({
    where: { userId: driverUser.id },
    create: { userId: driverUser.id, balance: 15000 },
    update: {},
  });
  const existingVehicle = await prisma.vehicle.findFirst({ where: { plateNumber: "KA-01-MJ-5678" } });
  if (existingVehicle) {
    await prisma.vehicle.update({
      where: { id: existingVehicle.id },
      data: { driverId: driverUser.id },
    });
  } else {
    await prisma.vehicle.create({
      data: {
        driverId: driverUser.id,
        make: "Hyundai",
        model: "i20 Active (AC Cab)",
        plateNumber: "KA-01-MJ-5678",
      },
    });
  }

  // Restaurant Owner (David)
  let restaurantUser = await prisma.user.findUnique({ where: { email: "restaurant@nexus.com" } });
  if (!restaurantUser) {
    restaurantUser = await prisma.user.create({
      data: {
        email: "restaurant@nexus.com",
        name: "David Restaurant Owner",
        passwordHash: defaultPasswordHash,
        phone: "+919666655555",
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: restaurantUser.id, role: "RESTAURANT" } },
    create: { userId: restaurantUser.id, role: "RESTAURANT" },
    update: {},
  });

  console.log("   Users & Personas ready.");

  // 2. Seed Restaurants and Menus (Phase 5)
  console.log("2. Seeding Food Restaurants & Menus...");
  const restaurantsData = [
    {
      name: "The Curry Palace",
      cuisine: "North Indian & Mughlai",
      ownerId: restaurantUser.id,
      menus: [
        { name: "Butter Chicken with Garlic Naan", price: 340 },
        { name: "Paneer Tikka Masala Combo", price: 290 },
        { name: "Hyderabadi Dum Biryani", price: 310 },
        { name: "Gulab Jamun (2 pcs)", price: 90 },
      ],
    },
    {
      name: "Pizza Roma Artisanal",
      cuisine: "Italian & Wood-Fired",
      ownerId: restaurantUser.id,
      menus: [
        { name: "Classic Margherita Pizza", price: 380 },
        { name: "Spicy Pepperoni & Jalapeño", price: 460 },
        { name: "Creamy Truffle Penne Pasta", price: 390 },
        { name: "Garlic Parmesan Dough Balls", price: 180 },
      ],
    },
    {
      name: "Sushi Harbor & Asian Wok",
      cuisine: "Japanese & Pan-Asian",
      ownerId: restaurantUser.id,
      menus: [
        { name: "Salmon & Avocado Roll (8 pcs)", price: 490 },
        { name: "Chicken Teriyaki Bento Box", price: 420 },
        { name: "Classic Pad Thai Noodles", price: 330 },
        { name: "Crispy Vegetable Dim Sum", price: 260 },
      ],
    },
    {
      name: "Burger Craft Co.",
      cuisine: "Gourmet Burgers & Shakes",
      ownerId: restaurantUser.id,
      menus: [
        { name: "Signature Double Smash Burger", price: 310 },
        { name: "Crispy Fried Chicken Burger", price: 280 },
        { name: "Peri-Peri Seasoned Curly Fries", price: 150 },
        { name: "Nutella Thick Shake", price: 190 },
      ],
    },
  ];

  for (const rData of restaurantsData) {
    let rest = await prisma.restaurant.findFirst({ where: { name: rData.name } });
    if (!rest) {
      rest = await prisma.restaurant.create({
        data: {
          name: rData.name,
          cuisine: rData.cuisine,
          ownerId: rData.ownerId,
          isActive: true,
        },
      });
    }

    for (const m of rData.menus) {
      const existingMenu = await prisma.menuItem.findFirst({
        where: { restaurantId: rest.id, name: m.name },
      });
      if (!existingMenu) {
        await prisma.menuItem.create({
          data: {
            restaurantId: rest.id,
            name: m.name,
            price: m.price,
            isAvailable: true,
          },
        });
      }
    }
  }
  console.log("   Restaurants & Menus ready.");

  // 3. Seed Conversations (Phase 4)
  console.log("3. Seeding Conversations...");
  let convAI = await prisma.conversation.findFirst({ where: { name: "NEXUS AI Concierge" } });
  if (!convAI) {
    await prisma.conversation.create({
      data: {
        name: "NEXUS AI Concierge",
        isGroup: false,
        members: { create: [{ userId: consumer.id, role: "MEMBER" }] },
        messages: {
          create: [
            {
              senderId: "system-ai",
              senderName: "NEXUS AI Assistant",
              content: "Hello Alice! 👋 Welcome to NEXUS Super-App. Ask me anything about your orders, ride bookings, or wallet balances!",
            },
          ],
        },
      },
    });
  }

  let convDriver = await prisma.conversation.findFirst({ where: { name: "Charlie Driver (Mobility)" } });
  if (!convDriver) {
    await prisma.conversation.create({
      data: {
        name: "Charlie Driver (Mobility)",
        isGroup: false,
        members: {
          create: [
            { userId: consumer.id, role: "MEMBER" },
            { userId: driverUser.id, role: "MEMBER" },
          ],
        },
        messages: {
          create: [
            {
              senderId: driverUser.id,
              senderName: "Charlie Driver",
              content: "Hello! I am nearby MG Road with my Hyundai i20. Ready when you book!",
            },
          ],
        },
      },
    });
  }

  let convSeller = await prisma.conversation.findFirst({ where: { name: "Bob Seller (Tech Store)" } });
  if (!convSeller) {
    await prisma.conversation.create({
      data: {
        name: "Bob Seller (Tech Store)",
        isGroup: false,
        members: {
          create: [
            { userId: consumer.id, role: "MEMBER" },
            { userId: sellerUser.id, role: "MEMBER" },
          ],
        },
        messages: {
          create: [
            {
              senderId: sellerUser.id,
              senderName: "Bob Seller",
              content: "Your order package has been quality-checked and prepared for dispatch!",
            },
          ],
        },
      },
    });
  }
  console.log("   Conversations ready.");

  // 4. Seed 120 Products from CSV
  console.log("4. Seeding Products from Catalog CSV...");
  const csvPath = path.resolve(__dirname, "../NEXUS_MASTER_PRODUCT_CATALOG_COMBINED.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found at", csvPath);
    return;
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");

  const categoryCache = new Map<string, string>();
  const brandCache = new Map<string, string>();

  let inserted = 0;
  const seenTitles = new Set<string>();

  for (let i = 1; i < lines.length && inserted < 120; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 28) continue;

    const title = cols[4]?.trim();
    const brandName = cols[5]?.trim() || "NEXUS Essentials";
    const categoryName = cols[7]?.trim() || "Food & Beverages";
    const subcategoryName = cols[8]?.trim() || "General";
    const desc = cols[9]?.trim() || `${title} from ${brandName}.`;
    const priceVal = parseFloat(cols[10]) || 99;
    const mrpVal = parseFloat(cols[11]) || priceVal * 1.15;
    const rawImage = cols[27]?.trim() || "";

    if (!title || seenTitles.has(title)) continue;
    seenTitles.add(title);

    // Fallback image resolver
    let imageUrl = rawImage;
    if (!imageUrl || !imageUrl.startsWith("http")) {
      const lower = title.toLowerCase();
      if (lower.includes("oat") || lower.includes("cereal") || lower.includes("flake")) {
        imageUrl = "/images/products/kelloggs-corn-flakes.jpg";
      } else if (lower.includes("oil") || lower.includes("ghee")) {
        imageUrl = "/images/products/fortune-sunflower-oil.jpg";
      } else if (lower.includes("atta") || lower.includes("flour") || lower.includes("wheat")) {
        imageUrl = "/images/products/aashirvaad-atta.jpg";
      } else if (lower.includes("rice") || lower.includes("dal")) {
        imageUrl = "/images/products/daawat-basmati-rice.jpg";
      } else if (lower.includes("tea") || lower.includes("coffee") || lower.includes("beverage")) {
        imageUrl = "/images/products/tata-tea-gold.jpg";
      } else if (lower.includes("biscuit") || lower.includes("cookie") || lower.includes("snack")) {
        imageUrl = "/images/products/parle-g.jpg";
      } else {
        imageUrl = "/images/products/amul-butter.jpg";
      }
    }

    // Ensure Brand
    let brandId = brandCache.get(brandName);
    if (!brandId) {
      let b = await prisma.brand.findUnique({ where: { name: brandName } });
      if (!b) b = await prisma.brand.create({ data: { name: brandName } });
      brandId = b.id;
      brandCache.set(brandName, brandId);
    }

    // Ensure Category
    let categoryId = categoryCache.get(categoryName);
    if (!categoryId) {
      let c = await prisma.category.findUnique({ where: { name: categoryName } });
      if (!c) c = await prisma.category.create({ data: { name: categoryName } });
      categoryId = c.id;
      categoryCache.set(categoryName, categoryId);
    }

    // Create Product
    const product = await prisma.product.create({
      data: {
        title,
        description: desc,
        brandId,
        categoryId,
        status: "ACTIVE",
        productType: categoryName.toLowerCase().includes("electronics") ? "ELECTRONICS" : "GROCERIES",
      },
    });

    // Create Variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `NEXUS-SKU-${cols[1] || inserted}`,
        name: cols[6] || "Standard Pack",
        imageUrl,
        attributes: JSON.stringify({
          weight: cols[17] || "500g",
          origin: cols[19] || "India",
          packaging: "Packaged Retail Unit",
        }),
        status: "ACTIVE",
      },
    });

    // Create Seller Listing
    const listing = await prisma.sellerListing.create({
      data: {
        productVariantId: variant.id,
        sellerId: seller.id,
        price: Math.round(priceVal * 100),
        compareAtPrice: Math.round(mrpVal * 100),
        currency: "INR",
        status: "ACTIVE",
      },
    });

    // Create Inventory
    await prisma.inventory.create({
      data: {
        sellerListingId: listing.id,
        quantity: 75,
        reservedQuantity: 0,
      },
    });

    inserted++;
  }

  console.log(`   Seeded ${inserted} active products with listings & inventory.`);
  console.log("==========================================");
  console.log("   ✅ ALL SUPER-APP PHASES SEEDED CLEANLY ");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
