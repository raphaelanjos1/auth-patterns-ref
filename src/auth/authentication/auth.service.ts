import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { HashingService } from '../../shared/hashing/hashing.service';
import { publishAudit } from '../../audit-log/events/publish-audit';
import {
  USER_CREDENTIALS_READER,
  type IUserCredentialsReader,
} from '../../user/domain/ports/user-credentials-reader.port';
import { SignInDto } from './sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_CREDENTIALS_READER)
    private readonly credentialsReader: IUserCredentialsReader,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signIn(dto: SignInDto) {
    const user = await this.credentialsReader.findByEmailWithPassword(
      dto.email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.hashingService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    publishAudit(this.eventEmitter, {
      action: 'AUTH_LOGIN',
      entityId: user.id,
      userId: user.id,
      metadata: { email: user.email },
    });

    return { accessToken };
  }
}
