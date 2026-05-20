import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../shared/database/database.module';
import { HashingModule } from '../shared/hashing/hashing.module';
import { AuthRepository } from './authentication/auth.repository';
import { AuthService } from './authentication/auth.service';
import { AuthController } from './authentication/auth.controller';
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
  providers: [AuthRepository, AuthService, AbilityFactory],
  controllers: [AuthController],
  exports: [AbilityFactory],
})
export class AuthModule {}
