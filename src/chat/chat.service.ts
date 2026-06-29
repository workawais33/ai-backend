import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // GET CONVERSATIONS
  // =========================
  async getConversations(userId: number) {
    return this.prisma.conversation.findMany({
      where: { userId },
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
  // MAIN CHAT HANDLER
  // =========================
  async sendMessage(
    userId: number | null,
    message: string,
    conversationId: number | null,
    res: Response,
  ) {
    try {
      let conversation;

      // =========================
      // 1. FIND EXISTING CONVERSATION
      // =========================
      if (conversationId) {
        conversation = await this.prisma.conversation.findFirst({
          where: {
            id: conversationId,
            userId: userId ?? undefined, // security check
          },
        });
      }

      // =========================
      // 2. CREATE IF NOT FOUND
      // =========================
      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            title: message.slice(0, 30),
            userId: userId ?? null,
          },
        });
      }

      // =========================
      // 3. SAVE USER MESSAGE
      // =========================
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          text: message,
        },
      });

      // =========================
      // 4. CALL FASTAPI STREAM
      // =========================
      const FASTAPI_URL = process.env.FASTAPI_URL;

      const response = await axios.post(
        `${FASTAPI_URL}/chat`,
        {
          message,
          conversationId: conversation.id,
        },
        { responseType: 'stream' },
      );

      res.setHeader('Content-Type', 'text/plain');

      let botReply = '';

      // =========================
      // 5. STREAM RESPONSE
      // =========================
      response.data.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        botReply += text;
        res.write(text);
      });

      // =========================
      // 6. SAVE BOT MESSAGE
      // =========================
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

      // =========================
      // 7. STREAM ERROR HANDLING
      // =========================
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