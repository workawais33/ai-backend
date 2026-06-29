import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}