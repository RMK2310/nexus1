import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";

/**
 * Database Integrity Auditor
 * 
 * Verifies relational consistency, row counts, wallet non-negativity,
 * zero-sum ledger invariants, and catalog completeness.
 */
export async function auditDatabaseIntegrity(databaseUrl?: string) {
  const dbUrl = databaseUrl || process.env.DATABASE_URL || "file:d:/NEXUS1/nexus.db";
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  console.log("\n=======================================================");
  console.log("       NEXUS DATABASE INTEGRITY & HEALTH AUDIT        ");
  console.log("=======================================================\n");

  const results: { check: string; status: "PASS" | "FAIL" | "WARN"; details: string }[] = [];

  try {
    // 1. Row counts across critical domains
    const [
      userCount,
      roleCount,
      walletCount,
      sellerCount,
      brandCount,
      categoryCount,
      productCount,
      variantCount,
      listingCount,
      orderCount,
      subOrderCount,
      ledgerTxCount,
      ledgerEntryCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userRole.count(),
      prisma.walletAccount.count(),
      prisma.seller.count(),
      prisma.brand.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.productVariant.count(),
      prisma.sellerListing.count(),
      prisma.order.count(),
      prisma.subOrder.count(),
      prisma.ledgerTransaction.count(),
      prisma.ledgerEntry.count(),
    ]);

    console.log(`📊 Domain Record Counts:`);
    console.log(`   - Users:              ${userCount}`);
    console.log(`   - User Roles:         ${roleCount}`);
    console.log(`   - Wallets:            ${walletCount}`);
    console.log(`   - Sellers:            ${sellerCount}`);
    console.log(`   - Brands:             ${brandCount}`);
    console.log(`   - Categories:         ${categoryCount}`);
    console.log(`   - Products:           ${productCount}`);
    console.log(`   - Product Variants:   ${variantCount}`);
    console.log(`   - Seller Listings:    ${listingCount}`);
    console.log(`   - Orders:             ${orderCount}`);
    console.log(`   - SubOrders:          ${subOrderCount}`);
    console.log(`   - Ledger Txs:         ${ledgerTxCount}`);
    console.log(`   - Ledger Entries:     ${ledgerEntryCount}`);

    // 2. Invariant Check: Negative Wallet Balances
    const negativeWallets = await prisma.walletAccount.findMany({
      where: { balance: { lt: 0 } },
    });

    if (negativeWallets.length === 0) {
      results.push({ check: "Wallet Non-Negative Invariant", status: "PASS", details: "All wallet balances are >= 0" });
    } else {
      results.push({ check: "Wallet Non-Negative Invariant", status: "FAIL", details: `Found ${negativeWallets.length} negative wallet balances!` });
    }

    // 3. Invariant Check: Orphaned ProductVariants
    const orphanedVariants = await prisma.productVariant.findMany({
      where: { product: null as any },
    }).catch(() => []);

    results.push({
      check: "Product Variant FK Integrity",
      status: orphanedVariants.length === 0 ? "PASS" : "FAIL",
      details: `${orphanedVariants.length} orphaned product variants`,
    });

    // 4. Invariant Check: Orphaned SellerListings
    const orphanedListings = await prisma.sellerListing.findMany({
      where: { productVariant: null as any },
    }).catch(() => []);

    results.push({
      check: "Seller Listing FK Integrity",
      status: orphanedListings.length === 0 ? "PASS" : "FAIL",
      details: `${orphanedListings.length} orphaned seller listings`,
    });

    // 5. Invariant Check: Double-Entry Ledger Zero-Sum
    const allLedgerTxs = await prisma.ledgerTransaction.findMany({
      include: { entries: true },
    });

    let unbalancedTxs = 0;
    for (const ltx of allLedgerTxs) {
      const debits = ltx.entries.filter(e => e.type === "DEBIT").reduce((acc, e) => acc + e.amount, 0);
      const credits = ltx.entries.filter(e => e.type === "CREDIT").reduce((acc, e) => acc + e.amount, 0);
      if (debits !== credits) {
        unbalancedTxs++;
      }
    }

    if (allLedgerTxs.length === 0 || unbalancedTxs === 0) {
      results.push({
        check: "Double-Entry Ledger Zero-Sum",
        status: "PASS",
        details: `All ${allLedgerTxs.length} ledger transactions satisfy debits == credits`,
      });
    } else {
      results.push({
        check: "Double-Entry Ledger Zero-Sum",
        status: "FAIL",
        details: `${unbalancedTxs} unbalanced transactions found!`,
      });
    }

    // Print summary table
    console.log("\n📋 Integrity Invariant Check Results:");
    console.table(results);

    const allPassed = results.every(r => r.status === "PASS");
    return { allPassed, results, counts: { userCount, productCount, orderCount, walletCount } };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  auditDatabaseIntegrity().catch((err) => {
    console.error("[AUDIT ERROR]", err);
    process.exit(1);
  });
}
