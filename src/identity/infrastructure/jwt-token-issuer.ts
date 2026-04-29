import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenIssuer, TokenPayload } from '../domain/ports/token-issuer.port';

@Injectable()
export class JwtTokenIssuer implements ITokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  issue(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }
}
