import type { UserRole } from '@generated/prisma';

export class CreateUserDto {
  fullName!: string;
  email!: string;
  password!: string;
  role!: UserRole;
}
