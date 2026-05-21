import type { UserRole } from '@generated/prisma';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

const USER_ROLES = ['ADMIN', 'USER', 'MANAGER'] as const satisfies readonly UserRole[];

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsIn(USER_ROLES)
  role!: UserRole;
}
