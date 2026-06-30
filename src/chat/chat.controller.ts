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

 private getGuestId(
  req: any,
  body?: { guestId?: string },
): string | null {

  if (body?.guestId?.trim()) {
    return body.guestId.trim();
  }

  if (req?.user?.guestId) {
    return req.user.guestId;
  }

  if (req?.guestId) {
    return req.guestId;
  }

  const header = req?.headers?.['x-guest-id'];

  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }

  const query = req?.query?.guestId;

  if (typeof query === 'string' && query.trim()) {
    return query.trim();
  }

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
async getConversations(@Req() req:any){

   const userId = this.getUserId(req);
   const guestId = this.getGuestId(req);

   console.log("USER",userId);
   console.log("GUEST",guestId);

   return this.chatService.getConversations(
      userId,
      guestId
   );

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