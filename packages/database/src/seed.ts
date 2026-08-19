import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt, randomUUID } from "crypto";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function getProductImageUrl(category: string, subcategory: string, title: string): string {
  const t = title.toLowerCase();
  const cat = category.toLowerCase();
  const sub = subcategory.toLowerCase();

  // Fresh Fruits & Veggies
  if (t.includes("apple")) return "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80";
  if (t.includes("banana")) return "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80";
  if (t.includes("orange")) return "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&auto=format&fit=crop&q=80";
  if (t.includes("mango")) return "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&auto=format&fit=crop&q=80";
  if (t.includes("pomegranate")) return "https://images.unsplash.com/photo-1581249826359-a292634354c4?w=400&auto=format&fit=crop&q=80";
  if (t.includes("pineapple")) return "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&auto=format&fit=crop&q=80";
  if (t.includes("pear")) return "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=400&auto=format&fit=crop&q=80";
  if (t.includes("grape")) return "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&auto=format&fit=crop&q=80";
  if (t.includes("strawberry")) return "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&auto=format&fit=crop&q=80";
  
  if (t.includes("carrot")) return "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=80";
  if (t.includes("potato")) return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80";
  if (t.includes("onion")) return "https://images.unsplash.com/photo-1508747703725-719ae257c26a?w=400&auto=format&fit=crop&q=80";
  if (t.includes("tomato")) return "https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=80";
  if (t.includes("spinach")) return "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80";
  if (t.includes("broccoli")) return "https://images.unsplash.com/photo-1583209814683-c023de294402?w=400&auto=format&fit=crop&q=80";
  if (t.includes("peas")) return "https://images.unsplash.com/photo-1563565049-7ac45ebb2c81?w=400&auto=format&fit=crop&q=80";

  // Dairy & Alternatives
  if (t.includes("milk")) return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80";
  if (t.includes("cheese")) return "https://images.unsplash.com/photo-1486887396153-fa416525c108?w=400&auto=format&fit=crop&q=80";
  if (t.includes("yogurt")) return "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80";
  if (t.includes("butter")) return "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80";

  // Bakery
  if (t.includes("bread")) return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80";
  if (t.includes("croissant")) return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80";
  if (t.includes("pastry") || t.includes("cake")) return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80";
  if (t.includes("cookie")) return "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80";
  if (t.includes("muffin")) return "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80";
  if (t.includes("rusk")) return "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&auto=format&fit=crop&q=80";

  // Grains & Flours
  if (t.includes("rice")) return "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80";
  if (t.includes("flour")) return "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=400&auto=format&fit=crop&q=80";
  if (t.includes("baking mix") || t.includes("yeast") || t.includes("baking soda") || t.includes("baking powder")) {
    return "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=400&auto=format&fit=crop&q=80";
  }
  if (t.includes("cereal") || t.includes("flakes") || t.includes("muesli") || t.includes("chocos")) {
    return "https://images.unsplash.com/photo-1521485950395-bcfb507d729c?w=400&auto=format&fit=crop&q=80";
  }

  // Food fallback
  if (cat.includes("food") || cat.includes("beverage") || cat.includes("grocery") || cat.includes("cereal")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80";
  }

  // Electronics fallback
  if (cat.includes("electronic") || cat.includes("device") || cat.includes("tech") || cat.includes("gadget")) {
    if (t.includes("phone") || t.includes("iphone") || t.includes("pixel") || t.includes("galaxy")) return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80";
    if (t.includes("laptop") || t.includes("macbook")) return "https://images.unsplash.com/photo-1496181130204-755241544e35?w=400&auto=format&fit=crop&q=80";
    if (t.includes("watch")) return "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&auto=format&fit=crop&q=80";
    if (t.includes("headphones") || t.includes("earbuds")) return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80";
    return "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log("Starting NEXUS expanded marketplace seeding with optimized batching...");

  // 1. Clear database tables in logical dependency order
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
  await prisma.vehicle.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.walletAccount.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

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

  // Merchant 1: Bob Seller
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
      businessName: "Bob's Mega Electronics Store",
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
      businessName: "Alice's Organic Whole Foods",
      kycStatus: "APPROVED",
      commissionRate: 0.05
    }
  });

  // Merchant 3: Gizmo Merchant
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
      businessName: "Gizmo World Retail",
      kycStatus: "APPROVED",
      commissionRate: 0.10
    }
  });

  // Create Driver profile
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

  // Create Restaurant Owner
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

  // 4. Read and Parse CSV File
  const csvPath = path.join(__dirname, "../NEXUS_MASTER_PRODUCT_CATALOG_COMBINED.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV Dataset file not found at path: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, "utf8");
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  // Parse Header Column Indexes
  const headers = parseCSVLine(lines[0]);
  const getColIndex = (name: string) => headers.indexOf(name);

  const idxProdGroupId = getColIndex("product_group_id");
  const idxVariantId = getColIndex("variant_id");
  const idxBaseProdName = getColIndex("base_product_name");
  const idxProdName = getColIndex("product_name");
  const idxBrand = getColIndex("brand");
  const idxPackSize = getColIndex("variant_value_pack_size");
  const idxCategory = getColIndex("category");
  const idxSubcategory = getColIndex("subcategory");
  const idxDescription = getColIndex("detailed_description");
  const idxPrice = getColIndex("price");
  const idxMrp = getColIndex("mrp");
  const idxStock = getColIndex("stock_quantity");
  const idxImageUrl = getColIndex("image_url");

  console.log(`CSV parsed. Total lines: ${lines.length}. Starting DB batch imports...`);

  // Collect unique brands and categories
  const uniqueBrands = new Set<string>();
  const categoryPairs = new Map<string, string>(); // subcategory name -> parent category name

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length) continue;

    const brandName = cols[idxBrand];
    const catName = cols[idxCategory];
    const subcatName = cols[idxSubcategory];

    if (brandName) uniqueBrands.add(brandName);
    if (catName && subcatName) {
      categoryPairs.set(subcatName, catName);
    }
  }

  // Insert Brands
  const brandsCache: Record<string, string> = {};
  for (const bName of uniqueBrands) {
    const b = await prisma.brand.create({ data: { name: bName } });
    brandsCache[bName] = b.id;
  }
  console.log(`Seeded ${Object.keys(brandsCache).length} unique Brands.`);

  // Insert Categories Tree
  const categoriesCache: Record<string, string> = {};
  const parentCategoriesSet = new Set(categoryPairs.values());

  for (const pCatName of parentCategoriesSet) {
    const pCat = await prisma.category.create({ data: { name: pCatName } });
    categoriesCache[pCatName] = pCat.id;
  }

  for (const [subcatName, pCatName] of categoryPairs.entries()) {
    const pCatId = categoriesCache[pCatName];
    const subcat = await prisma.category.create({
      data: {
        name: subcatName,
        parentId: pCatId
      }
    });
    categoriesCache[subcatName] = subcat.id;
  }
  console.log(`Seeded ${Object.keys(categoriesCache).length} Categories in hierarchical tree.`);

  // 1. Process Products
  const productsMap = new Map<string, string>(); // product_group_id -> db_product_id
  const productsToCreate: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length) continue;

    const groupIdx = cols[idxProdGroupId];
    if (productsMap.has(groupIdx)) continue;

    const brandId = brandsCache[cols[idxBrand]] || null;
    const catId = categoriesCache[cols[idxSubcategory]] || categoriesCache[cols[idxCategory]];
    const typeStr = cols[idxCategory].toLowerCase().includes("food") || cols[idxCategory].toLowerCase().includes("beverage") ? "GROCERIES" : "ELECTRONICS";

    const prodId = randomUUID();
    productsMap.set(groupIdx, prodId);
    productsToCreate.push({
      id: prodId,
      title: cols[idxBaseProdName],
      description: cols[idxDescription],
      brandId,
      categoryId: catId,
      status: "ACTIVE",
      productType: typeStr
    });
  }

  console.log(`Batch inserting ${productsToCreate.length} Products...`);
  const CHUNK_SIZE = 1500;
  for (let i = 0; i < productsToCreate.length; i += CHUNK_SIZE) {
    await prisma.product.createMany({ data: productsToCreate.slice(i, i + CHUNK_SIZE) });
  }

  // 2. Process Variants, Listings, and Inventories
  const variantsToCreate: any[] = [];
  const listingsToCreate: any[] = [];
  const inventoriesToCreate: any[] = [];

  const addedSkus = new Set<string>();

  console.log("Preparing variants and seller listings arrays...");
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length) continue;

    const groupIdx = cols[idxProdGroupId];
    const prodId = productsMap.get(groupIdx);
    if (!prodId) continue;

    const variantSku = cols[idxVariantId];
    if (!variantSku || addedSkus.has(variantSku)) continue;
    addedSkus.add(variantSku);

    const categoryName = cols[idxCategory];
    const subcategoryName = cols[idxSubcategory];
    const titleStr = cols[idxBaseProdName];

    const t = titleStr.toLowerCase();
    const sub = subcategoryName.toLowerCase();
    const isLiquid =
      t.includes("milk") ||
      t.includes("juice") ||
      t.includes("drink") ||
      t.includes("spinach") ||
      t.includes("beverage") ||
      sub.includes("beverag");

    let nameStr = cols[idxPackSize] || "Standard Pack";
    let attrName = cols[idxProdName] || titleStr;

    if (isLiquid) {
      nameStr = nameStr.replace(/\bkg\b/gi, "L").replace(/\bg\b/gi, "ml");
      attrName = attrName.replace(/\bkg\b/gi, "L").replace(/\bg\b/gi, "ml");
    }

    const variantId = randomUUID();
    variantsToCreate.push({
      id: variantId,
      productId: prodId,
      sku: variantSku,
      name: nameStr,
      attributes: JSON.stringify({
        variant_name: attrName,
        tags: cols[getColIndex("tags_keywords")]
      }),
      imageUrl: (idxImageUrl !== -1 && cols[idxImageUrl] && cols[idxImageUrl].trim() !== "") ? cols[idxImageUrl] : getProductImageUrl(categoryName, subcategoryName, titleStr),
      status: "ACTIVE"
    });

    // Seller Assignation
    const sellersToAssign = [];
    const typeStr = cols[idxCategory].toLowerCase().includes("food") || cols[idxCategory].toLowerCase().includes("beverage") ? "GROCERIES" : "ELECTRONICS";
    
    if (typeStr === "GROCERIES") {
      sellersToAssign.push(grocerySeller);
    } else {
      sellersToAssign.push(bobSeller);
      if (count % 3 === 0) {
        sellersToAssign.push(gadgetSeller);
      }
    }

    for (const seller of sellersToAssign) {
      const basePrice = Math.round(parseFloat(cols[idxPrice]) * 100);
      const baseMrp = Math.round(parseFloat(cols[idxMrp]) * 100);

      const listingId = randomUUID();
      listingsToCreate.push({
        id: listingId,
        productVariantId: variantId,
        sellerId: seller.id,
        price: basePrice,
        compareAtPrice: baseMrp > basePrice ? baseMrp : null,
        currency: "INR",
        status: "ACTIVE"
      });

      inventoriesToCreate.push({
        id: randomUUID(),
        sellerListingId: listingId,
        quantity: parseInt(cols[idxStock]) || 50,
        reservedQuantity: 0
      });
    }
    count++;
  }

  console.log(`Batch inserting ${variantsToCreate.length} Variants...`);
  for (let i = 0; i < variantsToCreate.length; i += CHUNK_SIZE) {
    await prisma.productVariant.createMany({ data: variantsToCreate.slice(i, i + CHUNK_SIZE) });
  }

  console.log(`Batch inserting ${listingsToCreate.length} Seller Listings...`);
  for (let i = 0; i < listingsToCreate.length; i += CHUNK_SIZE) {
    await prisma.sellerListing.createMany({ data: listingsToCreate.slice(i, i + CHUNK_SIZE) });
  }

  console.log(`Batch inserting ${inventoriesToCreate.length} Inventory records...`);
  for (let i = 0; i < inventoriesToCreate.length; i += CHUNK_SIZE) {
    await prisma.inventory.createMany({ data: inventoriesToCreate.slice(i, i + CHUNK_SIZE) });
  }

  console.log(`Seeding completed successfully! Imported ${count} variants and ${listingsToCreate.length} active merchant listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
