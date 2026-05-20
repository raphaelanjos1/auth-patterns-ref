import type { UserRole } from '@generated/prisma';

export class UpdateUserDto {
  fullName?: string;
  role?: UserRole;
}
