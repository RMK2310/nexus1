import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * PostgreSQL Database Importer
 * 
 * Ingests an exported manifest directory into a target PostgreSQL database,
 * preserving IDs, foreign keys, relationships, dates, balances, and ledger records.
 */
export async function importDatabase(targetDbUrl: string, exportDir?: string) {
  const sourceDir = exportDir || path.join(__dirname, "../export_backup");
  const manifestPath = path.join(sourceDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Export manifest not found at ${manifestPath}. Run export-database first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`[IMPORT] Starting import into ${targetDbUrl.replace(/:[^:]*@/, ":***@")}...`);

  const prisma = new PrismaClient({
    datasources: { db: { url: targetDbUrl } },
  });

  function readTable<T>(tableName: string): T[] {
    const filePath = path.join(sourceDir, `${tableName}.json`);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  try {
    // 1. Identity & Auth
    const users = readTable<any>("User");
    if (users.length > 0) {
      console.log(`[IMPORT] Ingesting ${users.length} Users...`);
      for (const u of users) {
        await prisma.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            phone: u.phone,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          },
          update: {},
        });
      }
    }

    const roles = readTable<any>("UserRole");
    if (roles.length > 0) {
      console.log(`[IMPORT] Ingesting ${roles.length} UserRoles...`);
      for (const r of roles) {
        await prisma.userRole.upsert({
          where: { id: r.id },
          create: { id: r.id, userId: r.userId, role: r.role },
          update: {},
        });
      }
    }

    const wallets = readTable<any>("WalletAccount");
    if (wallets.length > 0) {
      console.log(`[IMPORT] Ingesting ${wallets.length} WalletAccounts...`);
      for (const w of wallets) {
        await prisma.walletAccount.upsert({
          where: { id: w.id },
          create: {
            id: w.id,
            userId: w.userId,
            balance: w.balance,
            currency: w.currency,
            pinHash: w.pinHash,
            updatedAt: new Date(w.updatedAt),
          },
          update: { balance: w.balance },
        });
      }
    }

    // 2. Commerce Catalog & Sellers
    const sellers = readTable<any>("Seller");
    if (sellers.length > 0) {
      console.log(`[IMPORT] Ingesting ${sellers.length} Sellers...`);
      for (const s of sellers) {
        await prisma.seller.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            userId: s.userId,
            businessName: s.businessName,
            kycStatus: s.kycStatus,
            commissionRate: s.commissionRate,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          },
          update: {},
        });
      }
    }

    const brands = readTable<any>("Brand");
    if (brands.length > 0) {
      console.log(`[IMPORT] Ingesting ${brands.length} Brands...`);
      for (const b of brands) {
        await prisma.brand.upsert({
          where: { id: b.id },
          create: { id: b.id, name: b.name },
          update: {},
        });
      }
    }

    const categories = readTable<any>("Category");
    if (categories.length > 0) {
      console.log(`[IMPORT] Ingesting ${categories.length} Categories...`);
      // Parent categories first (parentId is null)
      const parents = categories.filter((c: any) => !c.parentId);
      const children = categories.filter((c: any) => c.parentId);

      for (const c of parents) {
        await prisma.category.upsert({
          where: { id: c.id },
          create: { id: c.id, name: c.name, parentId: null },
          update: {},
        });
      }

      for (const c of children) {
        await prisma.category.upsert({
          where: { id: c.id },
          create: { id: c.id, name: c.name, parentId: c.parentId },
          update: {},
        });
      }
    }

    // Products in batch chunks
    const products = readTable<any>("Product");
    if (products.length > 0) {
      console.log(`[IMPORT] Ingesting ${products.length} Products...`);
      const CHUNK = 1000;
      for (let i = 0; i < products.length; i += CHUNK) {
        const chunk = products.slice(i, i + CHUNK).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          brandId: p.brandId,
          categoryId: p.categoryId,
          status: p.status,
          productType: p.productType,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
        await (prisma.product as any).createMany({ data: chunk });
      }
    }

    // ProductVariants
    const variants = readTable<any>("ProductVariant");
    if (variants.length > 0) {
      console.log(`[IMPORT] Ingesting ${variants.length} ProductVariants...`);
      const CHUNK = 1000;
      for (let i = 0; i < variants.length; i += CHUNK) {
        const chunk = variants.slice(i, i + CHUNK).map((v: any) => ({
          id: v.id,
          productId: v.productId,
          sku: v.sku,
          name: v.name,
          attributes: v.attributes,
          imageUrl: v.imageUrl,
          status: v.status,
        }));
        await (prisma.productVariant as any).createMany({ data: chunk });
      }
    }

    // SellerListings
    const listings = readTable<any>("SellerListing");
    if (listings.length > 0) {
      console.log(`[IMPORT] Ingesting ${listings.length} SellerListings...`);
      const CHUNK = 1000;
      for (let i = 0; i < listings.length; i += CHUNK) {
        const chunk = listings.slice(i, i + CHUNK).map((l: any) => ({
          id: l.id,
          productVariantId: l.productVariantId,
          sellerId: l.sellerId,
          price: l.price,
          compareAtPrice: l.compareAtPrice,
          currency: l.currency,
          status: l.status,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }));
        await (prisma.sellerListing as any).createMany({ data: chunk });
      }
    }

    // Inventories
    const inventories = readTable<any>("Inventory");
    if (inventories.length > 0) {
      console.log(`[IMPORT] Ingesting ${inventories.length} Inventories...`);
      const CHUNK = 1000;
      for (let i = 0; i < inventories.length; i += CHUNK) {
        const chunk = inventories.slice(i, i + CHUNK).map((inv: any) => ({
          id: inv.id,
          sellerListingId: inv.sellerListingId,
          quantity: inv.quantity,
          reservedQuantity: inv.reservedQuantity,
          updatedAt: new Date(inv.updatedAt),
        }));
        await (prisma.inventory as any).createMany({ data: chunk });
      }
    }

    // Orders & Ledger
    const orders = readTable<any>("Order");
    if (orders.length > 0) {
      console.log(`[IMPORT] Ingesting ${orders.length} Orders...`);
      for (const o of orders) {
        await prisma.order.upsert({
          where: { id: o.id },
          create: {
            id: o.id,
            consumerId: o.consumerId,
            totalAmount: o.totalAmount,
            status: o.status,
            paymentId: o.paymentId,
            createdAt: new Date(o.createdAt),
            updatedAt: new Date(o.updatedAt),
          },
          update: {},
        });
      }
    }

    const subOrders = readTable<any>("SubOrder");
    if (subOrders.length > 0) {
      console.log(`[IMPORT] Ingesting ${subOrders.length} SubOrders...`);
      for (const so of subOrders) {
        await prisma.subOrder.upsert({
          where: { id: so.id },
          create: {
            id: so.id,
            orderId: so.orderId,
            sellerId: so.sellerId,
            subTotal: so.subTotal,
            commission: so.commission,
            status: so.status,
          },
          update: {},
        });
      }
    }

    const orderItems = readTable<any>("OrderItem");
    if (orderItems.length > 0) {
      console.log(`[IMPORT] Ingesting ${orderItems.length} OrderItems...`);
      for (const oi of orderItems) {
        await prisma.orderItem.upsert({
          where: { id: oi.id },
          create: {
            id: oi.id,
            subOrderId: oi.subOrderId,
            sellerListingId: oi.sellerListingId,
            quantity: oi.quantity,
            price: oi.price,
          },
          update: {},
        });
      }
    }

    const ledgerTxs = readTable<any>("LedgerTransaction");
    if (ledgerTxs.length > 0) {
      console.log(`[IMPORT] Ingesting ${ledgerTxs.length} LedgerTransactions...`);
      for (const ltx of ledgerTxs) {
        await prisma.ledgerTransaction.upsert({
          where: { id: ltx.id },
          create: {
            id: ltx.id,
            referenceId: ltx.referenceId,
            description: ltx.description,
            createdAt: new Date(ltx.createdAt),
          },
          update: {},
        });
      }
    }

    const ledgerEntries = readTable<any>("LedgerEntry");
    if (ledgerEntries.length > 0) {
      console.log(`[IMPORT] Ingesting ${ledgerEntries.length} LedgerEntries...`);
      for (const le of ledgerEntries) {
        await prisma.ledgerEntry.upsert({
          where: { id: le.id },
          create: {
            id: le.id,
            transactionId: le.transactionId,
            accountId: le.accountId,
            type: le.type,
            amount: le.amount,
          },
          update: {},
        });
      }
    }

    console.log("[IMPORT] Database import completed successfully.");
  } finally {
    await prisma.$disconnect();
  }
}
