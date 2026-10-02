import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Food, Mobility & Messaging records...");

  // 1. Get or ensure users exist
  const consumer = await prisma.user.findUnique({ where: { email: "consumer@nexus.com" } });
  const seller = await prisma.user.findUnique({ where: { email: "seller@nexus.com" } });
  const driver = await prisma.user.findUnique({ where: { email: "driver@nexus.com" } });
  let restaurantOwner = await prisma.user.findUnique({ where: { email: "restaurant@nexus.com" } });

  if (!consumer || !driver || !restaurantOwner) {
    console.log("Missing core users, ensure seed.ts ran first");
    return;
  }

  // 2. Seed Restaurants & Menus
  const restaurantsData = [
    {
      name: "The Curry Palace",
      cuisine: "North Indian & Mughlai",
      ownerId: restaurantOwner.id,
      menus: [
        { name: "Butter Chicken with Garlic Naan", price: 340, isAvailable: true },
        { name: "Paneer Tikka Masala Combo", price: 290, isAvailable: true },
        { name: "Hyderabadi Dum Biryani", price: 310, isAvailable: true },
        { name: "Gulab Jamun (2 pcs)", price: 90, isAvailable: true },
      ],
    },
    {
      name: "Pizza Roma Artisanal",
      cuisine: "Italian & Wood-Fired",
      ownerId: restaurantOwner.id,
      menus: [
        { name: "Classic Margherita Pizza", price: 380, isAvailable: true },
        { name: "Spicy Pepperoni & Jalapeño", price: 460, isAvailable: true },
        { name: "Creamy Truffle Penne Pasta", price: 390, isAvailable: true },
        { name: "Garlic Parmesan Dough Balls", price: 180, isAvailable: true },
      ],
    },
    {
      name: "Sushi Harbor & Asian Wok",
      cuisine: "Japanese & Pan-Asian",
      ownerId: restaurantOwner.id,
      menus: [
        { name: "Salmon & Avocado Roll (8 pcs)", price: 490, isAvailable: true },
        { name: "Chicken Teriyaki Bento Box", price: 420, isAvailable: true },
        { name: "Classic Pad Thai Noodles", price: 330, isAvailable: true },
        { name: "Crispy Vegetable Dim Sum", price: 260, isAvailable: true },
      ],
    },
    {
      name: "Burger Craft Co.",
      cuisine: "Gourmet Burgers & Shakes",
      ownerId: restaurantOwner.id,
      menus: [
        { name: "Signature Double Smash Burger", price: 310, isAvailable: true },
        { name: "Crispy Fried Chicken Burger", price: 280, isAvailable: true },
        { name: "Peri-Peri Seasoned Curly Fries", price: 150, isAvailable: true },
        { name: "Nutella Thick Shake", price: 190, isAvailable: true },
      ],
    },
  ];

  for (const rData of restaurantsData) {
    let existing = await prisma.restaurant.findFirst({ where: { name: rData.name } });
    if (!existing) {
      existing = await prisma.restaurant.create({
        data: {
          name: rData.name,
          cuisine: rData.cuisine,
          ownerId: rData.ownerId,
          isActive: true,
        },
      });
      console.log(`Created restaurant: ${existing.name}`);
    }

    for (const m of rData.menus) {
      const existingMenu = await prisma.menuItem.findFirst({
        where: { restaurantId: existing.id, name: m.name },
      });
      if (!existingMenu) {
        await prisma.menuItem.create({
          data: {
            restaurantId: existing.id,
            name: m.name,
            price: m.price,
            isAvailable: m.isAvailable,
          },
        });
      }
    }
  }

  // 3. Seed Driver Vehicles
  let vehicle = await prisma.vehicle.findUnique({ where: { driverId: driver.id } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        driverId: driver.id,
        make: "Hyundai",
        model: "i20 Active (AC Cab)",
        plateNumber: "KA-01-MJ-5678",
      },
    });
    console.log(`Created vehicle for Charlie Driver: ${vehicle.plateNumber}`);
  }

  // 4. Seed Initial Conversations & Messages for Alice Consumer
  let convSupport = await prisma.conversation.findFirst({ where: { name: "NEXUS AI Concierge" } });
  if (!convSupport) {
    convSupport = await prisma.conversation.create({
      data: {
        name: "NEXUS AI Concierge",
        isGroup: false,
        members: {
          create: [{ userId: consumer.id, role: "MEMBER" }],
        },
        messages: {
          create: [
            {
              senderId: "system-ai",
              senderName: "NEXUS AI Assistant",
              content: "Hello Alice! 👋 Welcome to NEXUS. How can I help you across Commerce, Rides, Food, or Wallet today?",
            },
          ],
        },
      },
    });
    console.log("Created AI Concierge conversation");
  }

  if (seller) {
    let convSeller = await prisma.conversation.findFirst({ where: { name: "Bob Seller (Tech Store)" } });
    if (!convSeller) {
      convSeller = await prisma.conversation.create({
        data: {
          name: "Bob Seller (Tech Store)",
          isGroup: false,
          members: {
            create: [
              { userId: consumer.id, role: "MEMBER" },
              { userId: seller.id, role: "MEMBER" },
            ],
          },
          messages: {
            create: [
              {
                senderId: seller.id,
                senderName: "Bob Seller",
                content: "Hi Alice, your recent order has been packed and handed over to courier delivery!",
              },
            ],
          },
        },
      });
      console.log("Created Seller conversation");
    }
  }

  let convDriver = await prisma.conversation.findFirst({ where: { name: "Charlie Driver (Mobility)" } });
  if (!convDriver) {
    convDriver = await prisma.conversation.create({
      data: {
        name: "Charlie Driver (Mobility)",
        isGroup: false,
        members: {
          create: [
            { userId: consumer.id, role: "MEMBER" },
            { userId: driver.id, role: "MEMBER" },
          ],
        },
        messages: {
          create: [
            {
              senderId: driver.id,
              senderName: "Charlie Driver",
              content: "I am available nearby Indiranagar / MG Road with my Hyundai i20. Ready whenever you book!",
            },
          ],
        },
      },
    });
    console.log("Created Driver conversation");
  }

  console.log("✅ Super-app phases seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
