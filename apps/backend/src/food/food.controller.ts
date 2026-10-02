import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

interface OrderFoodDto {
  restaurantId: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  paymentMethod: "WALLET" | "RAZORPAY" | "COD";
  deliveryAddress: string;
}

@Controller("api/v1/food")
export class FoodController {
  constructor(private prisma: PrismaService) {}

  @Get("restaurants")
  async getRestaurants() {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: { menus: { where: { isAvailable: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: restaurants };
  }

  @Get("restaurants/:id")
  async getRestaurant(@Param("id") id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { menus: true },
    });
    if (!restaurant) throw new NotFoundException("Restaurant not found");
    return { success: true, data: restaurant };
  }

  @UseGuards(AuthGuard)
  @Post("orders")
  async createFoodOrder(
    @CurrentUser() user: { sub: string },
    @Body() dto: OrderFoodDto
  ) {
    if (!dto.restaurantId || !dto.items || dto.items.length === 0) {
      throw new BadRequestException("Restaurant and items are required");
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant) throw new NotFoundException("Restaurant not found");

    const totalCents = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity * 100,
      0
    );

    // If paying via WALLET, verify balance and execute atomic debit
    if (dto.paymentMethod === "WALLET") {
      const wallet = await this.prisma.walletAccount.findUnique({
        where: { userId: user.sub },
      });
      if (!wallet || wallet.balance < totalCents) {
        throw new BadRequestException(
          `Insufficient wallet balance. Required: ₹${(totalCents / 100).toFixed(2)}, Available: ₹${((wallet?.balance ?? 0) / 100).toFixed(2)}`
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.walletAccount.update({
          where: { userId: user.sub },
          data: { balance: { decrement: totalCents } },
        });

        const ledgerTx = await tx.ledgerTransaction.create({
          data: {
            referenceId: `food_order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            description: `Food Delivery: ${restaurant.name}`,
          },
        });

        await tx.ledgerEntry.createMany({
          data: [
            {
              transactionId: ledgerTx.id,
              accountId: wallet.id,
              type: "DEBIT",
              amount: totalCents,
            },
          ],
        });
      });
    }

    // 4-digit delivery verification OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const order = await this.prisma.foodOrder.create({
      data: {
        customerId: user.sub,
        restaurantId: restaurant.id,
        status: "PREPARING",
        otpCode,
        totalAmount: totalCents,
        items: JSON.stringify({
          restaurantName: restaurant.name,
          items: dto.items,
          deliveryAddress: dto.deliveryAddress || "Home - 42, Tech Park Residency",
          paymentMethod: dto.paymentMethod,
        }),
      },
    });

    return {
      success: true,
      message: "Food order placed successfully!",
      data: order,
    };
  }

  @UseGuards(AuthGuard)
  @Get("orders")
  async getMyFoodOrders(@CurrentUser() user: { sub: string }) {
    const orders = await this.prisma.foodOrder.findMany({
      where: { customerId: user.sub },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: orders };
  }

  @UseGuards(AuthGuard)
  @Post("orders/:id/advance-status")
  async advanceFoodOrderStatus(
    @Param("id") id: string,
    @Body("targetStatus") targetStatus?: string
  ) {
    const order = await this.prisma.foodOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");

    let nextStatus = targetStatus;
    if (!nextStatus) {
      if (order.status === "PREPARING") nextStatus = "OUT_FOR_DELIVERY";
      else if (order.status === "OUT_FOR_DELIVERY") nextStatus = "DELIVERED";
      else nextStatus = order.status;
    }

    const updated = await this.prisma.foodOrder.update({
      where: { id },
      data: { status: nextStatus },
    });

    return { success: true, data: updated };
  }
}
