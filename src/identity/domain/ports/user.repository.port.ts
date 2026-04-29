import type { User } from '../user.entity';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface FindAllParams {
  skip: number;
  take: number;
  search?: string;
}

export interface FindAllResult {
  data: User[];
  total: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params: FindAllParams): Promise<FindAllResult>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
