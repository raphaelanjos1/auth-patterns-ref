import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../shared/database/database.module';
import { HashingModule } from '../shared/hashing/hashing.module';
import { UserRepository } from './user.repository';
import { AuthController } from './authentication/auth.controller';
import { AuthService } from './authentication/auth.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { AbilityFactory } from './authorization/ability-factory';

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
    UserRepository,
    AuthService,
    UserService,
    AbilityFactory,
  ],
  controllers: [AuthController, UserController],
  exports: [AbilityFactory],
})
export class IdentityModule {}
