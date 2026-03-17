enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MANAGER = 'MANAGER',
}

export class CreateUserDto {
  fullName!: string;
  email!: string;
  password!: string;
  role!: UserRole;
}
