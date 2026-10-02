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

interface SendMessageDto {
  content: string;
}

@Controller("api/v1/messaging")
export class MessagingController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(AuthGuard)
  @Get("conversations")
  async getMyConversations(@CurrentUser() user: { sub: string }) {
    // Return all conversations where the user is a member
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
    });

    const conversations = memberships.map((m) => {
      const conv = m.conversation;
      const otherMembers = conv.members.filter((mem) => mem.userId !== user.sub);
      const displayName =
        conv.name ||
        (otherMembers.length > 0 ? otherMembers[0].user.name : "Chat");
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        name: displayName,
        isGroup: conv.isGroup,
        lastMessage: lastMessage ? lastMessage.content : "No messages yet",
        lastMessageTime: lastMessage ? lastMessage.createdAt : conv.createdAt,
        otherMembers: otherMembers.map((om) => om.user),
      };
    });

    return { success: true, data: conversations };
  }

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
    });

    if (!isMember) {
      throw new NotFoundException("Conversation not found or access denied");
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { name: true },
    });

    const userMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: user.sub,
        senderName: sender?.name || "User",
        content: dto.content.trim(),
      },
    });

    // Check conversation context to generate smart simulated replies for showcase
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    let autoReply: string | null = null;
    let autoReplySender = "Assistant";

    if (conv?.name?.includes("AI Concierge")) {
      autoReplySender = "NEXUS AI Assistant";
      const q = dto.content.toLowerCase();
      if (q.includes("wallet") || q.includes("balance") || q.includes("money")) {
        autoReply = "You can manage your funds in the Wallet tab! Top-up via Razorpay or transfer funds to any registered NEXUS phone/email using your secure 4-digit PIN.";
      } else if (q.includes("order") || q.includes("track") || q.includes("food")) {
        autoReply = "You can track your live Food & Commerce orders in the Services & Shop tabs with real-time OTP delivery verification.";
      } else if (q.includes("ride") || q.includes("cab") || q.includes("driver")) {
        autoReply = "NEXUS Mobility offers Bikes, Autos, and Prime AC Sedans with upfront pricing and instant driver assignment.";
      } else {
        autoReply = `I understand you're asking about "${dto.content}". NEXUS super-app unified services are ready for your commands!`;
      }
    } else if (conv?.name?.includes("Charlie Driver")) {
      autoReplySender = "Charlie Driver";
      autoReply = "Got your message! I'm on my way to your location with the Hyundai i20. See you in a minute!";
    } else if (conv?.name?.includes("Bob Seller")) {
      autoReplySender = "Bob Seller";
      autoReply = "Thank you for reaching out! We ensure standard 2-hour priority packaging for all items.";
    }

    if (autoReply) {
      setTimeout(async () => {
        try {
          await this.prisma.chatMessage.create({
            data: {
              conversationId,
              senderId: "system-auto-reply",
              senderName: autoReplySender,
              content: autoReply,
            },
          });
        } catch (e) {
          // background simulated reply
        }
      }, 800);
    }

    return { success: true, data: userMsg };
  }
}
