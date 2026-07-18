import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginInput } from '@gwos/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { tenant: true },
    });

    if (!user || user.status === 'INACTIVE') {
      throw new UnauthorizedException('Invalid credentials or user is inactive');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Include workerId in token if the user is a worker, to make route validation simple
    let workerId: string | null = null;
    if (user.role === 'WORKER') {
      const worker = await this.prisma.worker.findUnique({
        where: { userId: user.id },
      });
      workerId = worker?.id || null;
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      workerId,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name || null,
        workerId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        status: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let workerId: string | null = null;
    if (user.role === 'WORKER') {
      const worker = await this.prisma.worker.findUnique({
        where: { userId: user.id },
      });
      workerId = worker?.id || null;
    }

    return {
      ...user,
      workerId,
    };
  }
}
