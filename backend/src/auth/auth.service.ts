import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async findOrCreateGoogleUser(params: {
    googleId: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  }): Promise<User> {
    const existing = await this.userService.findByGoogleId(params.googleId);
    if (existing) {
      return existing;
    }
    return this.userService.createGoogleUser(params);
  }

  issueJwt(user: User): { accessToken: string } {
    const accessToken = this.jwtService.sign({
      userId: user.id,
      email: user.email,
    });
    return { accessToken };
  }
}
