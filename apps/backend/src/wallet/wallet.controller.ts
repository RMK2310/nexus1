import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, UserPayload } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  WalletTransferInput,
  WalletTransferInputSchema,
  WalletTopUpInput,
  WalletTopUpInputSchema,
  WalletSetPinInput,
  WalletSetPinInputSchema,
  WalletVerifyPinInput,
  WalletVerifyPinInputSchema,
  RazorpayCreateOrderInput,
  RazorpayCreateOrderInputSchema,
  RazorpayVerifyPaymentInput,
  RazorpayVerifyPaymentInputSchema,
} from "@nexus/shared";

@Controller("api/v1/wallet")
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * Get Current User Wallet Balance, Currency, and PIN status
   */
  @Get()
  async getWallet(@CurrentUser() user: UserPayload) {
    const data = await this.walletService.getWalletDetails(user.userId);
    return { success: true, data };
  }

  /**
   * Get User Double-Entry Ledger Statements
   */
  @Get("transactions")
  async getTransactions(
    @CurrentUser() user: UserPayload,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
    @Query("category") category?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const data = await this.walletService.getTransactionHistory(user.userId, {
      limit: limitNum,
      type,
      category,
    });
    return { success: true, data };
  }

  /**
   * P2P Peer-to-Peer Funds Transfer
   */
  @Post("transfer")
  @UsePipes(new ZodValidationPipe(WalletTransferInputSchema))
  async transfer(
    @CurrentUser() user: UserPayload,
    @Body() body: WalletTransferInput
  ) {
    const data = await this.walletService.transferP2P(user.userId, body);
    return { success: true, data, message: `Successfully transferred ₹${body.amount} to ${data.recipient.name}` };
  }

  /**
   * Wallet Deposit / Top-Up (Sandbox Gateway)
   */
  @Post("topup")
  @UsePipes(new ZodValidationPipe(WalletTopUpInputSchema))
  async topUp(
    @CurrentUser() user: UserPayload,
    @Body() body: WalletTopUpInput
  ) {
    const data = await this.walletService.topUpWallet(user.userId, body);
    return { success: true, data, message: `Successfully added ₹${body.amount} to your wallet` };
  }

  /**
   * Create Razorpay Top-Up Order
   */
  @Post("razorpay/create-order")
  @UsePipes(new ZodValidationPipe(RazorpayCreateOrderInputSchema))
  async createRazorpayOrder(
    @CurrentUser() user: UserPayload,
    @Body() body: RazorpayCreateOrderInput
  ) {
    const data = await this.walletService.createRazorpayOrder(user.userId, body);
    return { success: true, data };
  }

  /**
   * Verify Razorpay Payment and Credit Wallet
   */
  @Post("razorpay/verify-payment")
  @UsePipes(new ZodValidationPipe(RazorpayVerifyPaymentInputSchema))
  async verifyRazorpayPayment(
    @CurrentUser() user: UserPayload,
    @Body() body: RazorpayVerifyPaymentInput
  ) {
    const data = await this.walletService.verifyRazorpayPayment(user.userId, body);
    return {
      success: true,
      data,
      message: `₹${body.amount.toFixed(2)} deposited successfully via Razorpay!`,
    };
  }

  /**
   * Configure or Update 4-Digit Security PIN
   */
  @Post("pin")
  @UsePipes(new ZodValidationPipe(WalletSetPinInputSchema))
  async setPin(
    @CurrentUser() user: UserPayload,
    @Body() body: WalletSetPinInput
  ) {
    const data = await this.walletService.setWalletPin(
      user.userId,
      body.pin,
      body.currentPin
    );
    return { success: true, data };
  }

  /**
   * Verify 4-Digit Security PIN
   */
  @Post("verify-pin")
  @UsePipes(new ZodValidationPipe(WalletVerifyPinInputSchema))
  async verifyPin(
    @CurrentUser() user: UserPayload,
    @Body() body: WalletVerifyPinInput
  ) {
    const isValid = await this.walletService.verifyWalletPin(user.userId, body.pin);
    return { success: true, data: { isValid } };
  }

  /**
   * Recipient Search Autocomplete
   */
  @Get("lookup")
  async lookup(
    @CurrentUser() user: UserPayload,
    @Query("q") query?: string
  ) {
    const data = await this.walletService.lookupRecipient(query || "", user.userId);
    return { success: true, data };
  }
}
