const videoIdPattern = /^[A-Za-z0-9_-]{11}$/
const youTubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'])
const embedHosts = new Set(['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const maxStartSeconds = 60 * 60 * 24

function parseStartSeconds(value: string | null) {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  let seconds: number
  if (/^\d+$/.test(trimmed)) {
    seconds = Number(trimmed)
  } else {
    const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
    if (!match || !trimmed) return null
    seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  }
  return seconds > 0 && seconds <= maxStartSeconds ? seconds : null
}

function readVideoId(candidate: string | undefined) {
  return candidate && videoIdPattern.test(candidate) ? candidate : null
}

function hashParams(url: URL) {
  return new URLSearchParams(url.hash.replace(/^#/, ''))
}

function extractVideoId(url: URL) {
  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') return readVideoId(segments[0])
  if (youTubeHosts.has(host)) {
    if (segments[0] === 'watch') return readVideoId(url.searchParams.get('v') ?? undefined)
    if (['shorts', 'live', 'embed', 'v'].includes(segments[0] ?? '')) return readVideoId(segments[1])
    return null
  }
  if (embedHosts.has(host) && segments[0] === 'embed') return readVideoId(segments[1])
  return null
}

export function isYouTubeEmbedUrl(url: URL) {
  return embedHosts.has(url.hostname.toLowerCase()) && url.pathname.startsWith('/embed/')
}

function parseInputUrl(input: string): URL | null {
  const iframeSource = input.match(/src=["']([^"']+)["']/i)?.[1]
  let raw = (iframeSource ?? input).trim().replaceAll('&amp;', '&')
  if (raw.startsWith('//')) raw = `https:${raw}`
  // Scheme-less paste such as youtube.com/watch?v=... or youtu.be/...
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[^\s/?#@]+\.[^\s/?#@]+(?:[/?#]|$)/.test(raw)) raw = `https://${raw}`

  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/** True when the input is an http(s) link on a YouTube host, whether or not it holds a valid video. */
export function isYouTubeHostLink(input: string): boolean {
  const url = parseInputUrl(input)
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return false
  const host = url.hostname.toLowerCase()
  return host === 'youtu.be' || youTubeHosts.has(host) || embedHosts.has(host)
}

/** Builds the canonical watch URL from a YouTube embed URL, or null if it is not one. */
export function toYouTubeWatchUrl(embedUrl: string): string | null {
  let url: URL
  try {
    url = new URL(embedUrl)
  } catch {
    return null
  }
  if (!isYouTubeEmbedUrl(url)) return null
  const videoId = readVideoId(url.pathname.split('/').filter(Boolean)[1])
  if (!videoId) return null
  const watchUrl = new URL('https://www.youtube.com/watch')
  watchUrl.searchParams.set('v', videoId)
  const start = parseStartSeconds(url.searchParams.get('start'))
  if (start) watchUrl.searchParams.set('t', String(start))
  return watchUrl.toString()
}

/** Returns a privacy-enhanced embed URL for a YouTube link or iframe snippet, or null if the input is not a recognised YouTube video. */
export function toYouTubeEmbedUrl(input: string): string | null {
  const url = parseInputUrl(input)
  if (!url) return null
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null

  const videoId = extractVideoId(url)
  if (!videoId) return null

  const start = parseStartSeconds(url.searchParams.get('start') ?? url.searchParams.get('t') ?? hashParams(url).get('t'))
  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`)
  if (start) embedUrl.searchParams.set('start', String(start))
  return embedUrl.toString()
}

/** Builds the iframe src for a stored YouTube embed URL (any embed host), or null if it is not a valid one. */
export function toYouTubeIframeSrc(storedUrl: string): string | null {
  let url: URL
  try {
    url = new URL(storedUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!isYouTubeEmbedUrl(url)) return null
  const videoId = readVideoId(url.pathname.split('/').filter(Boolean)[1])
  if (!videoId) return null
  const iframeUrl = new URL(`https://www.youtube.com/embed/${videoId}`)
  const start = parseStartSeconds(url.searchParams.get('start'))
  if (start) iframeUrl.searchParams.set('start', String(start))
  iframeUrl.searchParams.set('playsinline', '1')
  iframeUrl.searchParams.set('rel', '0')
  return iframeUrl.toString()
}
