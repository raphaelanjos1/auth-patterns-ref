import type { Prisma } from '@generated/prisma';

export const USER_DIRECTORY = Symbol('USER_DIRECTORY');

/** Public user projection — password hash omitted at persistence boundary. */
export type UserDirectoryRecord = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export interface IUserDirectory {
  findById(id: string): Promise<UserDirectoryRecord | null>;

  findByEmail(email: string): Promise<UserDirectoryRecord | null>;

  findAll(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ data: UserDirectoryRecord[]; total: number }>;

  update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<UserDirectoryRecord>;

  create(data: Prisma.UserCreateInput): Promise<UserDirectoryRecord>;

  delete(id: string): Promise<UserDirectoryRecord>;
}
