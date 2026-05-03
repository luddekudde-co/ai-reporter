import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  createUser(email: string, passwordHash: string): Promise<User | null> {
    return this.prismaService.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  }

  findUserByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  deleteUserByEmail(email: string) {
    return this.prismaService.user.delete({ where: { email } });
  }
}
