/* Imported before Workbox's listener. Only the sole requesting app window may activate an update. */
(() => {
  const protocol = 'PRO100PRACTICE_UPDATE_V2'
  const grants = new Map()
  const grantLifetimeMs = 5000

  function inScope(url) {
    try {
      const candidate = new URL(url)
      const scope = new URL(self.registration.scope)
      return candidate.origin === scope.origin && candidate.pathname.startsWith(scope.pathname)
    } catch { return false }
  }
  async function onlyRequester(source) {
    if (!source || source.type !== 'window' || !source.id || !inScope(source.url)) return false
    const current = await self.clients.get(source.id)
    if (!current || current.type !== 'window' || !inScope(current.url)) return false
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter((client) => inScope(client.url))
    return windows.length === 1 && windows[0].id === source.id
  }
  self.addEventListener('message', (event) => {
    const message = event.data
    if (message && message.type === 'SKIP_WAITING') {
      event.stopImmediatePropagation()
      return
    }
    if (!message || message.protocol !== protocol) return
    event.stopImmediatePropagation()
    const port = event.ports && event.ports[0]
    if (!port || typeof message.requestId !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(message.requestId)) return
    const respond = (result) => port.postMessage({ protocol, requestId: message.requestId, ...result })
    event.waitUntil((async () => {
      const now = Date.now()
      for (const [key, grant] of grants) if (grant.expires <= now) grants.delete(key)
      const source = event.source
      if (message.action === 'inspect') {
        if (!await onlyRequester(source)) { respond({ ready: false, reason: 'otherWindows' }); return }
        const token = crypto.randomUUID()
        grants.clear()
        grants.set(message.requestId, { clientId: source.id, token, expires: now + grantLifetimeMs })
        respond({ ready: true, token })
      } else if (message.action === 'activate') {
        const grant = grants.get(message.requestId)
        grants.delete(message.requestId)
        if (!grant || grant.clientId !== source?.id || grant.token !== message.token || grant.expires <= Date.now()) {
          respond({ ready: false, reason: 'coordinationUnavailable' }); return
        }
        if (!await onlyRequester(source)) { respond({ ready: false, reason: 'otherWindows' }); return }
        if (grant.expires <= Date.now()) { respond({ ready: false, reason: 'coordinationUnavailable' }); return }
        // Real window enumeration is repeated here; a heartbeat expiry cannot hide a suspended tab.
        respond({ ready: true })
        await self.skipWaiting()
      } else respond({ ready: false, reason: 'coordinationUnavailable' })
    })().catch(() => { respond({ ready: false, reason: 'coordinationUnavailable' }) }))
  })
})()
