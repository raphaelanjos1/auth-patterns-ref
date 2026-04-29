export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidUserNameError extends Error {
  constructor() {
    super('Full name cannot be empty');
    this.name = 'InvalidUserNameError';
  }
}
