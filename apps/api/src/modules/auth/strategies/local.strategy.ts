import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { loginSchema } from '@vendedorpro/shared';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) throw new UnauthorizedException('Credenciais inválidas');
    return this.auth.login(result.data.email, result.data.password);
  }
}