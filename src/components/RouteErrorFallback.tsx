import { useEffect, useState } from 'react'
import { Link, useLocation, useRouteError } from 'react-router'
import { useI18n } from '../lib/i18n'
import { isLazyChunkError, lazyChunkRecovery } from '../lib/lazyChunkRecovery'

export default function RouteErrorFallback() {
  const error = useRouteError()
  const location = useLocation()
  const { t } = useI18n()
  const [online, setOnline] = useState(navigator.onLine)
  const chunkFailure = isLazyChunkError(error)

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    lazyChunkRecovery.recover(error)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [error])

  return (
    <main className="min-h-dvh bg-slate-900 px-[var(--page-px)] py-16 text-slate-100">
      <div className="page space-y-4">
        <h1 className="page-title">{t('Page unavailable')}</h1>
        <p role="alert" className="text-sm text-slate-300">
          {t(chunkFailure ? 'This page could not load. The app may have been updated.' : 'Something went wrong. Please try again.')}
        </p>
        <p role="status" className="text-sm text-slate-300">
          {!online ? t('You are offline. Reconnect to retry.') : t('Retry is available.')}
        </p>
        <p className="text-sm text-slate-400">{t('Unsaved changes will be lost.')}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" disabled={!online} onClick={() => lazyChunkRecovery.retryManually()}>
            {t('Retry')}
          </button>
          {location.pathname !== '/landing' && location.pathname !== '/' && (
            <Link to="/landing" className="btn btn-secondary">{t('Home')}</Link>
          )}
        </div>
      </div>
    </main>
  )
}