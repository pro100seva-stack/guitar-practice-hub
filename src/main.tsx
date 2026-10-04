import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './components/AuthGate'
import { I18nProvider } from './lib/i18n'
import { attachPreloadRecovery } from './lib/lazyChunkRecovery'
import './index.css'

attachPreloadRecovery(window)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthGate />
    </I18nProvider>
  </StrictMode>,
)