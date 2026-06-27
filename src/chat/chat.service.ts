import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(userId: number, message: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title: message.slice(0, 30),
        },
      });
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        text: message,
      },
    });

    return conversation.id;
  }

  async sendMessage(userId: number | null, message: string, res: Response) {
    let conversationId: number | null = null;

    try {
      if (userId) {
        conversationId = await this.saveMessage(userId, message);
      }

      const FASTAPI_URL = process.env.FASTAPI_URL;

      const response = await axios.post(
        `${FASTAPI_URL}/chat`,
        { message },
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
          if (conversationId) {
            await this.prisma.message.create({
              data: {
                conversationId,
                role: 'bot',
                text: botReply,
              },
            });
          }
        } catch (err) {
          console.error('Error saving bot message:', err);
        }

        res.end();
      });

      response.data.on('error', (err: any) => {
        console.error('Stream error:', err);
        res.status(500).send('Stream error');
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