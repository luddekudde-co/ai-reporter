import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { googleId } });
  }

  findUserByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  createGoogleUser(params: {
    googleId: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  }): Promise<User> {
    return this.prismaService.user.create({
      data: {
        googleId: params.googleId,
        email: params.email,
        name: params.name,
        avatarUrl: params.avatarUrl,
      },
    });
  }
}
