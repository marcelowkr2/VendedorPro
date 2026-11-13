import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { audit } from '../../audit';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: { id: string; name: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
  tenants: { id: string; slug: string; name: string; role: string }[];
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, name: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('E-mail já registrado');
    const hash = await bcrypt.hash(password, Number(this.config.get('SALT_ROUNDS') || 10));
    return this.prisma.$transaction(async (tx) => {
      let user: User;
      try {
        user = await tx.user.create({
          data: { email, passwordHash: hash, name, role: 'admin_empresa' },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
          && Array.isArray(error.meta?.target) && error.meta.target.includes('email')) {
          throw new ConflictException('E-mail já registrado');
        }
        throw error;
      }
      const tenant = await tx.tenant.create({
        data: { name: `Conta de ${name}`, slug: uuidv4() },
      });
      await tx.tenantUser.create({
        data: { userId: user.id, tenantId: tenant.id, role: 'admin_empresa' },
      });
      await audit(tx, 'USER_CREATE', tenant.id, user.id, null, {
        id: user.id, email: user.email, name: user.name, role: user.role,
      }, user.id);
      return user;
    });
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw new UnauthorizedException('Credenciais inválidas');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(' conta bloqueada. Tente novamente em 15 minutos.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.loginAttempts || 0) + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: attempts, lockedUntil: new Date(Date.now() + LOCKOUT_MS) },
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: attempts },
        });
      }
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    const tenants = await this.prisma.tenantUser.findMany({
      where: { userId: user.id, tenant: { active: true } },
      include: { tenant: true },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role, user.tokenVersion);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
      tenants: tenants.map((t) => ({
        id: t.tenantId,
        slug: t.tenant.slug,
        name: t.tenant.name,
        role: t.role,
      })),
    };
  }

  generateTokens(userId: string, email: string, role: string, tokenVersion: number): AuthTokens {
    const payload = { sub: userId, email, role, tokenVersion };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: (this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m') as any,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: (this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
    });
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; tokenVersion?: number };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active || (payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    return this.generateTokens(user.id, user.email, user.role, user.tokenVersion);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Senha atual incorreta');
    const hash = await bcrypt.hash(newPassword, Number(this.config.get('SALT_ROUNDS') || 10));
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  }

  async switchTenant(userId: string, tenantId: string): Promise<{ tenantId: string; role: string }> {
    const tu = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { tenant: true },
    });
    if (!tu || !tu.tenant.active) throw new UnauthorizedException('Tenant inválido');
    return { tenantId: tu.tenantId, role: tu.role };
  }
}