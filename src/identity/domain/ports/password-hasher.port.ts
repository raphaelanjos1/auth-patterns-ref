export const PASSWORD_HASHER = Symbol('IPasswordHasher');

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
