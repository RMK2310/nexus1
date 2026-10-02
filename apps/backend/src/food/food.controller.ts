import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Food Delivery Module — Phase 1 (read APIs).
 * Restaurant & menu browsing for the NEXUS mobile client.
 * Ordering endpoints arrive with the full Food Delivery phase.
 */
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
}
