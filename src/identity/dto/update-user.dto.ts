import { UserRole } from './create-user.dto';

export class UpdateUserDto {
  fullName?: string;
  role?: UserRole;
}
