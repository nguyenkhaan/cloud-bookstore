export const PASSWORD_MAX_LENGTH = 128
const PASSWORD_MIN_LENGTH = 12

export type PasswordChecks = {
  length: boolean
  upper: boolean
  digit: boolean
  special: boolean
}

export function getPasswordChecks(password: unknown): PasswordChecks {
  if (typeof password !== 'string') {
    return { length: false, upper: false, digit: false, special: false }
  }

  return {
    length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function isPasswordAcceptable(password: unknown): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean)
}
