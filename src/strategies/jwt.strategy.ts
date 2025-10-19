import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = { sub: string; role?: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(cfg: ConfigService) {
    // Ensure the secret is definitely a string (not undefined)
    const secret = cfg.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false, // optional (default false)
      // algorithms: ['HS256'], // optionally be explicit
    };

    super(opts);
  }
  async validate(payload: JwtPayload) {
    return payload; // becomes req.user
  }
}

