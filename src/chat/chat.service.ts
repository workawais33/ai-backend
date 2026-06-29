import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // GET CONVERSATIONS (ONLY USERS)
  // =========================
  async getConversations(userId: number | null, guestId?: string | null) {
    if (!userId && !guestId) return [];

    const where = userId
      ? { userId }
      : { guestId };

    return this.prisma.conversation.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================
  // GET SINGLE CONVERSATION WITH MESSAGES
  // =========================
  async getConversationById(
    conversationId: number,
    userId: number | null,
    guestId?: string | null,
  ) {
    const where: any = { id: conversationId };

    if (userId) {
      where.userId = userId;
    } else if (guestId) {
      where.guestId = guestId;
    }

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
  // UPDATE CONVERSATION TITLE
  // =========================
  async updateConversationTitle(
    conversationId: number,
    title: string,
    userId: number | null,
    guestId?: string | null,
  ) {
    const where: any = { id: conversationId };

    if (userId) {
      where.userId = userId;
    } else if (guestId) {
      where.guestId = guestId;
    }

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

    if (userId) {
      where.userId = userId;
    } else if (guestId) {
      where.guestId = guestId;
    }

    return this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  // =========================
  // MAIN CHAT HANDLER
  // =========================
  async sendMessage(
    userId: number | null,
    message: string,
    conversationId: number | null,
    res: Response,
    guestId?: string | null,
  ) {
    try {
      let conversation: { id: number } | null = null;

      // =================================================
      // 🧠 CASE 1: GUEST USER → SAVE TO DB WITH guestId
      // =================================================
      if (conversationId) {
        const conversationWhere: any = {
          id: conversationId,
        };

        if (userId) {
          conversationWhere.userId = userId;
        } else if (guestId) {
          conversationWhere.guestId = guestId;
        }

        conversation = await this.prisma.conversation.findFirst({
          where: conversationWhere,
        });
      }

      // create new conversation if not found
      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            title: message.slice(0, 30),
            ...(userId ? { userId } : {}),
            ...(guestId ? { guestId } : {}),
          },
        });
      }

      // save user message
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          text: message,
        },
      });

      // call AI backend with conversation history
      const FASTAPI_URL = process.env.FASTAPI_URL;

      // Get all messages from this conversation to send as history
      const conversationMessages = await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
      });

      const response = await axios.post(
        `${FASTAPI_URL}/chat`,
        {
          message,
          conversationId: conversation.id,
          history: conversationMessages.map((msg) => ({
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
          console.error('Error saving bot message:', err);
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