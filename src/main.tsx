import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './components/AuthGate'
import { I18nProvider } from './lib/i18n'
import { attachPreloadRecovery } from './lib/lazyChunkRecovery'
import PwaUpdateHost from './components/PwaUpdateHost'
import * as Sentry from '@sentry/react'
import { initializeMonitoring } from './lib/monitoring'
import './index.css'

initializeMonitoring()
attachPreloadRecovery(window)

createRoot(document.getElementById('root')!, {
  onCaughtError: Sentry.reactErrorHandler(),
  onUncaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <I18nProvider>
      <PwaUpdateHost />
      <AuthGate />
    </I18nProvider>
  </StrictMode>,
)