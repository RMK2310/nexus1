import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

import { MessagingGateway } from "./messaging.gateway";

interface SendMessageDto {
  content: string;
}

interface CreateConversationDto {
  recipientId?: string;
  recipientContact?: string;
  name?: string;
  initialMessage?: string;
}

interface ChatNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhone?: string;
  conversationId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

@Controller("api/v1/messaging")
export class MessagingController {
  private notifications: ChatNotification[] = [];

  constructor(
    private prisma: PrismaService,
    private messagingGateway: MessagingGateway
  ) {}

  /**
   * Helper to ensure standard platform entities exist as valid Users in DB
   */
  private async ensurePlatformUsers() {
    const platformEntities = [
      {
        id: "nexus-ai-concierge",
        name: "NEXUS AI Concierge",
        email: "concierge@nexus.ai",
        phone: "+91 99999 00000",
        passwordHash: "system-bot",
        role: "AI_ASSISTANT",
        tagline: "24/7 Super-App Intelligent Assistant",
      },
      {
        id: "driver-charlie",
        name: "Charlie Driver",
        email: "driver.charlie@nexus.mobility",
        phone: "+91 98765 11111",
        passwordHash: "system-driver",
        role: "DRIVER",
        tagline: "Mobility Partner • Prime Sedan (KA-03-EX-9988)",
      },
      {
        id: "seller-bob",
        name: "Bob Seller (Merchant)",
        email: "seller.bob@nexus.commerce",
        phone: "+91 98765 22222",
        passwordHash: "system-seller",
        role: "SELLER",
        tagline: "Apex Electronics & Fashion Store",
      },
      {
        id: "courier-ramesh",
        name: "Ramesh Kumar (Courier)",
        email: "courier.ramesh@nexus.food",
        phone: "+91 98765 33333",
        passwordHash: "system-courier",
        role: "COURIER",
        tagline: "Food Delivery Partner • Fleet #12",
      },
    ];

    for (const entity of platformEntities) {
      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [{ id: entity.id }, { email: entity.email }, { phone: entity.phone }],
        },
      });

      if (!existing) {
        try {
          await this.prisma.user.create({
            data: {
              id: entity.id,
              name: entity.name,
              email: entity.email,
              phone: entity.phone,
              passwordHash: entity.passwordHash,
            },
          });
        } catch (e) {
          // Ignore if concurrently created
        }
      }
    }
  }

  /**
   * Phone Lookup: Check if a phone number is registered on NEXUS
   */
  @UseGuards(AuthGuard)
  @Get("lookup-phone")
  async lookupPhone(@Query("phone") phone: string) {
    await this.ensurePlatformUsers();

    if (!phone || !phone.trim()) {
      return { success: false, message: "Please provide a phone number to search" };
    }

    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.length < 5) {
      return { success: false, message: "Phone number too short" };
    }

    const last10 = clean.slice(-10);

    const allUsers = await this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    const match = allUsers.find((u) => {
      if (!u.phone) return false;
      const uClean = u.phone.replace(/[^0-9]/g, "");
      return uClean.endsWith(last10) || last10.endsWith(uClean);
    });

    if (match) {
      let role = "USER";
      let tagline = "NEXUS Member";
      if (match.id === "nexus-ai-concierge") {
        role = "AI_ASSISTANT";
        tagline = "24/7 Super-App Assistant";
      } else if (match.id === "driver-charlie") {
        role = "DRIVER";
        tagline = "Mobility Partner (KA-03-EX-9988)";
      } else if (match.id === "seller-bob") {
        role = "SELLER";
        tagline = "Apex Electronics & Fashion";
      } else if (match.id === "courier-ramesh") {
        role = "COURIER";
        tagline = "Food Delivery Fleet Partner";
      }

      return {
        success: true,
        exists: true,
        user: {
          id: match.id,
          name: match.name,
          phone: match.phone,
          email: match.email,
          role,
          tagline,
        },
      };
    }

    return {
      success: true,
      exists: false,
      message: `No user found on NEXUS with number ${phone}. They must install NEXUS to receive messages.`,
    };
  }

  /**
   * Direct Messaging by Phone Number
   */
  @UseGuards(AuthGuard)
  @Post("send-to-phone")
  async sendToPhone(
    @CurrentUser() user: { sub: string },
    @Body() dto: { phone: string; content: string }
  ) {
    await this.ensurePlatformUsers();

    if (!dto.phone || !dto.phone.trim()) {
      throw new BadRequestException("Phone number is required");
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException("Message content cannot be empty");
    }

    const clean = dto.phone.replace(/[^0-9]/g, "");
    const last10 = clean.slice(-10);

    const allUsers = await this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, email: true, phone: true },
    });

    const targetUser = allUsers.find((u) => {
      if (!u.phone) return false;
      const uClean = u.phone.replace(/[^0-9]/g, "");
      return uClean.endsWith(last10) || last10.endsWith(uClean);
    });

    if (!targetUser) {
      return {
        success: false,
        notRegistered: true,
        message: `This phone number (${dto.phone}) is not registered on NEXUS yet. You can only message users who have the NEXUS app installed.`,
      };
    }

    if (targetUser.id === user.sub) {
      throw new BadRequestException("You cannot send a message to your own phone number");
    }

    // Call startConversation logic
    const convResult = await this.startConversation(user, {
      recipientId: targetUser.id,
      name: targetUser.name,
      initialMessage: dto.content.trim(),
    });

    const sender = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { name: true, phone: true },
    });

    // Record real-time notification for recipient
    this.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      recipientId: targetUser.id,
      senderId: user.sub,
      senderName: sender?.name || "NEXUS User",
      senderPhone: sender?.phone || "NEXUS User",
      conversationId: convResult.data.id,
      content: dto.content.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    });

    return {
      success: true,
      data: {
        conversationId: convResult.data.id,
        recipient: targetUser,
        message: dto.content.trim(),
      },
    };
  }

  /**
   * Real-time Notifications: Get incoming messages and unread counts for current user
   */
  @UseGuards(AuthGuard)
  @Get("notifications")
  async getNotifications(@CurrentUser() user: { sub: string }) {
    // 1. Get in-memory unread notifications for this user
    const pending = this.notifications.filter(
      (n) => n.recipientId === user.sub && !n.read
    );

    // 2. Also check recent messages from last 15 minutes
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId: user.sub },
      include: {
        conversation: {
          include: {
            messages: {
              where: {
                senderId: { not: user.sub },
                createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    const dbRecentNotifs: ChatNotification[] = [];
    for (const m of memberships) {
      for (const msg of m.conversation.messages) {
        if (!pending.some((p) => p.content === msg.content && p.conversationId === m.conversationId)) {
          dbRecentNotifs.push({
            id: `msg-${msg.id}`,
            recipientId: user.sub,
            senderId: msg.senderId,
            senderName: msg.senderName,
            conversationId: m.conversationId,
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
            read: false,
          });
        }
      }
    }

    const allNotifs = [...pending, ...dbRecentNotifs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      success: true,
      unreadCount: allNotifs.length,
      data: allNotifs.slice(0, 8),
    };
  }

  /**
   * Acknowledge / Clear Notifications for a conversation
   */
  @UseGuards(AuthGuard)
  @Post("notifications/ack")
  async ackNotifications(
    @CurrentUser() user: { sub: string },
    @Body() dto: { conversationId?: string }
  ) {
    this.notifications = this.notifications.map((n) => {
      if (
        n.recipientId === user.sub &&
        (!dto.conversationId || n.conversationId === dto.conversationId)
      ) {
        return { ...n, read: true };
      }
      return n;
    });

    return { success: true };
  }

  /**
   * Get searchable directory of contacts to initiate real chats with
   */
  @UseGuards(AuthGuard)
  @Get("contacts")
  async getContacts(
    @CurrentUser() user: { sub: string },
    @Query("q") query?: string
  ) {
    await this.ensurePlatformUsers();

    const cleanQuery = (query || "").trim().toLowerCase();

    const allUsers = await this.prisma.user.findMany({
      where: {
        id: { not: user.sub },
        ...(cleanQuery
          ? {
              OR: [
                { name: { contains: cleanQuery } },
                { email: { contains: cleanQuery } },
                { phone: { contains: cleanQuery } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      take: 20,
    });

    const contacts = allUsers.map((u) => {
      let role = "USER";
      let tagline = "NEXUS Member";
      let isSystem = false;

      if (u.id === "nexus-ai-concierge" || u.email.includes("concierge")) {
        role = "AI_ASSISTANT";
        tagline = "24/7 Super-App Assistant";
        isSystem = true;
      } else if (u.id === "driver-charlie" || u.email.includes("driver")) {
        role = "DRIVER";
        tagline = "Mobility Partner (KA-03-EX-9988)";
        isSystem = true;
      } else if (u.id === "seller-bob" || u.email.includes("seller")) {
        role = "SELLER";
        tagline = "Apex Electronics & Fashion";
        isSystem = true;
      } else if (u.id === "courier-ramesh" || u.email.includes("courier")) {
        role = "COURIER";
        tagline = "Food Delivery Fleet #12";
        isSystem = true;
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role,
        tagline,
        isSystem,
      };
    });

    if (!cleanQuery) {
      contacts.sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0));
    }

    return { success: true, data: contacts };
  }

  /**
   * List all real conversations for current user
   */
  @UseGuards(AuthGuard)
  @Get("conversations")
  async getMyConversations(@CurrentUser() user: { sub: string }) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId: user.sub },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const conversations = memberships.map((m) => {
      const conv = m.conversation;
      const otherMembers = conv.members.filter((mem) => mem.userId !== user.sub);
      const otherUser = otherMembers[0]?.user;
      const displayName =
        conv.name ||
        (otherUser ? otherUser.name : "Direct Chat");
      const lastMessage = conv.messages[0] || null;

      let role = "USER";
      if (otherUser) {
        if (otherUser.id === "nexus-ai-concierge" || otherUser.email.includes("concierge")) {
          role = "AI_ASSISTANT";
        } else if (otherUser.id === "driver-charlie" || otherUser.email.includes("driver")) {
          role = "DRIVER";
        } else if (otherUser.id === "seller-bob" || otherUser.email.includes("seller")) {
          role = "SELLER";
        } else if (otherUser.id === "courier-ramesh" || otherUser.email.includes("courier")) {
          role = "COURIER";
        }
      }

      return {
        id: conv.id,
        name: displayName,
        role,
        isGroup: conv.isGroup,
        lastMessage: lastMessage ? lastMessage.content : "No messages yet",
        lastMessageTime: lastMessage ? lastMessage.createdAt : conv.createdAt,
        otherMembers: otherMembers.map((om) => om.user),
      };
    });

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return { success: true, data: conversations };
  }

  /**
   * Start a new real conversation with any contact or user
   */
  @UseGuards(AuthGuard)
  @Post("conversations")
  async startConversation(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateConversationDto
  ) {
    await this.ensurePlatformUsers();

    let targetUserId = dto.recipientId;

    if (!targetUserId && dto.recipientContact) {
      const trimmed = dto.recipientContact.trim().toLowerCase();
      let foundUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: trimmed },
            { phone: dto.recipientContact.trim() },
            { name: { contains: trimmed } },
          ],
        },
      });

      if (!foundUser) {
        foundUser = await this.prisma.user.create({
          data: {
            name: dto.name || (trimmed.includes("@") ? trimmed.split("@")[0] : `User ${trimmed.slice(-4)}`),
            email: trimmed.includes("@") ? trimmed : `${trimmed}@nexus.user`,
            phone: /^[0-9+]+$/.test(dto.recipientContact.trim()) ? dto.recipientContact.trim() : null,
            passwordHash: "temp-chat-user",
          },
        });
      }
      targetUserId = foundUser.id;
    }

    if (!targetUserId) {
      throw new BadRequestException("Please specify a recipient to chat with");
    }

    if (targetUserId === user.sub) {
      throw new BadRequestException("You cannot start a conversation with yourself");
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException("Recipient user not found");
    }

    const userMemberships = await this.prisma.conversationMember.findMany({
      where: { userId: user.sub },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const existingMatch = userMemberships.find((m) =>
      !m.conversation.isGroup &&
      m.conversation.members.some((cm) => cm.userId === targetUserId)
    );

    let conversationRecord: any;

    if (existingMatch) {
      conversationRecord = existingMatch.conversation;
    } else {
      conversationRecord = await this.prisma.conversation.create({
        data: {
          name: targetUser.name,
          isGroup: false,
          members: {
            create: [
              { userId: user.sub, role: "OWNER" },
              { userId: targetUserId, role: "MEMBER" },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
    }

    if (dto.initialMessage && dto.initialMessage.trim()) {
      const sender = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { name: true, phone: true },
      });

      const initialText = dto.initialMessage.trim();

      const initialChatMsg = await this.prisma.chatMessage.create({
        data: {
          conversationId: conversationRecord.id,
          senderId: user.sub,
          senderName: sender?.name || "User",
          content: initialText,
        },
      });

      this.messagingGateway.broadcastNewMessage(conversationRecord.id, initialChatMsg);

      // Record notification for recipient
      this.notifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        recipientId: targetUser.id,
        senderId: user.sub,
        senderName: sender?.name || "User",
        senderPhone: sender?.phone || undefined,
        conversationId: conversationRecord.id,
        content: initialText,
        createdAt: new Date().toISOString(),
        read: false,
      });

      this.triggerCompanionReply(conversationRecord.id, targetUser, initialText, user.sub);
    }

    const otherMembers = conversationRecord.members.filter(
      (mem: any) => mem.userId !== user.sub
    );
    const lastMessage = conversationRecord.messages?.[0] || null;

    let role = "USER";
    if (targetUser.id === "nexus-ai-concierge" || targetUser.email.includes("concierge")) {
      role = "AI_ASSISTANT";
    } else if (targetUser.id === "driver-charlie" || targetUser.email.includes("driver")) {
      role = "DRIVER";
    } else if (targetUser.id === "seller-bob" || targetUser.email.includes("seller")) {
      role = "SELLER";
    } else if (targetUser.id === "courier-ramesh" || targetUser.email.includes("courier")) {
      role = "COURIER";
    }

    return {
      success: true,
      data: {
        id: conversationRecord.id,
        name: targetUser.name,
        role,
        isGroup: false,
        lastMessage: dto.initialMessage || (lastMessage ? lastMessage.content : "Chat started"),
        lastMessageTime: new Date().toISOString(),
        otherMembers: otherMembers.map((om: any) => om.user),
      },
    };
  }

  /**
   * Delete or leave a conversation
   */
  @UseGuards(AuthGuard)
  @Delete("conversations/:id")
  async deleteConversation(
    @Param("id") conversationId: string,
    @CurrentUser() user: { sub: string }
  ) {
    const isMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.sub },
      },
    });

    if (!isMember) {
      throw new NotFoundException("Conversation not found");
    }

    await this.prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId, userId: user.sub },
      },
    });

    const remaining = await this.prisma.conversationMember.count({
      where: { conversationId },
    });

    if (remaining === 0) {
      await this.prisma.chatMessage.deleteMany({ where: { conversationId } });
      await this.prisma.conversation.delete({ where: { id: conversationId } });
    }

    return { success: true, message: "Conversation deleted" };
  }

  /**
   * Fetch messages in a conversation
   */
  @UseGuards(AuthGuard)
  @Get("conversations/:id/messages")
  async getMessages(
    @Param("id") conversationId: string,
    @CurrentUser() user: { sub: string }
  ) {
    const isMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.sub },
      },
    });

    if (!isMember) {
      throw new NotFoundException("Conversation not found or access denied");
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: messages };
  }

  /**
   * Send a message to a conversation
   */
  @UseGuards(AuthGuard)
  @Post("conversations/:id/messages")
  async sendMessage(
    @Param("id") conversationId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: SendMessageDto
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException("Message content cannot be empty");
    }

    const isMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.sub },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!isMember) {
      throw new NotFoundException("Conversation not found or access denied");
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { name: true, phone: true },
    });

    const userMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: user.sub,
        senderName: sender?.name || "User",
        content: dto.content.trim(),
      },
    });

    // Broadcast new message via WebSocket to all clients in this conversation room
    this.messagingGateway.broadcastNewMessage(conversationId, userMsg);

    const otherMember = isMember.conversation.members.find(
      (m) => m.userId !== user.sub
    );

    if (otherMember) {
      // Record notification for recipient
      this.notifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        recipientId: otherMember.userId,
        senderId: user.sub,
        senderName: sender?.name || "User",
        senderPhone: sender?.phone || undefined,
        conversationId,
        content: dto.content.trim(),
        createdAt: new Date().toISOString(),
        read: false,
      });

      this.triggerCompanionReply(conversationId, otherMember.user, dto.content.trim(), user.sub);
    }

    return { success: true, data: userMsg };
  }

  /**
   * Helper to generate smart contextual companion replies
   */
  private triggerCompanionReply(
    conversationId: string,
    targetUser: { id: string; name: string; email: string; phone?: string | null },
    userContent: string,
    originUserId: string
  ) {
    const q = userContent.toLowerCase();
    let replyText: string | null = null;
    let senderName = targetUser.name;
    let senderId = targetUser.id;
    let senderPhone = targetUser.phone || undefined;

    if (targetUser.id === "nexus-ai-concierge" || targetUser.email.includes("concierge") || targetUser.name.includes("AI")) {
      senderName = "NEXUS AI Concierge";
      if (q.includes("wallet") || q.includes("balance") || q.includes("money") || q.includes("transfer") || q.includes("pin")) {
        replyText = "In your NEXUS Wallet, you can top-up instantly via Razorpay, transfer money to any phone/email, and verify with your secure 4-digit PIN.";
      } else if (q.includes("ride") || q.includes("cab") || q.includes("driver") || q.includes("fare") || q.includes("mobility")) {
        replyText = "NEXUS Mobility features real road navigation via OSRM, Highway/GQ quality prioritization, and a transparent base fare of ₹30 for the first 5 km + ₹10/km.";
      } else if (q.includes("food") || q.includes("order") || q.includes("delivery") || q.includes("restaurant") || q.includes("menu")) {
        replyText = "Explore 9 authentic restaurants in the Food Portal! All deliveries follow 100% paved road routes with real-time courier scooter tracking.";
      } else if (q.includes("phone") || q.includes("number") || q.includes("direct")) {
        replyText = "With NEXUS Direct Mobile Messaging, you can message anyone registered on NEXUS simply by entering their mobile number, and they will receive an instant notification!";
      } else if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
        replyText = "Hello! I am your 24/7 NEXUS AI Assistant. How can I help you across Mobility, Food, Shopping, or Wallet today?";
      } else {
        replyText = `Understood: "${userContent}". I'm actively monitoring your super-app ecosystem. Let me know if you need assistance with rides, orders, or wallet payments!`;
      }
    } else if (targetUser.id === "driver-charlie" || targetUser.email.includes("driver") || targetUser.name.includes("Driver")) {
      senderName = "Charlie Driver";
      if (q.includes("eta") || q.includes("where") || q.includes("reach") || q.includes("time") || q.includes("minutes")) {
        replyText = "I'm about 3-4 minutes away along the main avenue in the silver Hyundai i20. Heading straight to your pickup point!";
      } else if (q.includes("ac") || q.includes("air") || q.includes("cool")) {
        replyText = "Sure thing! AC is turned on at 22°C. See you shortly!";
      } else if (q.includes("gate") || q.includes("waiting") || q.includes("here") || q.includes("location")) {
        replyText = "Got it! I see the main gate landmark now, pulling up in 30 seconds.";
      } else {
        replyText = "Got your message! I'm on my way following the live road navigation. See you soon!";
      }
    } else if (targetUser.id === "seller-bob" || targetUser.email.includes("seller") || targetUser.name.includes("Seller")) {
      senderName = "Bob Seller (Merchant)";
      if (q.includes("stock") || q.includes("available") || q.includes("buy")) {
        replyText = "Yes, all catalog items are in stock at our Bengaluru fulfillment warehouse with same-day dispatch!";
      } else if (q.includes("dispatch") || q.includes("shipping") || q.includes("delivery")) {
        replyText = "Orders placed before 4 PM are packed in 2 hours and delivered via NEXUS Express courier.";
      } else {
        replyText = "Thanks for contacting Apex Store! How can we assist you with our products today?";
      }
    } else if (targetUser.id === "courier-ramesh" || targetUser.email.includes("courier") || targetUser.name.includes("Courier")) {
      senderName = "Ramesh Kumar (Courier)";
      if (q.includes("otp") || q.includes("code")) {
        replyText = "Please keep your 4-digit OTP handy; I'll enter it upon handing over your warm package.";
      } else if (q.includes("where") || q.includes("eta") || q.includes("reach")) {
        replyText = "Just picked up your hot food from the kitchen and following the paved road route to your address!";
      } else {
        replyText = "Hello! Your meal is safely secured in our thermal delivery box. On my way!";
      }
    }

    if (replyText) {
      // 1. Broadcast typing indicator via WebSocket immediately
      this.messagingGateway.broadcastTyping(conversationId, senderId, senderName);

      setTimeout(async () => {
        try {
          const companionMsg = await this.prisma.chatMessage.create({
            data: {
              conversationId,
              senderId,
              senderName,
              content: replyText,
            },
          });

          // 2. Broadcast stop typing and send new message via WebSocket
          this.messagingGateway.broadcastStopTyping(conversationId, senderId);
          this.messagingGateway.broadcastNewMessage(conversationId, companionMsg);

          // Also record notification for origin user so they see the reply popup!
          this.notifications.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            recipientId: originUserId,
            senderId,
            senderName,
            senderPhone,
            conversationId,
            content: replyText,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } catch (e) {
          // ignore background errors
        }
      }, 700);
    }
  }
}
