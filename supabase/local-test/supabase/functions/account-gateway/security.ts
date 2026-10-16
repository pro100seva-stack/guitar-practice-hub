import { timingSafeEqual } from 'node:crypto'

export const maxBodyBytes = 16 * 1024

export class InvalidRequest extends Error {}

export async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const length = request.headers.get('content-length')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBodyBytes)) {
    throw new InvalidRequest()
  }
  if (!request.body) throw new InvalidRequest()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBodyBytes) {
        void reader.cancel().catch(() => {})
        throw new InvalidRequest()
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const payload: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new InvalidRequest()
    return payload as Record<string, unknown>
  } catch {
    throw new InvalidRequest()
  } finally {
    reader.releaseLock()
  }
}

export function normalizeAnswer(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashAnswer(pepper: string, loginName: string, answer: string) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
    `${pepper}:${loginName}:${normalizeAnswer(answer)}`,
  )))
}

export function equalDigest(actual: string, expected: unknown) {
  const valid = typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected)
  const candidate = valid ? expected : '0'.repeat(64)
  const matches = timingSafeEqual(new TextEncoder().encode(actual), new TextEncoder().encode(candidate))
  return matches && valid
}

export async function limiterLoginHash(key: string, loginName: string) {
  if (!key.trim()) throw new Error('Limiter unavailable')
  const secret = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return hex(await crypto.subtle.sign(
    'HMAC', secret, new TextEncoder().encode(`account-gateway:budget:v1:login\0${loginName}`),
  ))
}

export function parseBudget(data: unknown): { allowed: boolean; retryAfterSeconds: number } {
  if (!Array.isArray(data) || data.length !== 1) throw new Error('Limiter unavailable')
  const row = data[0]
  if (!row || typeof row !== 'object' || typeof row.allowed !== 'boolean'
    || !Number.isInteger(row.retry_after_seconds)
    || (row.allowed ? row.retry_after_seconds !== 0
      : row.retry_after_seconds < 1 || row.retry_after_seconds > 900)) {
    throw new Error('Limiter unavailable')
  }
  return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds }
}