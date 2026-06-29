import { Body, Controller, Post, Get, Put, Delete, Res, Req, Param } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserId(req: any): number | null {
    const user = req.user;

    if (user?.id != null) return Number(user.id);
    if (user?.userId != null) return Number(user.userId);

    const authHeader = req.headers?.authorization;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const payload = this.jwtService.verify(token);
        return Number(payload.userId ?? payload.id ?? null);
      } catch {
        return null;
      }
    }

    return null;
  }

  private getGuestId(req: any, body?: SendMessageDto | { guestId?: string }): string | null {
    const fromBody = 'guestId' in body! ? body.guestId : undefined;
    if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();

    const fromReq = req?.user?.guestId ?? req?.guestId;
    if (typeof fromReq === 'string' && fromReq.trim()) return fromReq.trim();

    const headerValue = req?.headers?.['x-guest-id'];
    if (typeof headerValue === 'string' && headerValue.trim()) return headerValue.trim();

    const queryValue = req?.query?.guestId;
    if (typeof queryValue === 'string' && queryValue.trim()) return queryValue.trim();

    return null;
  }

  // =========================
  // SEND MESSAGE (LOGIN OPTIONAL)
  // =========================
  @Post('send')
  async sendMessage(
    @Body() body: SendMessageDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const guestId = this.getGuestId(req, body);

    await this.chatService.sendMessage(
      userId,
      body.message,
      body.conversationId ?? null,
      res,
      guestId,
    );
  }

  // =========================
  // CONVERSATIONS (LOGIN ONLY)
  // =========================
  @Get('conversations')
  async getConversations(@Req() req: any) {
    const userId = this.getUserId(req);
    const guestId = this.getGuestId(req);

    if (!userId && !guestId) return [];

    return this.chatService.getConversations(userId, guestId);
  }

  // =========================
  // GET SINGLE CONVERSATION WITH MESSAGES
  // =========================
  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const guestId = this.getGuestId(req);
    const conversationId = Number(id);

    if (!userId && !guestId) return null;

    return this.chatService.getConversationById(conversationId, userId, guestId);
  }

  // =========================
  // UPDATE CONVERSATION TITLE
  // =========================
  @Put('conversations/:id')
  async updateConversation(
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const guestId = this.getGuestId(req);
    const conversationId = Number(id);

    if (!userId && !guestId) return null;

    return this.chatService.updateConversationTitle(
      conversationId,
      body.title,
      userId,
      guestId,
    );
  }

  // =========================
  // DELETE CONVERSATION
  // =========================
  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const guestId = this.getGuestId(req);
    const conversationId = Number(id);

    if (!userId && !guestId) return null;

    return this.chatService.deleteConversation(
      conversationId,
      userId,
      guestId,
    );
  }
}