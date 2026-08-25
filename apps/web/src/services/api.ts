import { clearToken, getToken } from '@/services/tokenStorage'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (!raw || raw.trim() === '') {
    return 'http://localhost:3000/api'
  }
  return raw.replace(/\/$/, '')
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
    if (Array.isArray(message)) {
      return message.map(String).join(', ')
    }
  }
  return `Request failed with status ${status}`
}

type RequestOptions = {
  /** Skip the Authorization header — used by /auth/login and /setup/*. */
  anonymous?: boolean
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${resolveBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  // Read through the storage abstraction — no component touches localStorage.
  const token = options.anonymous ? null : getToken()

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Network request failed'
    throw new ApiError(message, 0, null)
  }

  const parsed = await parseBody(response)

  if (!response.ok) {
    // A rejected token is dead weight: drop it so the UI can react (via
    // onTokenChange) instead of retrying with a credential the server refuses.
    if (response.status === 401 && token) {
      clearToken()
    }

    throw new ApiError(
      extractErrorMessage(parsed, response.status),
      response.status,
      parsed,
    )
  }

  return parsed as T
}

export async function apiGet<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('POST', path, body ?? {}, options)
}

export async function apiDelete<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('DELETE', path, undefined, options)
}

export const apiClient = {
  get: apiGet,
  post: apiPost,
  delete: apiDelete,
}
