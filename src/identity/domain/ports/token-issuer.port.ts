export const TOKEN_ISSUER = Symbol('ITokenIssuer');

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface ITokenIssuer {
  issue(payload: TokenPayload): Promise<string>;
}
