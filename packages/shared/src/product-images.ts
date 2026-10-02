/**
 * High-Precision NEXUS Local Product Image Dictionary & Resolver
 * 
 * Maps categories, subcategories, keywords, brand names, and product titles to
 * verified local high-resolution e-commerce product photos stored directly
 * in the application backend/frontend public assets (/images/products/).
 */

export interface ImageRule {
  keywords: string[];
  url: string;
}

export const PRODUCT_IMAGE_RULES: ImageRule[] = [
  // ==========================================
  // 1. SPECIFIC BRAND BREAKFAST PRODUCTS (Highest Priority)
  // ==========================================
  // ── Bagrry's Specific Products ──
  {
    keywords: ["bagrry's corn flakes", "bagrrys corn flakes", "corn flakes plus"],
    url: "/images/products/bagrrys-corn-flakes-plus.jpg"
  },
  {
    keywords: ["bagrry's jumbo", "bagrrys jumbo", "jumbo rolled oats", "bagrry's 100% jumbo"],
    url: "/images/products/bagrrys-jumbo-oats.jpg"
  },
  {
    keywords: ["bagrry's masala oats", "bagrrys masala oats"],
    url: "/images/products/bagrrys-masala-oats.jpg"
  },
  {
    keywords: ["bagrry's white oats", "bagrrys white oats"],
    url: "/images/products/bagrrys-white-oats.jpg"
  },
  {
    keywords: ["bagrry's oat bran", "bagrrys oat bran", "oat bran"],
    url: "/images/products/bagrrys-oat-bran.jpg"
  },
  {
    keywords: ["bagrry's swiss", "bagrrys swiss", "swiss style muesli"],
    url: "/images/products/bagrrys-swiss-muesli.jpg"
  },
  {
    keywords: ["bagrry's fruit & nut", "bagrrys fruit & nut", "bagrry's fruit and nut"],
    url: "/images/products/bagrrys-fruit-nut-muesli.jpg"
  },
  {
    keywords: ["bagrry's crunchy muesli", "bagrrys crunchy muesli"],
    url: "/images/products/bagrrys-crunchy-muesli.jpg"
  },
  {
    keywords: ["bagrry's", "bagrrys"],
    url: "/images/products/bagrrys-white-oats.jpg"
  },

  // ── Quaker Specific Products ──
  {
    keywords: ["quaker masala oats", "quaker masala"],
    url: "/images/products/quaker-masala-oats.jpg"
  },
  {
    keywords: ["quaker rolled oats", "quaker oats", "quaker"],
    url: "/images/products/quaker-rolled-oats.jpg"
  },

  // ── Kellogg's Specific Products ──
  {
    keywords: ["kellogg's corn flakes", "kelloggs corn flakes", "corn flakes original", "honey corn flakes", "almond & honey corn flakes", "strawberry puree corn flakes"],
    url: "/images/products/kelloggs-corn-flakes.jpg"
  },
  {
    keywords: ["kellogg's chocos", "kelloggs chocos", "chocos crunchy bites", "multigrain chocos", "chocos"],
    url: "/images/products/kelloggs-chocos.jpg"
  },
  {
    keywords: ["kellogg's muesli", "kelloggs muesli", "fruit, nut & seeds muesli"],
    url: "/images/products/kelloggs-muesli.jpg"
  },
  {
    keywords: ["kellogg's granola", "kelloggs granola", "crunchy almond berry crumble granola", "granola"],
    url: "/images/products/kelloggs-granola.jpg"
  },
  {
    keywords: ["kellogg's oats", "kelloggs oats"],
    url: "/images/products/kelloggs-oats.jpg"
  },

  // ── Generic Breakfast Cereals, Flakes & Oats ──
  {
    keywords: ["corn flakes", "cornflakes", "wheat flakes", "flakes", "breakfast cereal", "cereal"],
    url: "/images/products/kelloggs-corn-flakes.jpg"
  },
  {
    keywords: ["oats", "rolled oats", "instant oats", "masala oats", "oatmeal"],
    url: "/images/products/quaker-rolled-oats.jpg"
  },
  {
    keywords: ["muesli", "cereal cluster"],
    url: "/images/products/kelloggs-muesli.jpg"
  },
  {
    keywords: ["cocoa cereal", "chocolate cereal", "choco bites"],
    url: "/images/products/kelloggs-chocos.jpg"
  },

  // ==========================================
  // 2. AUDIO & WEARABLES (EARBUDS BEFORE HEADPHONES)
  // ==========================================
  {
    keywords: ["earbuds", "earbud", "tws", "true wireless", "airpods", "galaxy buds", "earphone", "earphones", "in-ear", "gaming earbuds", "wireless earbuds"],
    url: "/images/products/earbuds.jpg"
  },
  {
    keywords: ["headphone", "headphones", "headset", "over-ear", "on-ear", "anc headphone", "gaming headset", "wireless headphones", "audio equipment"],
    url: "/images/products/headphones.jpg"
  },
  {
    keywords: ["speaker", "bluetooth speaker", "smart speaker", "portable speaker", "smart audio devices", "soundbar", "home theater"],
    url: "/images/products/speaker.jpg"
  },
  {
    keywords: ["smartwatch", "apple watch", "galaxy watch", "fitness watch", "calling smartwatch", "smartwatches", "smart band", "fitness band", "activity tracker", "fitness tracker", "smart ring"],
    url: "/images/products/smartwatch.jpg"
  },

  // ==========================================
  // 3. COMPUTING, PHONES & ACCESSORIES
  // ==========================================
  {
    keywords: ["smartphone", "iphone", "android phone", "mobile phone", "5g phone", "mobile phones", "phone"],
    url: "/images/products/smartphone.jpg"
  },
  {
    keywords: ["tablet", "ipad", "android tablet", "e-reader", "kindle", "tablets & e-readers"],
    url: "/images/products/tablet.jpg"
  },
  {
    keywords: ["laptop", "macbook", "notebook", "ultrabook", "gaming laptop", "laptops & computers"],
    url: "/images/products/laptop.jpg"
  },
  {
    keywords: ["television", "tv", "smart tv", "qled", "oled", "display", "monitor", "televisions & displays"],
    url: "/images/products/television.jpg"
  },
  {
    keywords: ["power bank", "portable charger", "battery pack", "power banks & portable power"],
    url: "/images/products/powerbank.jpg"
  },
  {
    keywords: ["charger", "gan charger", "fast charger", "usb-c charger", "power adapter", "power & charging", "charging cable", "cable", "usb cable"],
    url: "/images/products/charger.jpg"
  },

  // ==========================================
  // 4. HOME & KITCHEN APPLIANCES
  // ==========================================
  {
    keywords: ["refrigerator", "fridge", "freezer", "refrigerators"],
    url: "/images/products/refrigerator.jpg"
  },
  {
    keywords: ["washing machine", "washer", "dryer", "laundry machine", "washing & laundry"],
    url: "/images/products/washing-machine.jpg"
  },

  // ==========================================
  // 5. BAKERY, DAIRY & PACKAGED GROCERIES
  // ==========================================
  {
    keywords: ["bread", "bajra bread", "jowar bread", "ragi bread", "millet bread", "loaf", "bun", "pav", "croissant", "toast", "bakery", "naan", "roti", "paratha"],
    url: "/images/products/bread.jpg"
  },
  {
    keywords: ["milk", "dairy milk", "toned milk", "cow milk", "almond milk", "soy milk", "dairy", "curd", "yogurt", "dahi"],
    url: "/images/products/milk.jpg"
  },
  {
    keywords: ["paneer", "cheese", "mozzarella", "cheddar", "cottage cheese"],
    url: "/images/products/paneer.jpg"
  },
  {
    keywords: ["biscuit", "cookie", "cookies", "rusk", "cream biscuit", "wafer", "cake", "pastry", "muffin", "brownie"],
    url: "/images/products/biscuit.jpg"
  },
  {
    keywords: ["chips", "potato chips", "namkeen", "bhujia", "snack", "popcorn", "crisps", "nachos", "snacks"],
    url: "/images/products/chips.jpg"
  },
  {
    keywords: ["chocolate", "candy", "toffee", "dark chocolate", "sweet", "sweets", "mithai", "ladoo", "kaju katli", "gulab jamun"],
    url: "/images/products/chocolate.jpg"
  },

  // ==========================================
  // 6. STAPLE GRAINS, PULSES & OILS
  // ==========================================
  {
    keywords: ["basmati rice", "brown rice", "rice", "biryani rice", "raw rice", "rice flour", "flour", "atta", "wheat flour", "maida", "besan", "suji", "grain"],
    url: "/images/products/rice.jpg"
  },
  {
    keywords: ["dal", "pulses", "lentils", "chana", "moong", "toor", "urad", "rajma", "chickpeas", "dal tadka"],
    url: "/images/products/dal.jpg"
  },
  {
    keywords: ["oil", "cooking oil", "mustard oil", "sunflower oil", "olive oil", "ghee", "butter"],
    url: "/images/products/oil.jpg"
  },
  {
    keywords: ["spice", "masala", "turmeric", "chilli powder", "garam masala", "cardamom", "clove", "cumin", "pepper", "salt", "sugar"],
    url: "/images/products/spices.jpg"
  },

  // ==========================================
  // 7. CLEANING & HOUSEHOLD
  // ==========================================
  {
    keywords: ["detergent", "laundry", "washing powder", "liquid detergent", "fabric conditioner", "laundry detergents"],
    url: "/images/products/detergent.jpg"
  },
  {
    keywords: ["cleaner", "surface cleaner", "floor cleaner", "disinfectant", "lizol", "dishwash", "dish soap", "mop", "scrubber", "cleaning"],
    url: "/images/products/cleaner.jpg"
  },

  // ==========================================
  // 8. FRESH FRUITS & VEGETABLES
  // ==========================================
  {
    keywords: ["apple", "apples"],
    url: "/images/products/apples.jpg"
  },
  {
    keywords: ["banana", "bananas"],
    url: "/images/products/bananas.jpg"
  },
  {
    keywords: ["fruits", "fresh fruits", "tropical fruits", "mango", "orange", "grapes", "berries"],
    url: "/images/products/fruits.jpg"
  },
  {
    keywords: ["vegetables", "fresh vegetables", "tomato", "potato", "onion", "spinach"],
    url: "/images/products/vegetables.jpg"
  }
];

/**
 * Optimizes Open Food Facts / Open Products Facts image URLs by using fast .400.jpg CDN thumbnails
 */
export function getOptimizedImageUrl(rawImageUrl?: string | null): string {
  if (!rawImageUrl || typeof rawImageUrl !== "string") return "/images/products/fruits.jpg";
  const trimmed = rawImageUrl.trim();
  if (trimmed.includes("openfoodfacts.org") || trimmed.includes("openproductsfacts.org")) {
    if (!trimmed.includes(".400.jpg") && !trimmed.includes(".200.jpg") && trimmed.endsWith(".jpg")) {
      return trimmed.replace(/\.jpg$/, ".400.jpg");
    }
  }
  return trimmed;
}

/**
 * Resolves the most accurate product photo URL for a given product metadata.
 * Prioritizes optimized Open Facts and fast local assets.
 */
export function resolvePreciseProductImage(
  title: string = "",
  category: string = "",
  subcategory: string = "",
  rawImageUrl?: string | null
): string {
  // If rawImageUrl already points to a verified local asset or custom URL that isn't broken
  if (
    rawImageUrl &&
    (rawImageUrl.startsWith("/images/products/") ||
     (rawImageUrl.trim().startsWith("http") &&
      !rawImageUrl.includes("photo-1542838132-92c53300491e") &&
      !rawImageUrl.includes("photo-1523275335684-37898b6baf30") &&
      !rawImageUrl.includes("photo-1525385133512-2f3bdd039054") &&
      !rawImageUrl.includes("photo-1586495777744-4413f21062fa") &&
      !rawImageUrl.includes("photo-1521485950395-bcfb507d729c") &&
      !rawImageUrl.includes("photo-1584776296944-ab6fb57b0bdd")))
  ) {
    return getOptimizedImageUrl(rawImageUrl);
  }

  const cleanTitle = title.toLowerCase();
  const cleanSub = subcategory.toLowerCase();
  const cleanCat = category.toLowerCase();
  const fullText = `${cleanTitle} ${cleanSub} ${cleanCat}`;

  // 1. Exact Title / Subcategory keyword match (Priority)
  for (const rule of PRODUCT_IMAGE_RULES) {
    for (const kw of rule.keywords) {
      if (cleanTitle.includes(kw) || cleanSub.includes(kw)) {
        return rule.url;
      }
    }
  }

  // 2. Full text match
  for (const rule of PRODUCT_IMAGE_RULES) {
    for (const kw of rule.keywords) {
      if (fullText.includes(kw)) {
        return rule.url;
      }
    }
  }

  // 3. Fallbacks by broad domain to local assets
  if (cleanCat.includes("electronic") || cleanCat.includes("device") || cleanCat.includes("audio")) {
    return "/images/products/headphones.jpg";
  }
  if (cleanCat.includes("appliance")) {
    return "/images/products/refrigerator.jpg";
  }
  if (cleanCat.includes("clean") || cleanCat.includes("wash") || cleanCat.includes("detergent")) {
    return "/images/products/cleaner.jpg";
  }
  if (cleanCat.includes("cereal") || cleanCat.includes("grain") || cleanCat.includes("flour") || cleanCat.includes("bread")) {
    return "/images/products/kelloggs-corn-flakes.jpg";
  }

  return "/images/products/kelloggs-corn-flakes.jpg";
}
