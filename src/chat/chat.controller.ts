import { randomUUID } from 'crypto';
import {
  Body,
  Controller,
  Post,
  Get,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // =========================
  // SINGLE CHAT ENDPOINT (CLEAN)
  // =========================
  @Post('send')
  async sendMessage(
    @Body() body: SendMessageDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    let guestId = req.cookies?.guestId;

    if (!guestId) {
      guestId = randomUUID();

      res.cookie('guestId', guestId, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    }

    const userId = req.user?.userId ?? null;

    return this.chatService.sendMessage(
      userId,
      body.message,
      body.conversationId ?? null,
      res,
    );
  }

  // =========================
  // CONVERSATIONS (FIXED AUTH)
  // =========================
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@Req() req: any) {
    const userId = req.user?.userId;

    return this.chatService.getConversations(userId);
  }
}