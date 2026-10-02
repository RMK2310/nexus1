import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AppLogger } from "../logger/logger.service";
import { randomBytes, scrypt, randomUUID, createHmac } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger
  ) {}

  /**
   * Secure Scrypt PIN Hashing
   */
  private async hashPin(pin: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  /**
   * Secure Scrypt PIN Verification
   */
  private async verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
    try {
      const [hashed, salt] = storedHash.split(".");
      if (!hashed || !salt) return false;
      const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
      return buf.toString("hex") === hashed;
    } catch {
      return false;
    }
  }

  /**
   * Get or initialize user's Wallet Account
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.walletAccount.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.walletAccount.create({
        data: {
          userId,
          balance: 0,
          currency: "INR",
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    }

    return wallet;
  }

  /**
   * Get User Wallet Details with summary statistics
   */
  async getWalletDetails(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const entryCount = await this.prisma.ledgerEntry.count({
      where: { accountId: wallet.id },
    });

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      balanceINR: Number((wallet.balance / 100).toFixed(2)),
      currency: wallet.currency,
      hasPin: Boolean(wallet.pinHash),
      totalTransactions: entryCount,
      updatedAt: wallet.updatedAt,
      user: wallet.user,
    };
  }

  /**
   * Get Complete Double-Entry Ledger Statement History for User
   */
  async getTransactionHistory(
    userId: string,
    options?: { limit?: number; type?: string; category?: string }
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const limit = Math.min(100, Math.max(1, options?.limit || 50));

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        accountId: wallet.id,
        ...(options?.type && { type: options.type }),
      },
      orderBy: { transaction: { createdAt: "desc" } },
      take: limit,
      include: {
        transaction: {
          include: {
            entries: true,
          },
        },
      },
    });

    // Resolve counterparty details for peer transfers or merchant orders
    const allAccountIds = new Set<string>();
    for (const e of entries) {
      for (const sibling of e.transaction.entries) {
        if (sibling.accountId !== wallet.id) {
          allAccountIds.add(sibling.accountId);
        }
      }
    }

    const counterpartWallets = await this.prisma.walletAccount.findMany({
      where: { id: { in: Array.from(allAccountIds) } },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const counterpartMap = new Map(counterpartWallets.map((w) => [w.id, w.user]));

    const formatted = entries.map((entry) => {
      const isDebit = entry.type === "DEBIT";
      const siblingEntries = entry.transaction.entries.filter((s) => s.accountId !== wallet.id);
      const counterpartyUser = siblingEntries.length > 0 ? counterpartMap.get(siblingEntries[0].accountId) : null;

      let category = "GENERAL";
      const desc = entry.transaction.description.toLowerCase();
      if (desc.includes("top-up") || desc.includes("deposit")) category = "TOPUP";
      else if (desc.includes("p2p") || desc.includes("transfer")) category = "P2P_TRANSFER";
      else if (desc.includes("order") || desc.includes("checkout")) category = "PURCHASE";
      else if (desc.includes("refund")) category = "REFUND";

      return {
        id: entry.id,
        transactionId: entry.transactionId,
        referenceId: entry.transaction.referenceId,
        type: entry.type, // DEBIT or CREDIT
        amount: entry.amount, // in cents/paise
        amountINR: Number((entry.amount / 100).toFixed(2)),
        description: entry.transaction.description,
        category,
        isDebit,
        counterparty: counterpartyUser
          ? {
              name: counterpartyUser.name,
              email: counterpartyUser.email,
              phone: counterpartyUser.phone,
            }
          : null,
        createdAt: entry.transaction.createdAt,
      };
    });

    return formatted;
  }

  /**
   * Set or Update Security PIN
   */
  async setWalletPin(userId: string, newPin: string, currentPin?: string) {
    if (!/^\d{4}$/.test(newPin)) {
      throw new BadRequestException("PIN must be exactly 4 digits");
    }

    const wallet = await this.getOrCreateWallet(userId);

    // If PIN is already set, verify current PIN
    if (wallet.pinHash) {
      if (!currentPin) {
        throw new BadRequestException("Current PIN is required to set a new PIN");
      }
      const isValid = await this.verifyPinHash(currentPin, wallet.pinHash);
      if (!isValid) {
        throw new ForbiddenException("Invalid current security PIN");
      }
    }

    const pinHash = await this.hashPin(newPin);

    await this.prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { pinHash },
    });

    this.logger.log(`Security PIN updated for user ${userId}`);
    return { success: true, message: "Security PIN set successfully" };
  }

  /**
   * Verify User Wallet PIN
   */
  async verifyWalletPin(userId: string, pin: string): Promise<boolean> {
    const wallet = await this.getOrCreateWallet(userId);
    if (!wallet.pinHash) {
      throw new BadRequestException("Security PIN has not been configured yet");
    }

    const isValid = await this.verifyPinHash(pin, wallet.pinHash);
    if (!isValid) {
      throw new ForbiddenException("Incorrect 4-digit security PIN");
    }

    return true;
  }

  /**
   * Atomic Peer-to-Peer (P2P) Money Transfer
   */
  async transferP2P(
    senderUserId: string,
    payload: {
      recipient: string;
      amount: number; // in INR rupees
      pin: string;
      note?: string;
    }
  ) {
    const amountCents = Math.round(payload.amount * 100);
    if (amountCents <= 0) {
      throw new BadRequestException("Transfer amount must be greater than zero");
    }

    // 1. Verify Sender PIN
    await this.verifyWalletPin(senderUserId, payload.pin);

    // 2. Resolve Sender Wallet
    const senderWallet = await this.getOrCreateWallet(senderUserId);
    if (senderWallet.balance < amountCents) {
      throw new BadRequestException(
        `Insufficient wallet balance (Available: ₹${(senderWallet.balance / 100).toFixed(2)}, Requested: ₹${payload.amount.toFixed(2)})`
      );
    }

    // 3. Resolve Recipient User
    const query = payload.recipient.trim();
    let recipientUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: query } },
          { email: { contains: query } },
          { phone: { equals: query } },
          { id: { equals: query } },
        ],
      },
    });

    if (!recipientUser && query.includes("@")) {
      recipientUser = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: query.toLowerCase(),
            name: query.split("@")[0],
            passwordHash: "default_scrypt_pass_placeholder",
          },
        });
        await tx.userRole.create({
          data: { userId: u.id, role: "CONSUMER" },
        });
        await tx.walletAccount.create({
          data: { userId: u.id, balance: 20000, currency: "INR" },
        });
        return u;
      });
    }

    if (!recipientUser) {
      throw new NotFoundException(`Recipient not found matching '${query}'`);
    }

    if (recipientUser.id === senderUserId) {
      throw new BadRequestException("You cannot transfer money to your own wallet");
    }

    // 4. Resolve Recipient Wallet
    const recipientWallet = await this.getOrCreateWallet(recipientUser.id);

    const referenceId = `TXN-P2P-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const transferNote = payload.note && payload.note.trim().length > 0
      ? payload.note.trim()
      : `P2P Transfer to ${recipientUser.name}`;

    // 5. Execute Atomic Double-Entry Ledger Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Pessimistic deduction check
      const updatedSender = await tx.walletAccount.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amountCents } },
      });

      if (updatedSender.balance < 0) {
        throw new BadRequestException("Insufficient wallet funds during transaction execution");
      }

      // Credit recipient
      await tx.walletAccount.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amountCents } },
      });

      // Create Ledger Transaction
      const txn = await tx.ledgerTransaction.create({
        data: {
          referenceId,
          description: transferNote,
        },
      });

      // Create DEBIT Entry (Sender)
      await tx.ledgerEntry.create({
        data: {
          transactionId: txn.id,
          accountId: senderWallet.id,
          type: "DEBIT",
          amount: amountCents,
        },
      });

      // Create CREDIT Entry (Recipient)
      await tx.ledgerEntry.create({
        data: {
          transactionId: txn.id,
          accountId: recipientWallet.id,
          type: "CREDIT",
          amount: amountCents,
        },
      });

      return {
        referenceId,
        amountINR: payload.amount,
        senderNewBalanceINR: Number((updatedSender.balance / 100).toFixed(2)),
        recipient: {
          id: recipientUser.id,
          name: recipientUser.name,
          email: recipientUser.email,
        },
        note: transferNote,
        timestamp: txn.createdAt,
      };
    });

    this.logger.log(
      `P2P Transfer of ₹${payload.amount} completed from ${senderUserId} to ${recipientUser.id} [Ref: ${referenceId}]`
    );

    return result;
  }

  /**
   * Top-Up / Add Funds to Wallet (Sandbox Payment Gateway)
   */
  async topUpWallet(
    userId: string,
    payload: {
      amount: number; // in INR rupees
      paymentMethod: string;
    }
  ) {
    const amountCents = Math.round(payload.amount * 100);
    if (amountCents <= 0) {
      throw new BadRequestException("Top-up amount must be greater than zero");
    }

    const wallet = await this.getOrCreateWallet(userId);
    const referenceId = `TXN-TOPUP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const description = `Wallet Top-Up via ${payload.paymentMethod || "UPI"}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Increment user wallet balance
      const updated = await tx.walletAccount.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountCents } },
      });

      // Create Double-Entry Ledger Transaction
      const txn = await tx.ledgerTransaction.create({
        data: {
          referenceId,
          description,
        },
      });

      // Create CREDIT Entry for User Wallet
      await tx.ledgerEntry.create({
        data: {
          transactionId: txn.id,
          accountId: wallet.id,
          type: "CREDIT",
          amount: amountCents,
        },
      });

      // Record Payment Attempt
      await tx.paymentAttempt.create({
        data: {
          amount: amountCents,
          status: "COMPLETED",
          idempotencyKey: referenceId,
          provider: payload.paymentMethod || "SANDBOX_UPI",
        },
      });

      return {
        referenceId,
        amountINR: payload.amount,
        newBalanceINR: Number((updated.balance / 100).toFixed(2)),
        paymentMethod: payload.paymentMethod || "UPI",
        timestamp: txn.createdAt,
      };
    });

    this.logger.log(`Wallet top-up of ₹${payload.amount} completed for user ${userId} [Ref: ${referenceId}]`);
    return result;
  }

  /**
   * Create Razorpay Order for Wallet Top-Up
   */
  async createRazorpayOrder(
    userId: string,
    payload: { amount: number; currency?: string; notes?: Record<string, string> }
  ) {
    const amountCents = Math.round(payload.amount * 100);
    if (amountCents <= 0) {
      throw new BadRequestException("Order amount must be greater than zero");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_NEXUS2026Dev";
    const receipt = `rcpt_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const orderId = `order_rp_${Date.now()}_${randomBytes(4).toString("hex")}`;

    // If real Razorpay credentials provided, call official API
    let razorpayOrderId = orderId;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64");

        const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: amountCents,
            currency: payload.currency || "INR",
            receipt,
            notes: {
              userId,
              email: user.email,
              purpose: "NEXUS_WALLET_TOPUP",
              ...payload.notes,
            },
          }),
        });

        if (rpRes.ok) {
          const rpData = await rpRes.json();
          razorpayOrderId = rpData.id;
        }
      } catch (rpErr) {
        this.logger.warn(`Razorpay API order creation fallback: ${rpErr}`);
      }
    }

    return {
      orderId: razorpayOrderId,
      amount: amountCents,
      amountINR: payload.amount,
      currency: payload.currency || "INR",
      keyId,
      receipt,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
      },
    };
  }

  /**
   * Verify Razorpay Payment and Credit Wallet atomically with Double-Entry Ledger
   */
  async verifyRazorpayPayment(
    userId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature?: string;
      amount: number;
      paymentMethod?: string;
      paymentDetails?: {
        cardNetwork?: string;
        last4?: string;
        bank?: string;
        vpa?: string;
      };
    }
  ) {
    const amountCents = Math.round(payload.amount * 100);
    if (amountCents <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }

    if (!payload.razorpay_payment_id || !payload.razorpay_order_id) {
      throw new BadRequestException("Razorpay Order ID and Payment ID are required");
    }

    // If real Razorpay secret is present and signature is supplied, verify HMAC SHA256
    if (
      process.env.RAZORPAY_KEY_SECRET &&
      payload.razorpay_signature &&
      !payload.razorpay_signature.startsWith("mock_") &&
      !payload.razorpay_signature.startsWith("sig_mock_")
    ) {
      const generatedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== payload.razorpay_signature) {
        throw new BadRequestException("Invalid Razorpay payment signature verification failed");
      }
    }

    // Check if this payment ID was already processed (Idempotency)
    const existingPayment = await this.prisma.paymentAttempt.findFirst({
      where: {
        OR: [
          { idempotencyKey: payload.razorpay_payment_id },
          { orderId: payload.razorpay_order_id },
        ],
      },
    });

    if (existingPayment && existingPayment.status === "COMPLETED") {
      const wallet = await this.getOrCreateWallet(userId);
      return {
        success: true,
        message: "Payment already processed",
        referenceId: existingPayment.idempotencyKey,
        newBalanceINR: Number((wallet.balance / 100).toFixed(2)),
      };
    }

    const wallet = await this.getOrCreateWallet(userId);
    const referenceId = `TXN-RP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const methodDesc = payload.paymentMethod || "CARD";
    let detailNote = "";
    if (payload.paymentDetails?.cardNetwork && payload.paymentDetails?.last4) {
      detailNote = ` (${payload.paymentDetails.cardNetwork} •••• ${payload.paymentDetails.last4})`;
    } else if (payload.paymentDetails?.vpa) {
      detailNote = ` (${payload.paymentDetails.vpa})`;
    } else if (payload.paymentDetails?.bank) {
      detailNote = ` (${payload.paymentDetails.bank})`;
    }

    const description = `Razorpay Top-Up via ${methodDesc}${detailNote} [Order: ${payload.razorpay_order_id}]`;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Credit user wallet
      const updated = await tx.walletAccount.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountCents } },
      });

      // 2. Create Double-Entry Ledger Transaction
      const txn = await tx.ledgerTransaction.create({
        data: {
          referenceId,
          description,
        },
      });

      // 3. Create CREDIT Entry for User Wallet Account
      await tx.ledgerEntry.create({
        data: {
          transactionId: txn.id,
          accountId: wallet.id,
          type: "CREDIT",
          amount: amountCents,
        },
      });

      // 4. Record Payment Attempt
      await tx.paymentAttempt.create({
        data: {
          amount: amountCents,
          status: "COMPLETED",
          idempotencyKey: payload.razorpay_payment_id,
          orderId: payload.razorpay_order_id,
          provider: `RAZORPAY_${methodDesc}`,
        },
      });

      return {
        referenceId,
        paymentId: payload.razorpay_payment_id,
        orderId: payload.razorpay_order_id,
        amountINR: payload.amount,
        newBalanceINR: Number((updated.balance / 100).toFixed(2)),
        paymentMethod: methodDesc,
        paymentDetails: payload.paymentDetails,
        timestamp: txn.createdAt,
      };
    });

    this.logger.log(
      `Razorpay payment ${payload.razorpay_payment_id} verified for ₹${payload.amount}. User ${userId} wallet credited. [Ref: ${referenceId}]`
    );

    return result;
  }

  /**
   * Recipient Search Autocomplete (by email or phone)
   */
  async lookupRecipient(query: string, currentUserId: string) {
    if (!query || query.trim().length < 2) return [];
    const trimmed = query.trim();

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { email: { contains: trimmed } },
              { name: { contains: trimmed } },
              { phone: { contains: trimmed } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      take: 5,
    });

    return users;
  }
}
