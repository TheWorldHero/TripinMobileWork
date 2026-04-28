import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUserDto) {
    return this.prisma.user.upsert({
      where: { id: dto.id },
      create: dto,
      update: {
        username: dto.username,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
      },
    });
  }

  ensureExists(userId: string) {
    return this.ensureUserExists(userId);
  }

  private async ensureUserExists(userId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.user.create({
        data: {
          id: userId,
          displayName: userId === 'demo-user' ? 'Demo User' : userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          return user;
        }
      }

      throw error;
    }
  }
}
