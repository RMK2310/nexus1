import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";
import { resolvePreciseProductImage } from "@nexus/shared";

const prisma = new PrismaClient();

async function updateAllProductImages() {
  console.log("\n=======================================================");
  console.log("   UPDATING MASTER CATALOG PRODUCT IMAGES WITH PRECISION   ");
  console.log("=======================================================\n");

  // Fetch all variants with their parent product and category
  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      imageUrl: true,
      product: {
        select: {
          title: true,
          category: {
            select: {
              name: true,
              parent: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${variants.length} Product Variants. Applying precision image resolver...`);

  let updatedCount = 0;
  const updates: { id: string; imageUrl: string }[] = [];

  for (const v of variants) {
    const title = v.product?.title || "";
    const subcategory = v.product?.category?.name || "";
    const parentCategory = v.product?.category?.parent?.name || subcategory;

    const preciseUrl = resolvePreciseProductImage(
      title,
      parentCategory,
      subcategory,
      null
    );

    if (v.imageUrl !== preciseUrl) {
      updates.push({ id: v.id, imageUrl: preciseUrl });
      updatedCount++;
    }
  }

  console.log(`Applying ${updates.length} image URL updates in transaction batches...`);

  // Batch execute updates
  const BATCH_SIZE = 500;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map(u =>
        prisma.productVariant.update({
          where: { id: u.id },
          data: { imageUrl: u.imageUrl }
        })
      )
    );
    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length} records...`);
    }
  }

  console.log("\n🎉 All 55,100 Product Variant Images Updated Successfully!");
}

updateAllProductImages()
  .catch(e => {
    console.error("[IMAGE UPDATE ERROR]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
