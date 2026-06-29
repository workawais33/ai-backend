import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('axios');

describe('ChatService', () => {
  let service: ChatService;
  let prisma: {
    conversation: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
    };
    message: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      conversation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.mocked(axios.post).mockResolvedValue({
      data: {
        on: jest.fn((event: string, handler: Function) => {
          if (event === 'end') handler();
          return undefined;
        }),
      },
    } as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save a guest chat into the database with guestId', async () => {
    prisma.conversation.create.mockResolvedValue({ id: 77 });

    const res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      headersSent: false,
    } as any;

    await service.sendMessage(null, 'hello guest', null, res, 'guest-123');

    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        title: 'hello guest',
        guestId: 'guest-123',
      },
    });
  });
});
