import { createHmac, timingSafeEqual } from 'node:crypto'
import { isReceiptPayload, type ReceiptPayload } from '@/lib/receipt-print'

type ReceiptTokenEnvelope = {
  exp: number
  payload: ReceiptPayload
}

const receiptTokenLifetimeMs = 1000 * 60 * 10

function getReceiptSigningSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  return secret
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value: string) {
  return createHmac('sha256', getReceiptSigningSecret()).update(value).digest('base64url')
}

export function createReceiptToken(payload: ReceiptPayload) {
  const envelope: ReceiptTokenEnvelope = {
    exp: Date.now() + receiptTokenLifetimeMs,
    payload
  }
  const encodedEnvelope = toBase64Url(JSON.stringify(envelope))
  const signature = sign(encodedEnvelope)

  return `${encodedEnvelope}.${signature}`
}

export function verifyReceiptToken(token: string) {
  const [encodedEnvelope, providedSignature] = token.split('.')

  if (!encodedEnvelope || !providedSignature) {
    return null
  }

  const expectedSignature = sign(encodedEnvelope)
  const providedBuffer = Buffer.from(providedSignature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedEnvelope)) as ReceiptTokenEnvelope

    if (parsed.exp < Date.now() || !isReceiptPayload(parsed.payload)) {
      return null
    }

    return parsed.payload
  } catch {
    return null
  }
}
