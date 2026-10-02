import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import { createHash } from "crypto";

/**
 * SQLite Database Exporter
 * 
 * Safely extracts all records across all domain models in dependency order,
 * computes cryptographic SHA-256 integrity checksums, and produces an export bundle.
 */
export async function exportDatabase(sqliteDbUrl: string = "file:d:/NEXUS1/nexus.db", outputPath?: string) {
  const exportDir = outputPath || path.join(__dirname, "../export_backup");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: sqliteDbUrl } },
  });

  console.log(`[EXPORT] Initializing database export from ${sqliteDbUrl}...`);

  const manifest: Record<string, { count: number; checksum: string; file: string }> = {};

  async function exportTable<T>(tableName: string, fetcher: () => Promise<T[]>) {
    console.log(`[EXPORT] Extracting ${tableName}...`);
    const records = await fetcher();
    const jsonContent = JSON.stringify(records, null, 2);
    const checksum = createHash("sha256").update(jsonContent).digest("hex");
    const fileName = `${tableName}.json`;
    const filePath = path.join(exportDir, fileName);

    fs.writeFileSync(filePath, jsonContent, "utf8");

    manifest[tableName] = {
      count: records.length,
      checksum,
      file: fileName,
    };

    console.log(`[EXPORT]   ✔ ${tableName}: ${records.length} records (SHA256: ${checksum.substring(0, 12)}...)`);
    return records;
  }

  try {
    // Export in dependency order
    await exportTable("User", () => prisma.user.findMany());
    await exportTable("UserRole", () => prisma.userRole.findMany());
    await exportTable("Session", () => prisma.session.findMany());
    await exportTable("DeviceKey", () => prisma.deviceKey.findMany());
    await exportTable("WalletAccount", () => prisma.walletAccount.findMany());
    await exportTable("Seller", () => prisma.seller.findMany());
    await exportTable("Brand", () => prisma.brand.findMany());
    await exportTable("Category", () => prisma.category.findMany());
    await exportTable("Product", () => prisma.product.findMany());
    await exportTable("ProductVariant", () => prisma.productVariant.findMany());
    await exportTable("SellerListing", () => prisma.sellerListing.findMany());
    await exportTable("Inventory", () => prisma.inventory.findMany());
    await exportTable("InventoryReservation", () => prisma.inventoryReservation.findMany());
    await exportTable("Order", () => prisma.order.findMany());
    await exportTable("SubOrder", () => prisma.subOrder.findMany());
    await exportTable("OrderItem", () => prisma.orderItem.findMany());
    await exportTable("CartItem", () => prisma.cartItem.findMany());
    await exportTable("WishlistItem", () => prisma.wishlistItem.findMany());
    await exportTable("ProductReview", () => prisma.productReview.findMany());
    await exportTable("InteractionEvent", () => prisma.interactionEvent.findMany());
    await exportTable("FlashSale", () => prisma.flashSale.findMany());
    await exportTable("LedgerTransaction", () => prisma.ledgerTransaction.findMany());
    await exportTable("LedgerEntry", () => prisma.ledgerEntry.findMany());
    await exportTable("PaymentMethod", () => prisma.paymentMethod.findMany());
    await exportTable("PaymentAttempt", () => prisma.paymentAttempt.findMany());
    await exportTable("Refund", () => prisma.refund.findMany());
    await exportTable("Vehicle", () => prisma.vehicle.findMany());
    await exportTable("Ride", () => prisma.ride.findMany());
    await exportTable("Restaurant", () => prisma.restaurant.findMany());
    await exportTable("MenuItem", () => prisma.menuItem.findMany());
    await exportTable("FoodOrder", () => prisma.foodOrder.findMany());
    await exportTable("Conversation", () => prisma.conversation.findMany());
    await exportTable("ConversationMember", () => prisma.conversationMember.findMany());
    await exportTable("AuditLog", () => prisma.auditLog.findMany());

    const manifestData = {
      exportedAt: new Date().toISOString(),
      sourceDatabase: sqliteDbUrl,
      totalTables: Object.keys(manifest).length,
      tables: manifest,
    };

    fs.writeFileSync(path.join(exportDir, "manifest.json"), JSON.stringify(manifestData, null, 2), "utf8");
    console.log(`\n[EXPORT] Manifest written to ${path.join(exportDir, "manifest.json")}`);
    console.log(`[EXPORT] Database export completed successfully without data mutation.`);

    return manifestData;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  exportDatabase().catch((err) => {
    console.error("[EXPORT ERROR]", err);
    process.exit(1);
  });
}
