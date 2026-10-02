import { Test, TestingModule } from "@nestjs/testing";
import { WalletService } from "./wallet.service";
import { PrismaService } from "../prisma/prisma.service";
import { AppLogger } from "../logger/logger.service";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

describe("WalletService", () => {
  let service: WalletService;

  const mockUser1 = { id: "user-1", name: "Alice", email: "alice@nexus.com", phone: "+919888888888" };
  const mockUser2 = { id: "user-2", name: "Bob", email: "bob@nexus.com", phone: "+919777777777" };

  const mockPrisma: any = {
    walletAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerEntry: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    ledgerTransaction: {
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    paymentAttempt: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrisma)),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe("getWalletDetails", () => {
    it("should return formatted wallet info and transaction count", async () => {
      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: "w-1",
        userId: "user-1",
        balance: 50000,
        currency: "INR",
        pinHash: "hash.salt",
        updatedAt: new Date(),
        user: mockUser1,
      });
      mockPrisma.ledgerEntry.count.mockResolvedValue(12);

      const res = await service.getWalletDetails("user-1");
      expect(res.balanceINR).toBe(500.00);
      expect(res.hasPin).toBe(true);
      expect(res.totalTransactions).toBe(12);
    });
  });

  describe("setWalletPin & verifyWalletPin", () => {
    it("should reject non-4-digit PIN", async () => {
      await expect(service.setWalletPin("user-1", "123")).rejects.toThrow(BadRequestException);
      await expect(service.setWalletPin("user-1", "12345")).rejects.toThrow(BadRequestException);
      await expect(service.setWalletPin("user-1", "abcd")).rejects.toThrow(BadRequestException);
    });

    it("should set and verify a 4-digit PIN", async () => {
      let storedHash = "";
      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: "w-1",
        userId: "user-1",
        balance: 10000,
        pinHash: null,
      });
      mockPrisma.walletAccount.update.mockImplementation(({ data }: any) => {
        storedHash = data.pinHash;
        return { id: "w-1", pinHash: data.pinHash };
      });

      const setRes = await service.setWalletPin("user-1", "1234");
      expect(setRes.success).toBe(true);
      expect(storedHash).toBeTruthy();

      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: "w-1",
        userId: "user-1",
        pinHash: storedHash,
      });

      const valid = await service.verifyWalletPin("user-1", "1234");
      expect(valid).toBe(true);

      await expect(service.verifyWalletPin("user-1", "9999")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("transferP2P", () => {
    it("should throw if sender has insufficient balance", async () => {
      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: "w-1",
        userId: "user-1",
        balance: 1000, // ₹10
        pinHash: "sample",
      });
      jest.spyOn(service, "verifyWalletPin").mockResolvedValue(true);

      await expect(
        service.transferP2P("user-1", {
          recipient: "bob@nexus.com",
          amount: 50, // ₹50
          pin: "1234",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw if recipient is self", async () => {
      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: "w-1",
        userId: "user-1",
        balance: 50000,
        pinHash: "sample",
      });
      jest.spyOn(service, "verifyWalletPin").mockResolvedValue(true);
      mockPrisma.user.findFirst.mockResolvedValue(mockUser1); // Same user

      await expect(
        service.transferP2P("user-1", {
          recipient: "alice@nexus.com",
          amount: 100,
          pin: "1234",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should execute double-entry ledger debit & credit atomically", async () => {
      const senderWallet = { id: "w-1", userId: "user-1", balance: 50000, pinHash: "sample" };
      const recipientWallet = { id: "w-2", userId: "user-2", balance: 20000, pinHash: "sample" };

      mockPrisma.walletAccount.findUnique
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      jest.spyOn(service, "verifyWalletPin").mockResolvedValue(true);
      mockPrisma.user.findFirst.mockResolvedValue(mockUser2);

      mockPrisma.walletAccount.update
        .mockResolvedValueOnce({ ...senderWallet, balance: 40000 })
        .mockResolvedValueOnce({ ...recipientWallet, balance: 30000 });

      mockPrisma.ledgerTransaction.create.mockResolvedValue({
        id: "txn-1",
        referenceId: "TXN-P2P-123",
        createdAt: new Date(),
      });

      const result = await service.transferP2P("user-1", {
        recipient: "bob@nexus.com",
        amount: 100, // ₹100
        pin: "1234",
        note: "Dinner split",
      });

      expect(result.amountINR).toBe(100);
      expect(result.senderNewBalanceINR).toBe(400);
      expect(result.recipient.name).toBe("Bob");
      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledTimes(2); // 1 Debit, 1 Credit
    });
  });

  describe("topUpWallet", () => {
    it("should credit user wallet and record transaction", async () => {
      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: "w-1",
        userId: "user-1",
        balance: 10000,
      });

      mockPrisma.walletAccount.update.mockResolvedValue({
        id: "w-1",
        balance: 60000,
      });

      mockPrisma.ledgerTransaction.create.mockResolvedValue({
        id: "txn-topup-1",
        createdAt: new Date(),
      });

      const res = await service.topUpWallet("user-1", { amount: 500, paymentMethod: "UPI" });
      expect(res.amountINR).toBe(500);
      expect(res.newBalanceINR).toBe(600);
      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "CREDIT",
            amount: 50000,
          }),
        })
      );
    });
  });
});
