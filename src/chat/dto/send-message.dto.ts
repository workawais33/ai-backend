import { IsOptional, IsString, IsInt } from 'class-validator';

export class SendMessageDto {

  @IsString()
  message: string;

  @IsOptional()
  @IsInt()
  conversationId?: number;

  @IsOptional()
  @IsString()
  guestId?: string;

}