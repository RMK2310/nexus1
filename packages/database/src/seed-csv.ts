import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
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
  console.log("=== SEEDING PRODUCTS FROM CSV ===");
  const csvPath = path.join(__dirname, "../NEXUS_MASTER_PRODUCT_CATALOG_COMBINED.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");
  
  // Headers: product_group_id,variant_id,product_id,base_product_name,product_name,brand,variant_value_pack_size,category,subcategory,detailed_description,price,mrp,currency,discount_percent,availability_status,stock_quantity,dimensions,weight,material_composition,country_of_origin,warranty_information,customer_rating_average,number_of_reviews,date_added_to_catalog,price_basis,price_checked_date,tags_keywords,image_url,image_source,image_status,image_search_url,image_alt_text,image_source_url,model_number,source_dataset
  // Indices: 
  // 4: product_name, 5: brand, 7: category, 8: subcategory, 9: detailed_description, 10: price, 11: mrp, 27: image_url

  const fallbackSeller = await prisma.seller.findFirst();
  if (!fallbackSeller) {
    console.error("No seller found!");
    return;
  }

  let inserted = 0;
  const seenNames = new Set<string>();

  // Get categories and brands
  const categoryMap: Record<string, string> = {};
  const brandMap: Record<string, string> = {};

  for (let i = 1; i < Math.min(lines.length, 500); i++) {
    if (inserted >= 30) break; // Limit to 30 successful product searches

    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 28) continue;

    const title = cols[4]?.trim();
    const brandName = cols[5]?.trim() || "Generic";
    const categoryName = cols[7]?.trim() || "Uncategorized";
    const subcategoryName = cols[8]?.trim() || "General";
    let desc = cols[9]?.trim() || title;
    const priceRaw = parseFloat(cols[10]);
    const mrpRaw = parseFloat(cols[11]);
    let imageUrl = cols[27]?.trim();

    if (!title || seenNames.has(title)) continue;
    seenNames.add(title);

    // Search Open Food Facts if image is missing
    if (!imageUrl || !imageUrl.startsWith("http")) {
      try {
        const query = encodeURIComponent(title);
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as any;
          if (data.products && data.products.length > 0) {
            const first = data.products[0];
            const rawImg = first.image_front_small_url || first.image_front_url || first.image_url;
            if (rawImg && typeof rawImg === "string" && rawImg.startsWith("http")) {
               imageUrl = rawImg;
               if (!desc || desc === title) {
                 desc = first.generic_name || first.ingredients_text || desc;
               }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to search OFF for", title);
      }
    }

    if (!imageUrl || !imageUrl.startsWith("http")) {
       // Search Open Products Facts
       try {
        const query = encodeURIComponent(title);
        const url = `https://world.openproductsfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as any;
          if (data.products && data.products.length > 0) {
            const first = data.products[0];
            const rawImg = first.image_front_small_url || first.image_front_url || first.image_url;
            if (rawImg && typeof rawImg === "string" && rawImg.startsWith("http")) {
               imageUrl = rawImg;
               if (!desc || desc === title) {
                 desc = first.generic_name || desc;
               }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to search OPF for", title);
      }
    }

    // Skip if still no image found
    if (!imageUrl || !imageUrl.startsWith("http")) {
      console.log(`No image found for ${title}, skipping...`);
      continue;
    }

    const price = isNaN(priceRaw) ? 100 : priceRaw;
    const mrp = isNaN(mrpRaw) ? price * 1.2 : mrpRaw;

    try {
      // Resolve Brand
      let brandId = brandMap[brandName];
      if (!brandId) {
        let brand = await prisma.brand.findUnique({ where: { name: brandName } });
        if (!brand) brand = await prisma.brand.create({ data: { name: brandName } });
        brandId = brand.id;
        brandMap[brandName] = brandId;
      }

      // Resolve Category
      let parentCatId = categoryMap[categoryName];
      if (!parentCatId) {
        let pCat = await prisma.category.findUnique({ where: { name: categoryName } });
        if (!pCat) pCat = await prisma.category.create({ data: { name: categoryName } });
        parentCatId = pCat.id;
        categoryMap[categoryName] = parentCatId;
      }

      // Resolve Subcategory
      const subcatKey = categoryName + "::" + subcategoryName;
      let subcatId = categoryMap[subcatKey];
      if (!subcatId) {
        let sCat = await prisma.category.findUnique({ where: { name: subcategoryName } });
        if (!sCat) sCat = await prisma.category.create({ data: { name: subcategoryName, parentId: parentCatId } });
        subcatId = sCat.id;
        categoryMap[subcatKey] = subcatId;
      }

      // Create Product
      let product = await prisma.product.findFirst({ where: { title } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            title,
            description: desc,
            brandId,
            categoryId: subcatId,
            status: "ACTIVE",
            productType: "GROCERIES"
          }
        });
      }

      // Create Variant
      const sku = `CSV-VAR-${Date.now()}-${inserted}`;
      let variant = await prisma.productVariant.findFirst({ where: { productId: product.id } });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            name: "Standard",
            imageUrl: imageUrl,
            status: "ACTIVE",
            attributes: JSON.stringify({ source: "CSV_IMPORT_SEARCH" })
          }
        });
      }

      // Create Listing
      let listing = await prisma.sellerListing.findFirst({
        where: { productVariantId: variant.id, sellerId: fallbackSeller.id }
      });
      if (!listing) {
        listing = await prisma.sellerListing.create({
          data: {
            productVariantId: variant.id,
            sellerId: fallbackSeller.id,
            price: Math.round(price * 100),
            compareAtPrice: Math.round(mrp * 100),
            currency: "INR",
            status: "ACTIVE"
          }
        });
        await prisma.inventory.create({
          data: {
            sellerListingId: listing.id,
            quantity: 100,
            reservedQuantity: 0
          }
        });
      }
      
      inserted++;
      console.log(`Inserted product: ${title}`);
    } catch (e) {
      console.warn("Failed to insert product", title, e);
    }
  }

  console.log(`Successfully seeded ${inserted} products from CSV.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
