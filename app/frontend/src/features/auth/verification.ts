const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

export function getVerificationToken(search: string): string | null {
  const token = new URLSearchParams(search).get('token')?.trim() ?? ''
  return TOKEN_PATTERN.test(token) ? token : null
}
