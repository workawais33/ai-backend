import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
  ) {
    const existingUser =
      await this.prisma.user.findUnique({
        where: { email },
      });

    if (existingUser) {
      throw new BadRequestException(
        'Email already exists',
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user =
      await this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  async login(
    email: string,
    password: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: { email },
      });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!validPassword) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const token =
      this.jwtService.sign({
        userId: user.id,
        email: user.email,
      });

    return {
      access_token: token,
    };
  }
}