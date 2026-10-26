export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export function getPasswordChecks(password) {
    const value = typeof password === 'string' ? password : ''
    return {
        length: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
        upper: /\p{Lu}/u.test(value),
        digit: /\d/.test(value),
        special: /[^\p{L}\p{N}\s]/u.test(value),
    }
}

export function isPasswordAcceptable(password) {
    return Object.values(getPasswordChecks(password)).every(Boolean)
}
