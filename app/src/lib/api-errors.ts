import { NextResponse } from 'next/server'

type ErrorCause = {
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

export type ApiErrorBody = {
  ok: false
  message: string
  code: string
}

export function logApiError(context: string, cause?: unknown) {
  if (!cause) {
    console.error(`[${context}]`, {
      message: 'No error object was provided.'
    })
    return
  }

  const error = cause as ErrorCause
  console.error(`[${context}]`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status
  })
}

export function apiError(
  message: string,
  status: number,
  options: {
    code?: string
    context?: string
    cause?: unknown
  } = {}
) {
  if (options.context || options.cause) {
    logApiError(options.context ?? options.code ?? 'api-error', options.cause)
  }

  return NextResponse.json<ApiErrorBody>(
    {
      ok: false,
      message,
      code: options.code ?? 'request_failed'
    },
    { status }
  )
}

export function unauthorizedApiError() {
  return apiError('Unauthorized.', 401, { code: 'unauthorized' })
}
