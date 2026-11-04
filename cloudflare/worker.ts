type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

// Existing files are served by Workers Static Assets before this fallback runs.
// Keep this list aligned with src/router.tsx; missing files must never become HTML.
const appRoutes = new Set(['/', '/landing', '/progress', '/plan', '/practice', '/sessions', '/stats', '/settings'])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')
    const isHead = request.method === 'HEAD'

    if (!appRoutes.has(path)) {
      return new Response(isHead ? null : 'Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    if (request.method !== 'GET' && !isHead) {
      return new Response('Method not allowed', {
        status: 405,
        headers: { 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    url.pathname = '/index.html'
    url.search = ''
    const response = await env.ASSETS.fetch(new Request(url, request))
    return isHead ? new Response(null, response) : response
  },
}
