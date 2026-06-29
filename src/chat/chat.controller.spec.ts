import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: { sendMessage: jest.Mock };
  let jwtService: { verify: jest.Mock };

  beforeEach(async () => {
    chatService = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: chatService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should use the authenticated user id from a bearer token', async () => {
    jwtService.verify.mockReturnValue({ userId: 42 });

    const res = {} as any;

    await controller.sendMessage(
      { message: 'hello' },
      res,
      { headers: { authorization: 'Bearer test-token' } },
    );

    expect(chatService.sendMessage).toHaveBeenCalledWith(42, 'hello', null, res);
  });
});
