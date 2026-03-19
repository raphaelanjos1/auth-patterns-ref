import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../shared/database/database.module';
import { HashingModule } from '../shared/hashing/hashing.module';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

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
  providers: [AuthRepository, AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
