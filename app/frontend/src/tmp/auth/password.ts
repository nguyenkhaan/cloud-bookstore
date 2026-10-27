export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
}

export function getPasswordChecks(password: unknown): PasswordChecks {
  const value = typeof password === 'string' ? password : '';
  return {
    length: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    upper: /\p{Lu}/u.test(value),
    digit: /\d/.test(value),
    special: /[^\p{L}\p{N}\s]/u.test(value),
  };
}

export function isPasswordAcceptable(password: unknown): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}

