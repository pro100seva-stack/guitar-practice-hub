export const requiredScopes = ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'] as const
export type ErrorKey = 'calendar.googleConfiguration' | 'calendar.googleConsent' | 'calendar.googleReconnect' | 'calendar.googlePermission' | 'calendar.googleUnavailable' | 'calendar.googleConflict' | 'calendar.googleInvalidPlan'
export class CalendarError extends Error {
  constructor(readonly key: ErrorKey, readonly status = 503) { super(key) }
}
export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
export function allowedOrigins(value: string) {
  const origins = new Set<string>()
  for (const candidate of value.split(',').map((item) => item.trim()).filter(Boolean)) {
    try {
      const url = new URL(candidate)
      const local = (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]') && !!url.port
      if (candidate !== url.origin || url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) throw new Error()
      origins.add(candidate)
    } catch { throw new CalendarError('calendar.googleConfiguration') }
  }
  return origins
}
export async function readBody(request: Request) {
  const limit = 262_144
  const length = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(length) && length > limit) throw new CalendarError('calendar.googleInvalidPlan', 413)
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json') || !request.body) throw new CalendarError('calendar.googleInvalidPlan', 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.byteLength
      if (size > limit) { await reader.cancel(); throw new CalendarError('calendar.googleInvalidPlan', 413) }
      chunks.push(result.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try {
    const body = object(JSON.parse(new TextDecoder().decode(bytes)))
    if (body) return body
  } catch { /* Do not return parser details or user data. */ }
  throw new CalendarError('calendar.googleInvalidPlan', 400)
}
function base64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)) }
function unbase64(value: string) { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)) }
export type TokenBundle = { refreshToken: string; accessToken: string; expiresAt: number; primaryCalendarId: string }
export async function encryptionKey(value: string) {
  try {
    const bytes = unbase64(value)
    if (bytes.length !== 32) throw new Error()
    return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
  } catch { throw new CalendarError('calendar.googleConfiguration') }
}
export async function encryptTokens(bundle: TokenBundle, uid: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const bytes = new TextEncoder().encode(JSON.stringify(bundle))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`calendar-google:v1:${uid}`) }, key, bytes)
  return `v1.${base64(iv)}.${base64(new Uint8Array(encrypted))}`
}
export async function decryptTokens(value: string, uid: string, key: CryptoKey): Promise<TokenBundle> {
  try {
    const [version, iv, encrypted, extra] = value.split('.')
    if (version !== 'v1' || extra || !iv || !encrypted) throw new Error()
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(iv), additionalData: new TextEncoder().encode(`calendar-google:v1:${uid}`) }, key, unbase64(encrypted))
    const bundle = object(JSON.parse(new TextDecoder().decode(decrypted)))
    if (!bundle || typeof bundle.refreshToken !== 'string' || !bundle.refreshToken || typeof bundle.accessToken !== 'string' || typeof bundle.expiresAt !== 'number' || !Number.isFinite(bundle.expiresAt) || typeof bundle.primaryCalendarId !== 'string') throw new Error()
    return bundle as TokenBundle
  } catch { throw new CalendarError('calendar.googleReconnect', 409) }
}
export async function stateHash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
export function randomState() { return base64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') }
