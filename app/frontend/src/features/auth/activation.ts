const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

function validToken(value: string | null): string | null {
  const token = value?.trim() ?? ''
  return TOKEN_PATTERN.test(token) ? token : null
}

export function extractActivationToken(value?: string): string | null {
  const input = value?.trim()
  if (!input) return null

  const rawToken = validToken(input)
  if (rawToken) return rawToken

  const query = input.startsWith('token=') ? input : new URL(input, 'http://localhost').search.slice(1)
  return validToken(new URLSearchParams(query).get('token'))
}
