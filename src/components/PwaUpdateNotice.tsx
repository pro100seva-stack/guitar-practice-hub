import { useSyncExternalStore } from 'react'
import { useI18n } from '../lib/i18n'
import {
  getPwaUpdateSnapshot,
  pwaReasonKey,
  pwaUpdateLater,
  pwaUpdateNow,
  subscribePwaUpdate,
  isPwaUpdateLocked,
} from '../lib/pwaUpdateRuntime'

export default function PwaUpdateNotice() {
  const { t } = useI18n()
  const state = useSyncExternalStore(subscribePwaUpdate, getPwaUpdateSnapshot, getPwaUpdateSnapshot)
  const locked = useSyncExternalStore(subscribePwaUpdate, isPwaUpdateLocked, () => false)
  if (!state.waiting || !state.visible) return null

  const reasonKey = pwaReasonKey(state.reason)
  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={t('pwa.updateReady')}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl rounded-xl border border-sky-400/60 bg-slate-950 p-4 text-slate-100 shadow-2xl shadow-black/50"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{t('pwa.updateReady')}</p>
          <p className="mt-1 text-sm text-slate-300">
            {state.applying
              ? t('pwa.applying')
              : state.checking || locked
                ? t('pwa.checkingTabs')
                : reasonKey
                  ? t(reasonKey)
                  : t('pwa.safeAutomatic')}
          </p>
        </div>
        {!state.applying && !locked && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              data-pwa-update-control
              disabled={state.checking}
              onClick={pwaUpdateLater}
              className="btn btn-secondary min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pwa.later')}
            </button>
            <button
              type="button"
              data-pwa-update-control
              disabled={!state.online || state.checking}
              onClick={() => { void pwaUpdateNow() }}
              className="btn btn-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pwa.updateNow')}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
