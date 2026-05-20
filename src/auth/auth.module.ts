import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../shared/database/database.module';
import { HashingModule } from '../shared/hashing/hashing.module';
import { USER_CREDENTIALS_READER } from '../user/domain/ports/user-credentials-reader.port';
import { AuthRepository } from './authentication/auth.repository';
import { AuthService } from './authentication/auth.service';
import { AuthController } from './authentication/auth.controller';
import { AbilityFactory } from './authorization/ability-factory';
import { AbilityPermissionChecker } from './authorization/ability-permission-checker';

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
    { provide: USER_CREDENTIALS_READER, useClass: AuthRepository },
    AuthService,
    AbilityFactory,
    AbilityPermissionChecker,
  ],
  controllers: [AuthController],
  exports: [AbilityFactory, AbilityPermissionChecker],
})
export class AuthModule {}
