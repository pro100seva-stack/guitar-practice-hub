import { describe, expect, it } from 'vitest'
import { isYouTubeEmbedUrl, isYouTubeHostLink, toYouTubeEmbedUrl, toYouTubeIframeSrc, toYouTubeWatchUrl } from '../src/lib/youtube'

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
