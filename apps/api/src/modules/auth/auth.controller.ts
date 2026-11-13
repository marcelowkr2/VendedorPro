import { Body, Controller, Post, Request, UseGuards, Get, Patch, ServiceUnavailableException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  passwordChangeSchema,
  refreshTokenSchema,
  registerSchema,
} from '@vendedorpro/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: { email: string; password: string; name: string },
  ) {
    const user = await this.auth.register(body.email, body.password, body.name);
    return { id: user.id, email: user.email, name: user.name };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalGuard)
  async login(@Request() req: ExpressRequest) {
    return req.user as Awaited<ReturnType<AuthService['login']>>;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword() {
    throw new ServiceUnavailableException('Recuperação de senha temporariamente indisponível');
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword() {
    throw new ServiceUnavailableException('Recuperação de senha temporariamente indisponível');
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(passwordChangeSchema)) body: { currentPassword: string; newPassword: string },
  ) {
    await this.auth.changePassword(userId, body.currentPassword, body.newPassword);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return user;
  }
}