import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger("MessagingGateway");

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to messaging socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from messaging socket: ${client.id}`);
  }

  @SubscribeMessage("join_conversation")
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId?: string }
  ) {
    if (data?.conversationId) {
      client.join(data.conversationId);
      this.logger.log(`Socket ${client.id} joined room ${data.conversationId}`);
    }
  }

  @SubscribeMessage("leave_conversation")
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (data?.conversationId) {
      client.leave(data.conversationId);
      this.logger.log(`Socket ${client.id} left room ${data.conversationId}`);
    }
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; senderId: string; senderName: string }
  ) {
    if (data?.conversationId) {
      client.to(data.conversationId).emit("user_typing", {
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderName: data.senderName,
      });
    }
  }

  @SubscribeMessage("stop_typing")
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; senderId: string }
  ) {
    if (data?.conversationId) {
      client.to(data.conversationId).emit("user_stop_typing", {
        conversationId: data.conversationId,
        senderId: data.senderId,
      });
    }
  }

  /**
   * Broadcast a new message to all clients currently in the conversation room
   */
  broadcastNewMessage(conversationId: string, message: any) {
    if (this.server) {
      this.server.to(conversationId).emit("new_message", message);
      this.logger.log(`Broadcasted new message to room ${conversationId}`);
    }
  }

  /**
   * Broadcast typing indicator from companion/system
   */
  broadcastTyping(conversationId: string, senderId: string, senderName: string) {
    if (this.server) {
      this.server.to(conversationId).emit("user_typing", {
        conversationId,
        senderId,
        senderName,
      });
    }
  }

  /**
   * Broadcast stop typing from companion/system
   */
  broadcastStopTyping(conversationId: string, senderId: string) {
    if (this.server) {
      this.server.to(conversationId).emit("user_stop_typing", {
        conversationId,
        senderId,
      });
    }
  }
}
