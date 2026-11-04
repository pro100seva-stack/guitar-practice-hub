export const defaultInternalAuthDomain = 'accounts.guitar-practice-hub.invalid'

export function normalizeAccountIdentifier(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

// AccountIdentifier-v1 deliberately supports a bounded, unquoted ASCII email subset.
// Supabase Auth is still the final authority on whether an email can be created.
export function isValidAccountIdentifier(value: string, internalAuthDomain = defaultInternalAuthDomain): boolean {
  const identifier = normalizeAccountIdentifier(value)
  if (!identifier.includes('@')) return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(identifier)
  if (identifier.length > 254) return false
  const parts = identifier.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (!local || local.length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
    || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  const labels = domain.split('.')
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return false
  return domain !== defaultInternalAuthDomain && domain !== normalizeAccountIdentifier(internalAuthDomain)
}

export function authEmailForIdentifier(normalizedIdentifier: string, internalAuthDomain = defaultInternalAuthDomain): string {
  return normalizedIdentifier.includes('@') ? normalizedIdentifier : `${normalizedIdentifier}@${internalAuthDomain}`
}
