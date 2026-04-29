export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const v = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(v);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

export class InvalidEmailError extends Error {
  constructor(raw: string) {
    super(`Invalid email: ${raw}`);
    this.name = 'InvalidEmailError';
  }
}
