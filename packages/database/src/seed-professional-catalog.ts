import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CuratedProduct {
  id: string;
  title: string;
  brand: string;
  category: "Electronics" | "Food & Beverages";
  subcategory: string;
  productType: "ELECTRONICS" | "GROCERIES";
  price: number; // in INR
  compareAtPrice: number; // in INR
  discount: number;
  ratingAvg: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  variantName: string;
  sku: string;
}

const CURATED_PRODUCTS: CuratedProduct[] = [
  // ── 1. ELECTRONICS ──
  {
    id: "elec-macbook-pro-14",
    title: "Apple MacBook Pro 14 Inch (M3, Space Grey)",
    brand: "Apple",
    category: "Electronics",
    subcategory: "Laptops",
    productType: "ELECTRONICS",
    price: 169900,
    compareAtPrice: 189900,
    discount: 10,
    ratingAvg: 4.9,
    reviewCount: 342,
    imageUrl: "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp",
    description: "Supercharged by Apple M3 Pro chip. 14.2-inch Liquid Retina XDR display, 18GB unified memory, 512GB SSD.",
    variantName: "14-inch • 18GB • 512GB SSD",
    sku: "NEXUS-ELEC-MBP14-001",
  },
  {
    id: "elec-iphone-13-pro",
    title: "Apple iPhone 13 Pro (256 GB, Sierra Blue)",
    brand: "Apple",
    category: "Electronics",
    subcategory: "Smartphones",
    productType: "ELECTRONICS",
    price: 89900,
    compareAtPrice: 109900,
    discount: 18,
    ratingAvg: 4.8,
    reviewCount: 521,
    imageUrl: "https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/thumbnail.webp",
    description: "Pro camera system with 12MP Telephoto, Wide, and Ultra Wide cameras. Super Retina XDR display with ProMotion.",
    variantName: "256 GB • Sierra Blue",
    sku: "NEXUS-ELEC-IPH13P-002",
  },
  {
    id: "elec-samsung-s10",
    title: "Samsung Galaxy S10 (128 GB, Prism White)",
    brand: "Samsung",
    category: "Electronics",
    subcategory: "Smartphones",
    productType: "ELECTRONICS",
    price: 44999,
    compareAtPrice: 54999,
    discount: 18,
    ratingAvg: 4.6,
    reviewCount: 289,
    imageUrl: "https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s10/thumbnail.webp",
    description: "Dynamic AMOLED display with Ultrasonic Fingerprint. Pro-grade multi-camera and wireless PowerShare.",
    variantName: "128 GB • Prism White",
    sku: "NEXUS-ELEC-SAMS10-003",
  },
  {
    id: "elec-airpods-max",
    title: "Apple AirPods Max (Silver)",
    brand: "Apple",
    category: "Electronics",
    subcategory: "Audio & Accessories",
    productType: "ELECTRONICS",
    price: 49900,
    compareAtPrice: 59900,
    discount: 16,
    ratingAvg: 4.8,
    reviewCount: 198,
    imageUrl: "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp",
    description: "High-fidelity audio with Active Noise Cancellation and Transparency mode. Spatial audio for theatre-like sound.",
    variantName: "Over-Ear • Silver",
    sku: "NEXUS-ELEC-APMAX-004",
  },
  {
    id: "elec-airpods-wireless",
    title: "Apple AirPods with Charging Case (2nd Gen)",
    brand: "Apple",
    category: "Electronics",
    subcategory: "Audio & Accessories",
    productType: "ELECTRONICS",
    price: 10999,
    compareAtPrice: 14900,
    discount: 26,
    ratingAvg: 4.7,
    reviewCount: 684,
    imageUrl: "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods/thumbnail.webp",
    description: "Effortless setup, in-ear detection, and automatic switching for a magical listening experience.",
    variantName: "Standard Charging Case",
    sku: "NEXUS-ELEC-AIRPOD-005",
  },
  {
    id: "elec-apple-watch-s4",
    title: "Apple Watch Series 4 GPS (Gold Aluminium)",
    brand: "Apple",
    category: "Electronics",
    subcategory: "Audio & Accessories",
    productType: "ELECTRONICS",
    price: 28990,
    compareAtPrice: 34900,
    discount: 16,
    ratingAvg: 4.7,
    reviewCount: 230,
    imageUrl: "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
    description: "Electrical and optical heart sensors, Digital Crown with haptic feedback, and comprehensive fitness tracking.",
    variantName: "44mm • Gold Sport Band",
    sku: "NEXUS-ELEC-AWATCH-006",
  },
  {
    id: "elec-asus-zenbook-dual",
    title: "Asus ZenBook Pro Dual Screen Laptop (15.6\")",
    brand: "Asus",
    category: "Electronics",
    subcategory: "Laptops",
    productType: "ELECTRONICS",
    price: 149990,
    compareAtPrice: 174990,
    discount: 14,
    ratingAvg: 4.6,
    reviewCount: 112,
    imageUrl: "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp",
    description: "Innovative full-width ScreenPad Plus secondary touchscreen. Intel Core i7, 16GB RAM, NVIDIA RTX graphics.",
    variantName: "16GB RAM • 1TB SSD • RTX",
    sku: "NEXUS-ELEC-ZENBOOK-007",
  },
  {
    id: "elec-dell-xps-13",
    title: "Dell XPS 13 9300 Ultrabook (Intel Core i7)",
    brand: "Dell",
    category: "Electronics",
    subcategory: "Laptops",
    productType: "ELECTRONICS",
    price: 119990,
    compareAtPrice: 139990,
    discount: 14,
    ratingAvg: 4.8,
    reviewCount: 175,
    imageUrl: "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/thumbnail.webp",
    description: "Stunning 4-sided InfinityEdge display in an astonishingly thin 13-inch form factor with CNC aluminium.",
    variantName: "13.4\" FHD+ • 16GB RAM • 512GB",
    sku: "NEXUS-ELEC-DELLXPS-008",
  },
  {
    id: "elec-amazon-echo-plus",
    title: "Amazon Echo Plus Smart Speaker with Alexa & Zigbee",
    brand: "Amazon",
    category: "Electronics",
    subcategory: "Audio & Accessories",
    productType: "ELECTRONICS",
    price: 7999,
    compareAtPrice: 9999,
    discount: 20,
    ratingAvg: 4.6,
    reviewCount: 418,
    imageUrl: "https://cdn.dummyjson.com/product-images/mobile-accessories/amazon-echo-plus/thumbnail.webp",
    description: "Premium 360° Dolby audio with built-in Zigbee smart home hub and sensitive far-field voice microphones.",
    variantName: "Charcoal Fabric",
    sku: "NEXUS-ELEC-ECHOP-009",
  },
  {
    id: "elec-beats-flex",
    title: "Beats Flex All-Day Wireless Earphones",
    brand: "Beats",
    category: "Electronics",
    subcategory: "Audio & Accessories",
    productType: "ELECTRONICS",
    price: 3999,
    compareAtPrice: 5490,
    discount: 27,
    ratingAvg: 4.5,
    reviewCount: 310,
    imageUrl: "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
    description: "Magnetic earbuds with Auto-Play/Pause, Apple W1 chip for seamless connectivity, and up to 12 hours battery.",
    variantName: "Beats Black",
    sku: "NEXUS-ELEC-BEATSF-010",
  },
  {
    id: "elec-magsafe-battery",
    title: "Apple MagSafe Fast Battery Pack",
    brand: "Apple",
    category: "Electronics",
    subcategory: "Audio & Accessories",
    productType: "ELECTRONICS",
    price: 8499,
    compareAtPrice: 10900,
    discount: 22,
    ratingAvg: 4.7,
    reviewCount: 154,
    imageUrl: "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp",
    description: "Snaps on magnetically for safe wireless charging on the go without interfering with credit cards.",
    variantName: "Compact White",
    sku: "NEXUS-ELEC-MAGSAFE-011",
  },
  {
    id: "elec-lenovo-yoga-920",
    title: "Lenovo Yoga 920 2-in-1 Convertible Laptop",
    brand: "Lenovo",
    category: "Electronics",
    subcategory: "Laptops",
    productType: "ELECTRONICS",
    price: 89990,
    compareAtPrice: 104990,
    discount: 14,
    ratingAvg: 4.6,
    reviewCount: 88,
    imageUrl: "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
    description: "360-degree watchband hinge, 4K touchscreen with Active Pen 2 support, and JBL stereo speakers.",
    variantName: "13.9\" 4K Touch • Copper",
    sku: "NEXUS-ELEC-YOGA920-012",
  },

  // ── 2. FOOD & GROCERIES ──
  {
    id: "food-pure-honey-jar",
    title: "Pure Raw Natural Forest Honey Jar (500g)",
    brand: "Nature Valley",
    category: "Food & Beverages",
    subcategory: "Pantry & Condiments",
    productType: "GROCERIES",
    price: 389,
    compareAtPrice: 499,
    discount: 22,
    ratingAvg: 4.9,
    reviewCount: 420,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/honey-jar/thumbnail.webp",
    description: "100% pure unfiltered forest honey, rich in natural antioxidants and enzymes with no added sugar.",
    variantName: "500 g Glass Jar",
    sku: "NEXUS-FOOD-HONEY-001",
  },
  {
    id: "food-nescafe-classic",
    title: "Nescafé Gold Classic Roast Coffee (200g)",
    brand: "Nescafé",
    category: "Food & Beverages",
    subcategory: "Beverages & Coffee",
    productType: "GROCERIES",
    price: 649,
    compareAtPrice: 799,
    discount: 18,
    ratingAvg: 4.8,
    reviewCount: 615,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/nescafe-coffee/thumbnail.webp",
    description: "Artisan roasted Arabica and Robusta beans creating a golden, aromatic rich coffee experience.",
    variantName: "200 g Aroma Jar",
    sku: "NEXUS-FOOD-NESCAFE-002",
  },
  {
    id: "food-cooking-oil",
    title: "Cold-Pressed Extra Virgin Cooking Oil (1L)",
    brand: "Pure Botanicals",
    category: "Food & Beverages",
    subcategory: "Pantry & Condiments",
    productType: "GROCERIES",
    price: 429,
    compareAtPrice: 549,
    discount: 21,
    ratingAvg: 4.7,
    reviewCount: 184,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/cooking-oil/thumbnail.webp",
    description: "Traditional kachi ghani cold-pressed virgin edible oil for heart-healthy everyday cooking.",
    variantName: "1 Litre Bottle",
    sku: "NEXUS-FOOD-OIL-003",
  },
  {
    id: "food-basmati-rice",
    title: "Royal Aged Long Grain Basmati Rice (5kg)",
    brand: "Daawat",
    category: "Food & Beverages",
    subcategory: "Pantry & Condiments",
    productType: "GROCERIES",
    price: 579,
    compareAtPrice: 720,
    discount: 19,
    ratingAvg: 4.8,
    reviewCount: 395,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/rice/thumbnail.webp",
    description: "Aged for two years for royal aroma, slender grains and fluffy texture, perfect for Biryani.",
    variantName: "5 kg Cloth Bag",
    sku: "NEXUS-FOOD-RICE-004",
  },
  {
    id: "food-amul-milk",
    title: "Farm Fresh Pasteurised Whole Milk (1L)",
    brand: "Amul",
    category: "Food & Beverages",
    subcategory: "Dairy & Fresh",
    productType: "GROCERIES",
    price: 74,
    compareAtPrice: 80,
    discount: 7,
    ratingAvg: 4.9,
    reviewCount: 890,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/milk/thumbnail.webp",
    description: "Homogenized, pasteurised whole cow milk rich in calcium, protein, and essential vitamins.",
    variantName: "1 Litre Tetra Pak",
    sku: "NEXUS-FOOD-MILK-005",
  },
  {
    id: "food-fresh-strawberries",
    title: "Fresh Organic Red Strawberries Box (250g)",
    brand: "Mahabaleshwar Farms",
    category: "Food & Beverages",
    subcategory: "Fresh Produce",
    productType: "GROCERIES",
    price: 199,
    compareAtPrice: 250,
    discount: 20,
    ratingAvg: 4.8,
    reviewCount: 240,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/strawberry/thumbnail.webp",
    description: "Sweet, sun-ripened organic strawberries freshly hand-picked and air-freighted to maintain crispness.",
    variantName: "250 g Punnet",
    sku: "NEXUS-FOOD-STRAW-006",
  },
  {
    id: "food-protein-powder",
    title: "Optimum Whey Protein Powder Chocolate (1kg)",
    brand: "Optimum Nutrition",
    category: "Food & Beverages",
    subcategory: "Health & Wellness",
    productType: "GROCERIES",
    price: 2499,
    compareAtPrice: 3199,
    discount: 21,
    ratingAvg: 4.9,
    reviewCount: 780,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/protein-powder/thumbnail.webp",
    description: "24g whey isolate protein per serving with 5.5g BCAAs and rich Dutch cocoa chocolate flavour.",
    variantName: "1 kg Tub • Double Chocolate",
    sku: "NEXUS-FOOD-WHEY-007",
  },
  {
    id: "food-vanilla-icecream",
    title: "Gourmet Madagascar Vanilla Bean Ice Cream (500ml)",
    brand: "Häagen-Dazs",
    category: "Food & Beverages",
    subcategory: "Dairy & Fresh",
    productType: "GROCERIES",
    price: 399,
    compareAtPrice: 499,
    discount: 20,
    ratingAvg: 4.9,
    reviewCount: 312,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/ice-cream/thumbnail.webp",
    description: "Crafted with pure cream and real Madagascar bourbon vanilla bean specks for ultimate indulgence.",
    variantName: "500 ml Tub",
    sku: "NEXUS-FOOD-ICECREAM-008",
  },
  {
    id: "food-fresh-apples",
    title: "Fresh Farm Washington Red Apples (1kg)",
    brand: "Fresh Farm",
    category: "Food & Beverages",
    subcategory: "Fresh Produce",
    productType: "GROCERIES",
    price: 219,
    compareAtPrice: 280,
    discount: 21,
    ratingAvg: 4.7,
    reviewCount: 340,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/apple/thumbnail.webp",
    description: "Crispy, juicy sweet red apples hand-selected from Himalayan orchards.",
    variantName: "1 kg Pack (4-5 Apples)",
    sku: "NEXUS-FOOD-APPLE-009",
  },
  {
    id: "food-mineral-water",
    title: "Natural Spring Mineral Water (Pack of 6x1L)",
    brand: "Himalayan",
    category: "Food & Beverages",
    subcategory: "Beverages & Coffee",
    productType: "GROCERIES",
    price: 180,
    compareAtPrice: 210,
    discount: 14,
    ratingAvg: 4.8,
    reviewCount: 195,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/water/thumbnail.webp",
    description: "Bottled directly at the natural source with balanced minerals and pristine natural pH.",
    variantName: "6 x 1 Litre Bottles",
    sku: "NEXUS-FOOD-WATER-010",
  },
  {
    id: "food-organic-eggs",
    title: "Farm Fresh Grade-A Brown Eggs (Pack of 12)",
    brand: "Eggoz Organic",
    category: "Food & Beverages",
    subcategory: "Dairy & Fresh",
    productType: "GROCERIES",
    price: 139,
    compareAtPrice: 165,
    discount: 15,
    ratingAvg: 4.8,
    reviewCount: 410,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/eggs/thumbnail.webp",
    description: "Free-range, grain-fed, antibiotic-free brown eggs packed with vitamin D3 and omega-3.",
    variantName: "Pack of 12 Eggs",
    sku: "NEXUS-FOOD-EGGS-011",
  },
  {
    id: "food-fresh-potatoes",
    title: "Fresh Farm Russet Potatoes (2kg)",
    brand: "Fresh Farm",
    category: "Food & Beverages",
    subcategory: "Fresh Produce",
    productType: "GROCERIES",
    price: 89,
    compareAtPrice: 110,
    discount: 19,
    ratingAvg: 4.6,
    reviewCount: 220,
    imageUrl: "https://cdn.dummyjson.com/product-images/groceries/potatoes/thumbnail.webp",
    description: "Direct from the farm, ideal for baking, roasting, making chips, and everyday cooking.",
    variantName: "2 kg Net Bag",
    sku: "NEXUS-FOOD-POTATO-012",
  },
];

async function main() {
  console.log("🚀 Starting Professional Catalog & Super-App Seeder...");

  // 1. Ensure Bob Seller exists
  let bob = await prisma.user.findFirst({ where: { email: "bob@example.com" } });
  if (!bob) {
    bob = await prisma.user.create({
      data: {
        email: "bob@example.com",
        name: "Bob Seller",
        passwordHash: "$2b$10$wKzNnZ8Z5q5K5K5K5K5K5uX7G8G8G8G8G8G8G8G8G8G8G8G8G8G8G",
      },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: bob.id, role: "SELLER" } },
    create: { userId: bob.id, role: "SELLER" },
    update: {},
  });

  let seller = await prisma.seller.findFirst({ where: { userId: bob.id } });
  if (!seller) {
    seller = await prisma.seller.create({
      data: {
        userId: bob.id,
        businessName: "Nexus Prime Official Store",
        kycStatus: "APPROVED",
        commissionRate: 0.1,
      },
    });
  }

  // 2. Clear old products to have a pristine, 100% accurate catalog
  console.log("🧹 Clearing old products and listings...");
  await prisma.inventory.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.sellerListing.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productReview.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});

  // 3. Create Root Categories
  console.log("📁 Creating Category hierarchy...");
  const elecCat = await prisma.category.create({
    data: { name: "Electronics" },
  });
  const foodCat = await prisma.category.create({
    data: { name: "Food & Beverages" },
  });

  const subcatMap: Record<string, string> = {};
  const subcategoriesToCreate = [
    { name: "Laptops", parentId: elecCat.id },
    { name: "Smartphones", parentId: elecCat.id },
    { name: "Audio & Accessories", parentId: elecCat.id },
    { name: "Pantry & Condiments", parentId: foodCat.id },
    { name: "Beverages & Coffee", parentId: foodCat.id },
    { name: "Dairy & Fresh", parentId: foodCat.id },
    { name: "Fresh Produce", parentId: foodCat.id },
    { name: "Health & Wellness", parentId: foodCat.id },
  ];

  for (const s of subcategoriesToCreate) {
    const created = await prisma.category.create({
      data: { name: s.name, parentId: s.parentId },
    });
    subcatMap[s.name] = created.id;
  }

  // 4. Seed 24 Curated Products
  console.log("🛍️ Seeding 24 Curated Products with verified CDN matching images...");
  for (const item of CURATED_PRODUCTS) {
    // Upsert Brand
    let brand = await prisma.brand.findUnique({ where: { name: item.brand } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { name: item.brand } });
    }

    const categoryId = subcatMap[item.subcategory] || (item.category === "Electronics" ? elecCat.id : foodCat.id);

    // Create Product
    const product = await prisma.product.create({
      data: {
        id: item.id,
        title: item.title,
        description: item.description,
        brandId: brand.id,
        categoryId: categoryId,
        status: "ACTIVE",
        productType: item.productType,
      },
    });

    // Create Variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: item.sku,
        name: item.variantName,
        imageUrl: item.imageUrl,
        attributes: JSON.stringify({
          brand: item.brand,
          category: item.category,
          subcategory: item.subcategory,
          warranty: item.category === "Electronics" ? "1 Year Official Warranty" : "Quality Guaranteed",
        }),
        status: "ACTIVE",
      },
    });

    // Create Seller Listing (Price in paise / cents)
    const listing = await prisma.sellerListing.create({
      data: {
        productVariantId: variant.id,
        sellerId: seller.id,
        price: item.price * 100, // in paise
        compareAtPrice: item.compareAtPrice * 100,
        currency: "INR",
        status: "ACTIVE",
      },
    });

    // Create Inventory
    await prisma.inventory.create({
      data: {
        sellerListingId: listing.id,
        quantity: 50,
      },
    });
  }
  console.log(`✅ Successfully seeded ${CURATED_PRODUCTS.length} curated products!`);

  // 5. Ensure 4 Restaurants with Menus exist
  const existingRests = await prisma.restaurant.count();
  if (existingRests === 0) {
    console.log("🍽️ Seeding gourmet restaurants and menus...");
    const restData = [
      {
        name: "The Curry Palace",
        cuisine: "North Indian • Mughlai • Biryani",
        menus: [
          { name: "Butter Chicken with Naan", price: 349 },
          { name: "Paneer Tikka Masala", price: 299 },
          { name: "Hyderabadi Dum Biryani", price: 389 },
          { name: "Garlic Butter Naan Basket", price: 129 },
        ],
      },
      {
        name: "Pizza Roma Trattoria",
        cuisine: "Italian • Wood-Fired Pizza • Pasta",
        menus: [
          { name: "Margherita di Bufala Pizza", price: 449 },
          { name: "Truffle Mushroom Fettuccine", price: 499 },
          { name: "Classic Garlic Knots with Marinara", price: 189 },
          { name: "Tiramisu al Caffe", price: 229 },
        ],
      },
      {
        name: "Sushi Harbor & Asian Wok",
        cuisine: "Pan-Asian • Sushi • Dim Sum",
        menus: [
          { name: "Spicy Salmon Crunch Roll (8 pcs)", price: 549 },
          { name: "Truffle Edamame Dim Sum (6 pcs)", price: 379 },
          { name: "Peking Chilli Garlic Noodles", price: 319 },
          { name: "Crispy Prawn Tempura (4 pcs)", price: 429 },
        ],
      },
      {
        name: "Burger Craft & Shake Lab",
        cuisine: "Gourmet Smash Burgers • Fries",
        menus: [
          { name: "Double Smash Bacon Cheeseburger", price: 399 },
          { name: "Crispy Peri Peri Chicken Burger", price: 349 },
          { name: "Loaded Truffle Parmesan Fries", price: 199 },
          { name: "Thick Belgian Chocolate Shake", price: 219 },
        ],
      },
    ];

    for (const r of restData) {
      const rest = await prisma.restaurant.create({
        data: {
          ownerId: bob.id,
          name: r.name,
          cuisine: r.cuisine,
          isActive: true,
        },
      });

      for (const m of r.menus) {
        await prisma.menuItem.create({
          data: {
            restaurantId: rest.id,
            name: m.name,
            price: m.price * 100, // in cents / paise
            isAvailable: true,
          },
        });
      }
    }
  }

  // 6. Ensure Charlie Driver vehicle exists
  let charlie = await prisma.user.findFirst({ where: { email: "charlie@example.com" } });
  if (charlie) {
    const existingVehicle = await prisma.vehicle.findFirst({ where: { driverId: charlie.id } });
    if (!existingVehicle) {
      await prisma.vehicle.create({
        data: {
          driverId: charlie.id,
          make: "Hyundai",
          model: "i20 Active",
          plateNumber: "KA-01-MJ-5678",
        },
      });
    }
  }

  console.log("✨ Master professional showcase database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
