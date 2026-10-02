import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function check() {
  const count = await prisma.product.count();
  const groceries = await prisma.product.count({ where: { productType: "GROCERIES" } });
  const electronics = await prisma.product.count({ where: { productType: "ELECTRONICS" } });
  console.log("Total Products in DB:", count);
  console.log("Groceries (Open Food Facts India):", groceries);
  console.log("Electronics (Open Products Facts):", electronics);

  const sampleFood = await prisma.product.findFirst({
    where: { productType: "GROCERIES" },
    include: { brand: true, category: true, variants: true }
  });
  console.log("\nSample Food Product:", {
    title: sampleFood?.title,
    brand: sampleFood?.brand?.name,
    category: sampleFood?.category?.name,
    sku: sampleFood?.variants[0]?.sku,
    image: sampleFood?.variants[0]?.imageUrl
  });

  const sampleElec = await prisma.product.findFirst({
    where: { productType: "ELECTRONICS" },
    include: { brand: true, category: true, variants: true }
  });
  console.log("\nSample Electronics Product:", {
    title: sampleElec?.title,
    brand: sampleElec?.brand?.name,
    category: sampleElec?.category?.name,
    sku: sampleElec?.variants[0]?.sku,
    image: sampleElec?.variants[0]?.imageUrl
  });
  await prisma.$disconnect();
}
check();
