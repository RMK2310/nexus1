export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface SellerListing {
  id: string;
  price: number; // in cents
  compareAtPrice: number | null; // in cents
  currency: string;
  seller: {
    id: string;
    businessName: string;
  };
  inventory: {
    quantity: number;
  } | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  attributes: string | null;
  imageUrl: string | null;
  listings: SellerListing[];
  // Rich CSV details
  dimensions: string;
  weight: string;
  material_composition: string;
  country_of_origin: string;
  warranty_information: string;
  price_basis: string;
  price_checked_date: string;
  image_source: string;
  image_alt_text: string;
  image_source_url: string;
  image_status: string;
  image_search_url: string;
  source_dataset: string;
  stock_quantity: number;
  availability_status: string;
}

export interface Product {
  id: string; // product_group_id
  title: string;
  description: string;
  brand: Brand | null;
  category: Category;
  productType: string;
  ratingAvg: number;
  reviewCount: number;
  variants: ProductVariant[];
}

export interface CsvRow {
  product_group_id: string;
  variant_id: string;
  product_id: string;
  base_product_name: string;
  product_name: string;
  brand: string;
  variant_value_pack_size: string;
  category: string;
  subcategory: string;
  detailed_description: string;
  price: number;
  mrp: number;
  currency: string;
  discount_percent: number;
  availability_status: string;
  stock_quantity: number;
  dimensions: string;
  weight: string;
  material_composition: string;
  country_of_origin: string;
  warranty_information: string;
  customer_rating_average: number;
  number_of_reviews: number;
  date_added_to_catalog: string;
  price_basis: string;
  price_checked_date: string;
  tags_keywords: string;
  image_url: string;
  image_source: string;
  image_status: string;
  image_search_url: string;
  image_alt_text: string;
  image_source_url: string;
  model_number: string;
  source_dataset: string;
}

// RFC-4180 Compliant CSV Parser
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : "";

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF
      }
      row.push(current.trim());
      if (row.length > 1 || row[0] !== "") {
        result.push(row);
      }
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  if (row.length > 0 || current !== "") {
    row.push(current.trim());
    result.push(row);
  }
  return result;
}

// Product-specific fallback image mapper using keywords
export function getProductFallbackImage(title: string, category: string): string {
  const t = title.toLowerCase();
  const cat = category.toLowerCase();

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
  if (t.includes("kiwi")) return "https://images.unsplash.com/photo-1585052245554-fa559402635a?w=400&auto=format&fit=crop&q=80";
  
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

  // Food / Beverages / Cereal fallbacks
  if (cat.includes("food") || cat.includes("beverage") || cat.includes("grocery") || cat.includes("cereal")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80";
  }

  // Electronics fallback
  if (cat.includes("electronic") || cat.includes("device") || cat.includes("tech") || cat.includes("gadget") || cat.includes("appliances") || cat.includes("display")) {
    if (t.includes("phone") || t.includes("iphone") || t.includes("pixel") || t.includes("galaxy")) return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80";
    if (t.includes("laptop") || t.includes("macbook")) return "https://images.unsplash.com/photo-1496181130204-755241544e35?w=400&auto=format&fit=crop&q=80";
    if (t.includes("watch")) return "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&auto=format&fit=crop&q=80";
    if (t.includes("headphones") || t.includes("earbuds")) return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80";
    if (t.includes("frame") || t.includes("display") || t.includes("screen")) return "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80";
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80";
  }

  // Neutral Generic Placeholder (Not sharing other product images)
  return "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=80";
}

export class ProductRepository {
  private products: Product[] = [];
  private imageErrorsCache = new Set<string>(); // variant_id -> boolean

  // Development validation stats
  public validationStats = {
    totalRecords: 0,
    uniqueProductIds: 0,
    missingNames: 0,
    missingPrices: 0,
    missingCategories: 0,
    missingImageUrls: 0,
    invalidPrices: 0,
    invalidRatings: 0,
    invalidDiscounts: 0
  };

  // Category to Subcategories Map
  private categorySubcategoriesMap = new Map<string, Set<string>>();

  async loadFromCsv(csvText: string): Promise<Product[]> {
    const rawRows = parseCSV(csvText);
    if (rawRows.length < 2) return [];

    const headers = rawRows[0];
    const getColIndex = (name: string) => headers.indexOf(name);

    const idxProdGroupId = getColIndex("product_group_id");
    const idxVariantId = getColIndex("variant_id");
    const idxProductId = getColIndex("product_id");
    const idxBaseProdName = getColIndex("base_product_name");
    const idxProdName = getColIndex("product_name");
    const idxBrand = getColIndex("brand");
    const idxPackSize = getColIndex("variant_value_pack_size");
    const idxCategory = getColIndex("category");
    const idxSubcategory = getColIndex("subcategory");
    const idxDescription = getColIndex("detailed_description");
    const idxPrice = getColIndex("price");
    const idxMrp = getColIndex("mrp");
    const idxCurrency = getColIndex("currency");
    const idxDiscount = getColIndex("discount_percent");
    const idxAvail = getColIndex("availability_status");
    const idxStock = getColIndex("stock_quantity");
    const idxDim = getColIndex("dimensions");
    const idxWeight = getColIndex("weight");
    const idxMat = getColIndex("material_composition");
    const idxOrigin = getColIndex("country_of_origin");
    const idxWarranty = getColIndex("warranty_information");
    const idxRating = getColIndex("customer_rating_average");
    const idxReviews = getColIndex("number_of_reviews");
    const idxDate = getColIndex("date_added_to_catalog");
    const idxPriceBasis = getColIndex("price_basis");
    const idxPriceChecked = getColIndex("price_checked_date");
    const idxTags = getColIndex("tags_keywords");
    const idxImageUrl = getColIndex("image_url");
    const idxImageSource = getColIndex("image_source");
    const idxImageStatus = getColIndex("image_status");
    const idxImageSearchUrl = getColIndex("image_search_url");
    const idxImageAltText = getColIndex("image_alt_text");
    const idxImageSourceUrl = getColIndex("image_source_url");
    const idxModelNum = getColIndex("model_number");
    const idxSourceDataset = getColIndex("source_dataset");

    // Grouping cache
    const groupCache = new Map<string, { baseRow: CsvRow; variants: CsvRow[] }>();
    const uniqueProductIdsSet = new Set<string>();

    this.validationStats.totalRecords = rawRows.length - 1;

    for (let i = 1; i < rawRows.length; i++) {
      const cols = rawRows[i];
      if (cols.length < headers.length) {
        console.warn(`Row ${i + 1} skipped: invalid columns length. ID:`, cols[idxProductId] || "unknown_id");
        continue;
      }

      const pGroupId = cols[idxProdGroupId] || `UNKNOWN-GRP-${i}`;
      const vId = cols[idxVariantId] || `UNKNOWN-VAR-${i}`;
      const pId = cols[idxProductId] || `UNKNOWN-PROD-${i}`;
      uniqueProductIdsSet.add(pId);

      const priceVal = parseFloat(cols[idxPrice]) || 0;
      const mrpVal = parseFloat(cols[idxMrp]) || 0;
      const discountVal = parseFloat(cols[idxDiscount]) || 0;
      const ratingVal = parseFloat(cols[idxRating]) || 0;

      // Validation Metrics
      if (!cols[idxProdName]) this.validationStats.missingNames++;
      if (priceVal <= 0) this.validationStats.missingPrices++;
      if (!cols[idxCategory]) this.validationStats.missingCategories++;
      if (!cols[idxImageUrl] || cols[idxImageUrl].trim() === "") this.validationStats.missingImageUrls++;
      if (isNaN(priceVal) || priceVal < 0) this.validationStats.invalidPrices++;
      if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) this.validationStats.invalidRatings++;
      if (isNaN(discountVal) || discountVal < 0 || discountVal > 100) this.validationStats.invalidDiscounts++;

      // Cache subcategory tree relationship
      const categoryName = cols[idxCategory] || "Uncategorized";
      const subcategoryName = cols[idxSubcategory] || "";
      if (subcategoryName.trim() !== "") {
        if (!this.categorySubcategoriesMap.has(categoryName)) {
          this.categorySubcategoriesMap.set(categoryName, new Set());
        }
        this.categorySubcategoriesMap.get(categoryName)!.add(subcategoryName);
      }

      const rowData: CsvRow = {
        product_group_id: pGroupId,
        variant_id: vId,
        product_id: pId,
        base_product_name: cols[idxBaseProdName] || cols[idxProdName] || "",
        product_name: cols[idxProdName] || "",
        brand: cols[idxBrand] || "",
        variant_value_pack_size: cols[idxPackSize] || "Standard Pack",
        category: categoryName,
        subcategory: subcategoryName,
        detailed_description: cols[idxDescription] || "",
        price: priceVal,
        mrp: mrpVal,
        currency: cols[idxCurrency] || "INR",
        discount_percent: discountVal,
        availability_status: cols[idxAvail] || "OUT_OF_STOCK",
        stock_quantity: parseInt(cols[idxStock]) || 0,
        dimensions: cols[idxDim] || "",
        weight: cols[idxWeight] || "",
        material_composition: cols[idxMat] || "",
        country_of_origin: cols[idxOrigin] || "",
        warranty_information: cols[idxWarranty] || "",
        customer_rating_average: ratingVal,
        number_of_reviews: parseInt(cols[idxReviews]) || 0,
        date_added_to_catalog: cols[idxDate] || new Date().toISOString().split("T")[0],
        price_basis: cols[idxPriceBasis] || "",
        price_checked_date: cols[idxPriceChecked] || "",
        tags_keywords: cols[idxTags] || "",
        image_url: cols[idxImageUrl] || "",
        image_source: cols[idxImageSource] || "",
        image_status: cols[idxImageStatus] || "",
        image_search_url: cols[idxImageSearchUrl] || "",
        image_alt_text: cols[idxImageAltText] || "",
        image_source_url: cols[idxImageSourceUrl] || "",
        model_number: cols[idxModelNum] || "",
        source_dataset: cols[idxSourceDataset] || ""
      };

      if (!groupCache.has(pGroupId)) {
        groupCache.set(pGroupId, { baseRow: rowData, variants: [] });
      }
      groupCache.get(pGroupId)!.variants.push(rowData);
    }

    this.validationStats.uniqueProductIds = uniqueProductIdsSet.size;

    // Convert grouped rows to App Product structure
    const mappedProducts: Product[] = [];

    for (const [groupId, group] of groupCache.entries()) {
      const base = group.baseRow;
      
      const variants: ProductVariant[] = group.variants.map(v => {
        // Dynamic listings configuration to fit local commerce roles
        const isGrocery = base.category.toLowerCase().includes("food") || base.category.toLowerCase().includes("beverage") || base.category.toLowerCase().includes("cereal");
        
        const listings: SellerListing[] = [];
        
        if (isGrocery) {
          listings.push({
            id: `listing-${v.variant_id}-grocery`,
            price: Math.round(v.price * 100), // cents
            compareAtPrice: v.mrp > v.price ? Math.round(v.mrp * 100) : null,
            currency: v.currency,
            seller: {
              id: "alice-grocery-uuid",
              businessName: "Alice's Organic Whole Foods"
            },
            inventory: {
              quantity: v.stock_quantity
            }
          });
        } else {
          // Electronics listing
          listings.push({
            id: `listing-${v.variant_id}-bob`,
            price: Math.round(v.price * 100),
            compareAtPrice: v.mrp > v.price ? Math.round(v.mrp * 100) : null,
            currency: v.currency,
            seller: {
              id: "bob-electronics-uuid",
              businessName: "Bob's Mega Electronics Store"
            },
            inventory: {
              quantity: v.stock_quantity
            }
          });
          
          // Gizmo World random comparative listing (every 3rd item)
          if (v.stock_quantity % 3 === 0) {
            listings.push({
              id: `listing-${v.variant_id}-gizmo`,
              price: Math.round(v.price * 105), // slightly higher price
              compareAtPrice: v.mrp > v.price ? Math.round(v.mrp * 100) : null,
              currency: v.currency,
              seller: {
                id: "gizmo-world-uuid",
                businessName: "Gizmo World Retail"
              },
              inventory: {
                quantity: Math.max(10, v.stock_quantity - 5)
              }
            });
          }
        }

        return {
          id: v.variant_id,
          name: v.variant_value_pack_size,
          sku: v.variant_id,
          attributes: JSON.stringify({ variant_name: v.product_name, tags: v.tags_keywords }),
          imageUrl: v.image_url.trim() !== "" && (v.image_url.startsWith("http://") || v.image_url.startsWith("https://")) ? v.image_url : null,
          listings,
          // Rich data
          dimensions: v.dimensions,
          weight: v.weight,
          material_composition: v.material_composition,
          country_of_origin: v.country_of_origin,
          warranty_information: v.warranty_information,
          price_basis: v.price_basis,
          price_checked_date: v.price_checked_date,
          image_source: v.image_source,
          image_alt_text: v.image_alt_text,
          image_source_url: v.image_source_url,
          image_status: v.image_status,
          image_search_url: v.image_search_url,
          source_dataset: v.source_dataset,
          stock_quantity: v.stock_quantity,
          availability_status: v.availability_status
        };
      });

      mappedProducts.push({
        id: groupId,
        title: base.base_product_name,
        description: base.detailed_description,
        brand: base.brand ? { id: base.brand, name: base.brand } : null,
        category: {
          id: base.category,
          name: base.category,
          parentId: null
        },
        productType: base.category.toLowerCase().includes("food") || base.category.toLowerCase().includes("beverage") || base.category.toLowerCase().includes("cereal") ? "GROCERIES" : "ELECTRONICS",
        ratingAvg: base.customer_rating_average,
        reviewCount: base.number_of_reviews,
        variants
      });
    }

    this.products = mappedProducts;
    return mappedProducts;
  }

  getAllProducts(): Product[] {
    return this.products;
  }

  getProductById(groupId: string): Product | null {
    return this.products.find(p => p.id === groupId) || null;
  }

  // Dynamic categories list
  getCategories(): string[] {
    const cats = new Set<string>();
    for (const p of this.products) {
      const clean = p.category.name.trim();
      if (clean !== "") {
        cats.add(clean);
      }
    }
    return Array.from(cats).sort();
  }

  // Dynamic subcategories list for a specific category
  getSubcategories(categoryName: string): string[] {
    const set = this.categorySubcategoriesMap.get(categoryName);
    if (!set) return [];
    return Array.from(set).sort();
  }

  getSubcategoriesForCategory(categoryName: string): string[] {
    return this.getSubcategories(categoryName);
  }

  // Clean Query Filtering Pipeline (Search -> Category -> Subcategory -> Price -> Sort)
  queryProducts(params: {
    search: string;
    category: string;
    subcategory: string;
    priceMin: number;
    priceMax: number;
    sortBy: string;
  }): Product[] {
    let result = [...this.products];

    // 1. Search (Case Insensitive, Whitespace Tolerant, Partial Match)
    if (params.search && params.search.trim() !== "") {
      const query = params.search.trim().toLowerCase().replace(/\s+/g, " ");
      result = result.filter(p => {
        const brandMatch = p.brand ? p.brand.name.toLowerCase().includes(query) : false;
        const categoryMatch = p.category.name.toLowerCase().includes(query);
        const titleMatch = p.title.toLowerCase().includes(query);
        const descMatch = p.description.toLowerCase().includes(query);
        
        // Match variants name / sku / tags
        const variantMatch = p.variants.some(v => {
          const nameMatch = v.name.toLowerCase().includes(query);
          const skuMatch = v.sku.toLowerCase().includes(query);
          const modelMatch = v.warranty_information.toLowerCase().includes(query) || v.dimensions.toLowerCase().includes(query);
          return nameMatch || skuMatch || modelMatch;
        });

        return titleMatch || descMatch || brandMatch || categoryMatch || variantMatch;
      });
    }

    // 2. Category Filter
    if (params.category && params.category !== "ALL") {
      result = result.filter(p => p.category.name === params.category);
    }

    // 3. Subcategory Filter
    if (params.subcategory && params.subcategory !== "ALL") {
      result = result.filter(p => {
        // Match base rows in this group for subcategory value
        return p.variants.some(v => v.id.toLowerCase().includes(params.subcategory.toLowerCase()) || v.source_dataset.toLowerCase().includes(params.subcategory.toLowerCase()) || v.dimensions.toLowerCase().includes(params.subcategory.toLowerCase()));
      });
    }

    // 4. Price Filter (inspects actual selling price of the active listing)
    if (params.priceMin > 0) {
      result = result.filter(p => {
        return p.variants.some(v => v.listings.some(l => (l.price / 100) >= params.priceMin));
      });
    }
    if (params.priceMax > 0) {
      result = result.filter(p => {
        return p.variants.some(v => v.listings.some(l => (l.price / 100) <= params.priceMax));
      });
    }

    // 5. Sorting Options (safe numerical/alphabetical casting)
    result.sort((a, b) => {
      const priceA = a.variants[0]?.listings[0]?.price || 0;
      const priceB = b.variants[0]?.listings[0]?.price || 0;
      
      const discA = a.variants[0]?.listings[0]?.compareAtPrice 
        ? Math.round(((a.variants[0].listings[0].compareAtPrice - priceA) / a.variants[0].listings[0].compareAtPrice) * 100)
        : 0;
      const discB = b.variants[0]?.listings[0]?.compareAtPrice
        ? Math.round(((b.variants[0].listings[0].compareAtPrice - priceB) / b.variants[0].listings[0].compareAtPrice) * 100)
        : 0;

      switch (params.sortBy) {
        case "newest":
          return new Date(b.variants[0]?.price_basis || 0).getTime() - new Date(a.variants[0]?.price_basis || 0).getTime();
        case "oldest":
          return new Date(a.variants[0]?.price_basis || 0).getTime() - new Date(b.variants[0]?.price_basis || 0).getTime();
        case "price_asc":
          return priceA - priceB;
        case "price_desc":
          return priceB - priceA;
        case "rating_desc":
          return b.ratingAvg - a.ratingAvg;
        case "reviews_desc":
          return b.reviewCount - a.reviewCount;
        case "discount_desc":
          return discB - discA;
        case "name_asc":
          return a.title.localeCompare(b.title);
        case "name_desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }

  // Image Priority & Validation
  getProductImage(product: Product, variantId?: string): string {
    const targetVar = variantId 
      ? product.variants.find(v => v.id === variantId) 
      : product.variants[0];
      
    if (!targetVar) {
      return getProductFallbackImage(product.title, product.category.name);
    }

    if (this.imageErrorsCache.has(targetVar.id)) {
      return getProductFallbackImage(product.title, product.category.name);
    }

    const url = targetVar.imageUrl ? targetVar.imageUrl.trim() : "";
    const isValidUrl = url !== "" && (url.startsWith("http://") || url.startsWith("https://"));
    if (isValidUrl) {
      return url;
    }

    // Product-specific keywords fallback
    return getProductFallbackImage(product.title, product.category.name);
  }

  registerImageFailure(variantId: string) {
    this.imageErrorsCache.add(variantId);
  }
}
