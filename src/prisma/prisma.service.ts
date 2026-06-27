import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  async onModuleInit() {
     console.log("DATABASE_URL =", process.env.DATABASE_URL);
    await this.$connect();
  }
}