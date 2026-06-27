import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ChatModule, PrismaModule, AuthModule],
  providers: [PrismaService],
})
export class AppModule {}