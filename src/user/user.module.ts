import { Module } from '@nestjs/common';
import { DatabaseModule } from '../shared/database/database.module';
import { HashingModule } from '../shared/hashing/hashing.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [DatabaseModule, HashingModule],
  providers: [UserRepository, UserService],
  controllers: [UserController],
})
export class UserModule {}
