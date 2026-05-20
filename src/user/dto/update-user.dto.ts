import type { UserRole } from '@generated/prisma';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const USER_ROLES = ['ADMIN', 'USER', 'MANAGER'] as const satisfies readonly UserRole[];

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
