export interface YouTubePlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  getAvailablePlaybackRates(): number[]
  getPlaybackRate(): number
  setPlaybackRate(rate: number): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
}

export type YouTubePlayerOptions = {
  playerVars?: { controls: 0; playsinline: 1; enablejsapi: 1; origin: string }
  events: {
    onReady: (event: { target: YouTubePlayer }) => void
    onStateChange: (event: { target: YouTubePlayer; data: number }) => void
    onPlaybackRateChange: (event: { target: YouTubePlayer; data: number }) => void
    onError: (event: { target: YouTubePlayer; data: number }) => void
  }
}

export type YouTubeApi = { Player: new (element: HTMLIFrameElement, options: YouTubePlayerOptions) => YouTubePlayer }

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let loading: Promise<YouTubeApi> | null = null

export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (loading) return loading
  loading = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    const script = document.createElement('script')
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.onerror = null
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous
      if (!error && window.YT?.Player) resolve(window.YT)
      else {
        script.remove()
        reject(error ?? new Error('YouTube API unavailable.'))
      }
    }
    const ready = () => {
      finish()
      previous?.()
    }
    const timer = setTimeout(() => finish(new Error('YouTube API timed out.')), 10000)
    window.onYouTubeIframeAPIReady = ready
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => finish(new Error('YouTube API could not load.'))
    document.head.appendChild(script)
  })
  const current = loading
  void current.catch(() => { if (loading === current) loading = null })
  return current
}
