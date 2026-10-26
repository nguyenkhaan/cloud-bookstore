export const apiUrl = (path: string) => `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}${path}`

/** status 0 nghĩa là không kết nối được tới máy chủ. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function extractMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
    return payload.message
  }
  return ''
}

export async function postJson(path: string, body: unknown): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }

  const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined)
  if (!response.ok) throw new ApiError(response.status, extractMessage(payload))
  return payload
}
