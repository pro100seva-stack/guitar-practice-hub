import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { isYouTubeEmbedUrl, isYouTubeHostLink, toYouTubeEmbedUrl, toYouTubeIframeSrc, toYouTubeWatchUrl } from '../src/lib/youtube'
import { lookupYouTubeTitle, toYouTubeApiSrc, youTubeTitleFallback } from '../src/lib/youtube'
import { bookmarkSeek, formatPracticeTime, loopRange, loopSeekTarget, supportedPlaybackRates } from '../src/lib/youtubePractice'

const id = 'dQw4w9WgXcQ'
const embed = `https://www.youtube-nocookie.com/embed/${id}`

describe('toYouTubeEmbedUrl', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${id}`, embed],
    [`https://youtube.com/watch?v=${id}&list=PL123&index=2&feature=share`, embed],
    [`https://m.youtube.com/watch?v=${id}`, embed],
    [`https://music.youtube.com/watch?v=${id}&si=abc`, embed],
    [`https://youtu.be/${id}`, embed],
    [`https://youtu.be/${id}?si=trackingtoken`, embed],
    [`https://www.youtube.com/shorts/${id}?feature=share`, embed],
    [`https://www.youtube.com/live/${id}?si=x`, embed],
    [`https://www.youtube.com/embed/${id}`, embed],
    [`https://www.youtube-nocookie.com/embed/${id}?rel=0`, embed],
    [`  https://www.youtube.com/watch?v=${id}  `, embed],
  ])('normalises %s', (input, expected) => {
    expect(toYouTubeEmbedUrl(input)).toBe(expected)
  })

  it('preserves start time as seconds', () => {
    expect(toYouTubeEmbedUrl(`https://www.youtube.com/watch?v=${id}&t=90s`)).toBe(`${embed}?start=90`)
    expect(toYouTubeEmbedUrl(`https://youtu.be/${id}?t=1m30s`)).toBe(`${embed}?start=90`)
    expect(toYouTubeEmbedUrl(`https://youtu.be/${id}?t=1h2m3s`)).toBe(`${embed}?start=3723`)
    expect(toYouTubeEmbedUrl(`https://www.youtube.com/embed/${id}?start=45`)).toBe(`${embed}?start=45`)
    expect(toYouTubeEmbedUrl(`https://www.youtube.com/watch?v=${id}#t=12`)).toBe(`${embed}?start=12`)
  })

  it('ignores invalid start values', () => {
    expect(toYouTubeEmbedUrl(`https://youtu.be/${id}?t=abc`)).toBe(embed)
    expect(toYouTubeEmbedUrl(`https://youtu.be/${id}?t=0`)).toBe(embed)
    expect(toYouTubeEmbedUrl(`https://youtu.be/${id}?t=-5`)).toBe(embed)
    expect(toYouTubeEmbedUrl(`https://youtu.be/${id}?t=99999999`)).toBe(embed)
  })

  it('extracts the src from a pasted iframe snippet', () => {
    const snippet = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}?si=abc&amp;start=30" title="x" allowfullscreen></iframe>`
    expect(toYouTubeEmbedUrl(snippet)).toBe(`${embed}?start=30`)
    expect(toYouTubeEmbedUrl(`<iframe src="//www.youtube.com/embed/${id}"></iframe>`)).toBe(embed)
  })

  it('rejects junk and non-video YouTube pages', () => {
    for (const input of ['', 'hello', 'https://', 'https://www.youtube.com/', 'https://www.youtube.com/watch', 'https://www.youtube.com/@channel', 'https://www.youtube.com/playlist?list=PL1']) {
      expect(toYouTubeEmbedUrl(input)).toBeNull()
    }
  })

  it('rejects malformed video ids', () => {
    for (const bad of ['short', 'dQw4w9WgXcQQ', 'dQw4w9WgXc!', 'dQw4w9WgX<>', 'dQw4w9WgXc%']) {
      expect(toYouTubeEmbedUrl(`https://www.youtube.com/watch?v=${bad}`)).toBeNull()
      expect(toYouTubeEmbedUrl(`https://youtu.be/${bad}`)).toBeNull()
    }
  })

  it('rejects non-http protocols and lookalike hosts', () => {
    for (const input of [
      `javascript:alert(1)//youtube.com/watch?v=${id}`,
      `data:text/html,https://youtube.com/watch?v=${id}`,
      `ftp://www.youtube.com/watch?v=${id}`,
      `https://evilyoutube.com/watch?v=${id}`,
      `https://youtube.com.evil.com/watch?v=${id}`,
      `https://www.youtube.com@evil.com/watch?v=${id}`,
      `https://evil.com/?u=https://youtube.com/watch?v=${id}`,
      `https://notyoutu.be/${id}`,
      `https://youtu.be.evil.com/${id}`,
      `https://evil.com/youtube.com/embed/${id}`,
      `https://www.youtube.com:evil@x.com/watch?v=${id}`,
    ]) {
      expect(toYouTubeEmbedUrl(input)).toBeNull()
    }
  })

  it('rejects an iframe snippet whose src is not YouTube', () => {
    expect(toYouTubeEmbedUrl(`<iframe src="https://evil.com/embed/${id}"></iframe>`)).toBeNull()
    expect(toYouTubeEmbedUrl(`<iframe src="javascript:alert(1)"></iframe>`)).toBeNull()
  })
})

describe('scheme-less input', () => {
  it.each([
    `youtube.com/watch?v=${id}`,
    `www.youtube.com/watch?v=${id}`,
    `m.youtube.com/watch?v=${id}`,
    `youtu.be/${id}`,
    `www.youtube.com/shorts/${id}`,
  ])('normalises %s', (input) => {
    expect(toYouTubeEmbedUrl(input)).toBe(embed)
  })

  it('keeps start time and rejects lookalikes and bad ids', () => {
    expect(toYouTubeEmbedUrl(`youtu.be/${id}?t=30`)).toBe(`${embed}?start=30`)
    for (const input of [`evilyoutube.com/watch?v=${id}`, `youtube.com.evil.com/watch?v=${id}`, `youtube.com@evil.com/watch?v=${id}`, 'youtube.com/watch?v=short', 'hello']) {
      expect(toYouTubeEmbedUrl(input)).toBeNull()
    }
  })
})

describe('isYouTubeHostLink', () => {
  it('detects YouTube hosts even with invalid ids', () => {
    expect(isYouTubeHostLink('https://www.youtube.com/watch?v=short')).toBe(true)
    expect(isYouTubeHostLink('youtu.be/bad')).toBe(true)
    expect(isYouTubeHostLink('youtube.com/@channel')).toBe(true)
    expect(isYouTubeHostLink(`<iframe src="https://www.youtube.com/embed/bad"></iframe>`)).toBe(true)
  })

  it('ignores other hosts and non-links', () => {
    expect(isYouTubeHostLink('https://example.com/watch?v=abc')).toBe(false)
    expect(isYouTubeHostLink('https://youtube.com.evil.com/x')).toBe(false)
    expect(isYouTubeHostLink('hello')).toBe(false)
    expect(isYouTubeHostLink('javascript:alert(1)//youtube.com')).toBe(false)
  })
})

describe('toYouTubeWatchUrl', () => {
  it('derives a canonical watch URL from an embed URL', () => {
    expect(toYouTubeWatchUrl(embed)).toBe(`https://www.youtube.com/watch?v=${id}`)
    expect(toYouTubeWatchUrl(`${embed}?start=90`)).toBe(`https://www.youtube.com/watch?v=${id}&t=90`)
    expect(toYouTubeWatchUrl(`${embed}?start=90&si=x&enablejsapi=1`)).toBe(`https://www.youtube.com/watch?v=${id}&t=90`)
  })

  it('returns null for non-embed or invalid input', () => {
    expect(toYouTubeWatchUrl(`https://www.youtube.com/watch?v=${id}`)).toBeNull()
    expect(toYouTubeWatchUrl('https://www.youtube-nocookie.com/embed/bad')).toBeNull()
    expect(toYouTubeWatchUrl('nonsense')).toBeNull()
  })
})

describe('isYouTubeEmbedUrl', () => {
  it('only accepts exact YouTube embed hosts', () => {
    expect(isYouTubeEmbedUrl(new URL(`https://www.youtube-nocookie.com/embed/${id}`))).toBe(true)
    expect(isYouTubeEmbedUrl(new URL(`https://youtube.com/embed/${id}`))).toBe(true)
    expect(isYouTubeEmbedUrl(new URL(`https://evilyoutube.com/embed/${id}`))).toBe(false)
    expect(isYouTubeEmbedUrl(new URL(`https://www.youtube.com/watch?v=${id}`))).toBe(false)
  })
})

describe('toYouTubeIframeSrc', () => {
  const owner = 'https://www.youtube.com/watch?v=b5SbZwd0egM&list=RDa-u6Q4Vzhjg&index=34'
  const expected = 'https://www.youtube.com/embed/b5SbZwd0egM?playsinline=1&rel=0'

  it('converts the owner test link', () => {
    expect(toYouTubeIframeSrc(toYouTubeEmbedUrl(owner) ?? '')).toBe(expected)
  })

  it('keeps start times', () => {
    const stored = toYouTubeEmbedUrl('https://youtu.be/b5SbZwd0egM?t=1m30s') ?? ''
    expect(toYouTubeIframeSrc(stored)).toBe('https://www.youtube.com/embed/b5SbZwd0egM?start=90&playsinline=1&rel=0')
  })

  it.each([
    'https://www.youtube-nocookie.com/embed/b5SbZwd0egM?playsinline=1&enablejsapi=1&origin=http%3A%2F%2Flocalhost%3A5173',
    'https://youtube.com/embed/b5SbZwd0egM?si=abc',
    'https://www.youtube.com/embed/b5SbZwd0egM?si=xyz&origin=https://evil.example',
  ])('normalises stored record %s', (stored) => {
    const result = toYouTubeIframeSrc(stored) ?? ''
    expect(result).toBe(expected)
    expect(result).not.toMatch(/enablejsapi|origin/)
  })

  it('handles the iframe snippet form via the embed conversion', () => {
    const snippet = '<iframe src="https://www.youtube.com/embed/b5SbZwd0egM?si=xyz&amp;start=10" title="x"></iframe>'
    expect(toYouTubeIframeSrc(toYouTubeEmbedUrl(snippet) ?? '')).toBe('https://www.youtube.com/embed/b5SbZwd0egM?start=10&playsinline=1&rel=0')
  })

  it.each([
    'https://www.youtube.com.evil.com/embed/b5SbZwd0egM',
    'https://evilyoutube.com/embed/b5SbZwd0egM',
    'https://www.youtube.com/embed/short',
    'https://www.youtube.com/embed/b5SbZwd0egM!!',
    'https://www.youtube.com/watch?v=b5SbZwd0egM',
    'javascript:alert(1)',
    'not a url',
  ])('rejects %s', (input) => {
    expect(toYouTubeIframeSrc(input)).toBeNull()
  })
})

describe('API URLs and new-link titles', () => {
  it('uses the current HTTP(S) origin, strips stored parameters and preserves start', () => {
    const src = new URL(toYouTubeApiSrc(`${embed}?start=30&origin=https://evil.test&autoplay=1&controls=0`, 'http://localhost:5173')!)
    expect(src.origin).toBe('https://www.youtube.com')
    expect(Object.fromEntries(src.searchParams)).toEqual({ start: '30', playsinline: '1', rel: '0', enablejsapi: '1', origin: 'http://localhost:5173' })
    expect(toYouTubeApiSrc(embed, 'https://practice.example')).not.toBeNull()
    for (const origin of ['null', 'file:///', 'https://practice.example/path', 'https://evil.test@practice.example']) expect(toYouTubeApiSrc(embed, origin)).toBeNull()
    expect(toYouTubeApiSrc(`https://user@www.youtube.com/embed/${id}`, 'https://practice.example')).toBeNull()
  })

  it('fetches only canonical oEmbed JSON and treats titles as plain strings', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ title: '  <img onerror=evil()> Lesson  ' })))
    expect(await lookupYouTubeTitle(`${embed}?start=30&url=https://evil.test`, request)).toBe('<img onerror=evil()> Lesson')
    const [input, options] = request.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe('https://www.youtube.com/oembed')
    expect(url.searchParams.get('url')).toBe(`https://www.youtube.com/watch?v=${id}`)
    expect(options).toMatchObject({ mode: 'cors', credentials: 'omit' })
    expect(youTubeTitleFallback(embed)).toBe(`YouTube ${id}`)
  })

  it('returns null on invalid responses, network failure or timeout', async () => {
    for (const payload of [{ title: '  ' }, { title: 42 }, {}, null]) {
      expect(await lookupYouTubeTitle(embed, vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload))))).toBeNull()
    }
    expect(await lookupYouTubeTitle(embed, vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))).toBeNull()
    expect(await lookupYouTubeTitle(embed, vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 403 })))).toBeNull()
    const invalid = vi.fn<typeof fetch>()
    expect(await lookupYouTubeTitle('https://evil.test', invalid)).toBeNull()
    expect(invalid).not.toHaveBeenCalled()
    vi.useFakeTimers()
    try {
      const request = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}))
      const result = lookupYouTubeTitle(embed, request)
      await vi.advanceTimersByTimeAsync(4000)
      expect(await result).toBeNull()
      expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true)
    } finally { vi.useRealTimers() }
  })
})

describe('practice decisions', () => {
  it('provides all practice and rename translations in four languages', () => {
    const source = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionarySource = source.slice(source.indexOf('const pageTranslations:'), source.indexOf('const I18nContext ='))
    const dictionaries = runInNewContext(transpileModule(`${dictionarySource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
    const player = readFileSync('src/components/YouTubePracticePlayer.tsx', 'utf8')
    const keys = [...player.matchAll(/\bt\('([^']+)'/g)].map((match) => match[1])
    keys.push('Rename', 'Rename {name}', 'Material name', 'Save name', 'Cancel', 'Enter a material name.', 'Could not save material changes.', 'YouTube requires a valid HTTP or HTTPS origin.', 'YouTube could not load. Check your connection or open on YouTube.', 'YouTube could not verify this embed origin.', 'This video is unavailable or cannot be embedded. Open on YouTube.')
    for (const language of ['en', 'ru', 'it', 'fr']) expect(keys.filter((key) => !dictionaries[language][key]), language).toEqual([])
  })

  it('validates finite section bounds and known duration', () => {
    expect(loopRange('off', 0, 5, 10)).toBeNull()
    expect(loopRange('whole', NaN, NaN, 10)).toEqual({ start: 0, end: 10 })
    expect(loopRange('section', 0, 5.5, 10)).toEqual({ start: 0, end: 5.5 })
    for (const [start, end, duration] of [[-1, 5, 10], [5, 5, 10], [6, 5, 10], [0, 11, 10], [NaN, 5, 10], [0, Infinity, 10], [0, 5, 0], [0, 5, Infinity]]) expect(loopRange('section', start, end, duration)).toBeNull()
  })
  it('loops only while playing or ended, and throttles in-flight seeks', () => {
    const range = { start: 2, end: 5 }
    expect(loopSeekTarget(range, 5, 1, false)).toBe(2)
    expect(loopSeekTarget(range, 10, 0, false)).toBe(2)
    expect(loopSeekTarget(range, 1, 1, false)).toBe(2)
    for (const state of [-1, 2, 3, 5]) expect(loopSeekTarget(range, 5, state, false)).toBeNull()
    expect(loopSeekTarget(range, 5, 1, true)).toBeNull()
    expect(loopSeekTarget(null, 5, 1, false)).toBeNull()
  })
  it('keeps paused bookmark seeks paused and rejects invalid positions', () => {
    expect(bookmarkSeek(2.5, 10, 2)).toEqual({ position: 2.5, play: false })
    expect(bookmarkSeek(2.5, 10, 1)).toEqual({ position: 2.5, play: true })
    for (const position of [-1, NaN, Infinity, 11]) expect(bookmarkSeek(position, 10, 2)).toBeNull()
    expect(bookmarkSeek(0, 0, 2)).toBeNull()
  })
  it('offers only actual API rates and formats bookmark tenths', () => {
    expect(supportedPlaybackRates([1, 0.25, 0.5, 1.5, 2, 1, NaN, -1])).toEqual([0.25, 0.5, 1, 1.5, 2])
    expect(supportedPlaybackRates([1])).toEqual([1])
    expect(formatPracticeTime(65.34)).toBe('1:05.3')
    expect(formatPracticeTime(59.96)).toBe('1:00.0')
  })
})
