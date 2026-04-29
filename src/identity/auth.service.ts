import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT, AuditEvent } from '../audit-log/events/audit.event';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from './domain/ports/user.repository.port';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from './domain/ports/password-hasher.port';
import {
  TOKEN_ISSUER,
  type ITokenIssuer,
} from './domain/ports/token-issuer.port';
import { InvalidCredentialsError } from './domain/errors';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: ITokenIssuer,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signIn(dto: SignInDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    try {
      await user.authenticate(dto.password, this.hasher);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw err;
    }

    const accessToken = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    for (const event of user.pullEvents()) {
      this.eventEmitter.emit(
        AUDIT_EVENT,
        new AuditEvent(
          event.action,
          event.entityId,
          event.performedBy,
          event.metadata,
        ),
      );
    }

    return { accessToken };
  }
}
