import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.active || (payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Token inválido');
    }

    const tenants = await this.prisma.tenantUser.findMany({
      where: { userId: user.id, tenant: { active: true } },
      include: { tenant: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenants: tenants.map((t) => ({
        id: t.tenantId,
        slug: t.tenant.slug,
        name: t.tenant.name,
        role: t.role,
      })),
    };
  }
}