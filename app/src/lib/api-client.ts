export type ApiFetchResult<T> =
  | {
      ok: true
      data: T
      response: Response
    }
  | {
      ok: false
      status: number | null
      message: string
      code?: string
      response?: Response
    }

type ApiErrorPayload = {
  message?: string
  code?: string
}

async function readJsonPayload(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return null
  }

  return (await response.json().catch(() => null)) as unknown
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string
): Promise<ApiFetchResult<T>> {
  let response: Response

  try {
    response = await fetch(input, init)
  } catch {
    return {
      ok: false,
      status: null,
      message: 'Network error. Check your connection and try again.'
    }
  }

  const payload = await readJsonPayload(response)

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null

    return {
      ok: false,
      status: response.status,
      message: errorPayload?.message ?? fallbackMessage,
      code: errorPayload?.code,
      response
    }
  }

  return {
    ok: true,
    data: payload as T,
    response
  }
}

