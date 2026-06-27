import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';

import type { Response } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  
  @Post()
  async chat(
    @Body() body: { message: string },
    @Res() res: Response,
  ) {

    await this.chatService.sendMessage(
      null,
      body.message,
      res,
    );
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Req() req,
    @Body() body: { message: string },
    @Res() res: Response,
  ) {
    const user = req.user as any;

    await this.chatService.sendMessage(
      user.userId,
      body.message,
      res,
    );
  }
}