const JWT_PATTERN = /^[\w-]+\.[\w-]+\.[\w-]+$/;

export function extractActivationToken(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (JWT_PATTERN.test(value)) return value;

  try {
    const token = new URL(value).searchParams.get('token')?.trim();
    if (token && JWT_PATTERN.test(token)) return token;
  } catch {
  }

  const match = value.match(/(?:^|[?&])token=([^&#\s]+)/);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return JWT_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}

