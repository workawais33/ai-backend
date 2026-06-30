import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly GUEST_LIMIT = 5;

  constructor(private prisma: PrismaService) {}

  // =========================
  // GET CONVERSATIONS
  // =========================
  async getConversations(userId:number|null, guestId?:string|null){

   console.log(userId);
   console.log(guestId);

   const where = userId
      ? { userId }
      : { guestId };

   return this.prisma.conversation.findMany({
      where,
      include:{
         messages:true
      }
   });

}

  // =========================
  // GET SINGLE CONVERSATION
  // =========================
  async getConversationById(
    conversationId: number,
    userId: number | null,
    guestId?: string | null,
  ) {
    const where: any = { id: conversationId };

    if (userId) where.userId = userId;
    else if (guestId) where.guestId = guestId;

    return this.prisma.conversation.findFirst({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // =========================
  // UPDATE TITLE
  // =========================
  async updateConversationTitle(
    conversationId: number,
    title: string,
    userId: number | null,
    guestId?: string | null,
  ) {
    const where: any = { id: conversationId };

    if (userId) where.userId = userId;
    else if (guestId) where.guestId = guestId;

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  

  // =========================
  // DELETE CONVERSATION
  // =========================
  async deleteConversation(
    conversationId: number,
    userId: number | null,
    guestId?: string | null,
  ) {
    const where: any = { id: conversationId };

    if (userId) where.userId = userId;
    else if (guestId) where.guestId = guestId;

    return this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }
 
async sendMessage(
  userId: number | null,
  message: string,
  conversationId: number | null,
  res: Response,
  guestId?: string | null,
) {
  try {
    // =========================
    // 🚫 GUEST LIMIT (FIXED)
    // =========================
    if (!userId && guestId) {
      const totalMessages = await this.prisma.message.count({
        where: {
          role: 'user',
          conversation: {
            guestId: guestId,
          },
        },
      });

      if (totalMessages >= this.GUEST_LIMIT) {
        return res.status(403).json({
          message: 'Free limit reached. Please login to continue.',
          limitReached: true,
        });
      }
    }

    // =========================
    // 🧠 GET OR CREATE CONVERSATION
    // =========================
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId ?? undefined,
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          title: message.slice(0, 30),
          ...(userId ? { userId } : {}),
          ...(guestId ? { guestId } : {}),
        },
      });
    }

    // =========================
    // 💾 SAVE USER MESSAGE
    // =========================
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        text: message,
      },
    });

    // =========================
    // 🤖 CALL FASTAPI
    // =========================
    const FASTAPI_URL = process.env.FASTAPI_URL;

    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const response = await axios.post(
      `${FASTAPI_URL}/chat`,
      {
        message,
        conversationId: conversation.id,
        history: history.map((msg) => ({
          role: msg.role,
          text: msg.text,
        })),
      },
      { responseType: 'stream' },
    );

    res.setHeader('Content-Type', 'text/plain');

    let botReply = '';

    response.data.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      botReply += text;
      res.write(text);
    });

    response.data.on('end', async () => {
      try {
        await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'bot',
            text: botReply,
          },
        });
      } catch (err) {
        console.error('Bot save error:', err);
      }

      res.end();
    });

    response.data.on('error', (err: any) => {
      console.error('Stream error:', err);

      if (!res.headersSent) {
        res.status(500).send('Stream error');
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error('ChatService error:', error);

    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    } else {
      res.end();
    }
  }
}
}