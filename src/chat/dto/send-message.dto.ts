import { IsOptional, IsString, IsNumber } from 'class-validator';

export class SendMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
}