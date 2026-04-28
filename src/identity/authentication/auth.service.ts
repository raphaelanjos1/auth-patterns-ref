import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { HashingService } from '../../shared/hashing/hashing.service';
import { AUDIT_EVENT, AuditEvent } from '../../audit-log/events/audit.event';
import { UserRepository } from '../user.repository';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signIn(dto: SignInDto) {
    const user = await this.userRepository.findByEmailWithPassword(dto.email);

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

    this.eventEmitter.emit(
      AUDIT_EVENT,
      new AuditEvent('AUTH_LOGIN', user.id, user.id, { email: user.email }),
    );

    return { accessToken };
  }
}
