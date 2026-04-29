import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../shared/database/database.module';
import { HashingModule } from '../shared/hashing/hashing.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AbilityFactory } from './authorization/ability-factory';
import { USER_REPOSITORY } from './domain/ports/user.repository.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { TOKEN_ISSUER } from './domain/ports/token-issuer.port';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtTokenIssuer } from './infrastructure/jwt-token-issuer';

@Module({
  imports: [
    DatabaseModule,
    HashingModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '5m' },
    }),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    AuthService,
    UserService,
    AbilityFactory,
  ],
  controllers: [AuthController, UserController],
  exports: [AbilityFactory],
})
export class IdentityModule {}
