export const USER_CREDENTIALS_READER = Symbol('USER_CREDENTIALS_READER');

/** Credentials projection for sign-in — includes passwordHash; read-only. */
export type UserCredentialsRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: string;
};

export interface IUserCredentialsReader {
  findByEmailWithPassword(
    email: string,
  ): Promise<UserCredentialsRecord | null>;
}
