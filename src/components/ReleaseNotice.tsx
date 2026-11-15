import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { appVersion } from '../lib/buildInfo'
import { changelogUrl, getReleaseSummary } from '../lib/releaseNotes'
import { useI18n } from '../lib/i18n'
import { releaseNoticePendingKey, releaseNoticeReceipts, releaseNoticeStorageKey, type ReleaseReceiptStorage } from '../lib/releaseNoticeReceipt'
import { supabase } from '../lib/supabase'

const initialReceiptCheckTimeoutMs = 1750

async function claimReleaseNotice(owner: string, version: string) {
  const { data, error } = await supabase.rpc(
    'claim_release_notice',
    { p_version: version, p_expected_user_id: owner },
  )
  if (error) throw error
  if (typeof data !== 'boolean') throw new Error('Invalid release notice claim response')
  return data
}

function localStorageOrNull(): ReleaseReceiptStorage | null {
  try { return window.localStorage } catch { return null }
}

export default function ReleaseNotice({ blocked, manualOpenRequest = 0 }: { blocked: boolean; manualOpenRequest?: number }) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const [owner, setOwner] = useState<string | null>(null)
  const [, setReceiptRevision] = useState(0)
  const [receiptCheck, setReceiptCheck] = useState<{ owner: string; epoch: number } | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const manualRequestRef = useRef(manualOpenRequest)
  const ownerRef = useRef<string | null>(null)
  const ownerEpochRef = useRef(0)

  useEffect(() => {
    let active = true
    let authEvents = 0
    let generation = 0
    let currentOwner: string | null = null

    function retryPending(expectedOwner: string, expectedGeneration: number) {
      const storage = localStorageOrNull()
      void releaseNoticeReceipts.syncPending({
        owner: expectedOwner,
        storage,
        isCurrent: () => active && currentOwner === expectedOwner && generation === expectedGeneration,
        claim: (version) => claimReleaseNotice(expectedOwner, version),
      }).then(() => {
        if (active && currentOwner === expectedOwner && generation === expectedGeneration) {
          setReceiptRevision((revision) => revision + 1)
        }
      })
    }

    async function readServerReceipt(expectedOwner: string, expectedGeneration: number) {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('last_seen_release_version')
          .eq('user_id', expectedOwner)
          .maybeSingle()
        if (error || !data || !active || currentOwner !== expectedOwner || generation !== expectedGeneration) return
        const storage = localStorageOrNull()
        const hadCurrentReceipt = releaseNoticeReceipts.hasSeen(expectedOwner, appVersion, storage)
        releaseNoticeReceipts.reconcileServerVersion(expectedOwner, data.last_seen_release_version, storage)
        if (hadCurrentReceipt !== releaseNoticeReceipts.hasSeen(expectedOwner, appVersion, storage)) {
          setReceiptRevision((revision) => revision + 1)
        }
      } catch {
        // A failed/offline read is not an acknowledgement; resume events will retry it.
      }
    }

    function acceptOwner(nextOwner: string | null) {
      if (currentOwner !== nextOwner) {
        ownerEpochRef.current++
        generation++
        setReceiptCheck(null)
      }
      currentOwner = nextOwner
      ownerRef.current = nextOwner
      setOwner(nextOwner)
      if (nextOwner) {
        const expectedGeneration = generation
        queueMicrotask(() => {
          if (active && currentOwner === nextOwner && generation === expectedGeneration) {
            const timeout = window.setTimeout(() => {
              if (active && currentOwner === nextOwner && generation === expectedGeneration) {
                setReceiptCheck({ owner: nextOwner, epoch: ownerEpochRef.current })
              }
            }, initialReceiptCheckTimeoutMs)
            void readServerReceipt(nextOwner, expectedGeneration).finally(() => {
              window.clearTimeout(timeout)
              if (active && currentOwner === nextOwner && generation === expectedGeneration) {
                setReceiptCheck({ owner: nextOwner, epoch: ownerEpochRef.current })
              }
            })
            retryPending(nextOwner, expectedGeneration)
          }
        })
      }
    }

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      authEvents++
      acceptOwner(session?.access_token ? session.user.id : null)
    })
    const initialAuthEvents = authEvents
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && authEvents === initialAuthEvents) {
        acceptOwner(!error && data.session?.access_token ? data.session.user.id : null)
      }
    }).catch(() => {
      if (active && authEvents === initialAuthEvents) acceptOwner(null)
    })

    function recoverCurrent() {
      if (!currentOwner) return
      const expectedOwner = currentOwner
      const expectedGeneration = generation
      void readServerReceipt(expectedOwner, expectedGeneration)
      retryPending(expectedOwner, expectedGeneration)
    }
    function onStorage(event: StorageEvent) {
      if (!currentOwner) return
      if (event.key === releaseNoticeStorageKey(currentOwner)) setReceiptRevision((revision) => revision + 1)
      if (event.key === releaseNoticePendingKey(currentOwner)) {
        setReceiptRevision((revision) => revision + 1)
        recoverCurrent()
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') recoverCurrent()
    }
    window.addEventListener('online', recoverCurrent)
    window.addEventListener('focus', recoverCurrent)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      ownerRef.current = null
      authSubscription.subscription.unsubscribe()
      window.removeEventListener('online', recoverCurrent)
      window.removeEventListener('focus', recoverCurrent)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (manualRequestRef.current === manualOpenRequest) return
    manualRequestRef.current = manualOpenRequest
    setManualOpen(true)
  }, [manualOpenRequest])

  const storage = localStorageOrNull()
  const acknowledged = owner && releaseNoticeReceipts.hasSeen(owner, appVersion, storage)
  const receiptCheckComplete = Boolean(owner && receiptCheck?.owner === owner && receiptCheck.epoch === ownerEpochRef.current)
  const currentSummary = owner && receiptCheckComplete ? getReleaseSummary(appVersion, null) : null
  const summary = currentSummary && (manualOpen || !acknowledged) ? currentSummary : null

  function dismiss() {
    if (manualOpen) {
      setManualOpen(false)
      return
    }
    const currentOwner = owner
    if (!currentOwner || ownerRef.current !== currentOwner) return
    const currentEpoch = ownerEpochRef.current
    releaseNoticeReceipts.dismiss(currentOwner, appVersion, localStorageOrNull())
    setReceiptRevision((revision) => revision + 1)
    // Dismissal is the only point that creates a receipt; syncing is retryable afterward.
    void releaseNoticeReceipts.syncPending({
      owner: currentOwner,
      storage: localStorageOrNull(),
      isCurrent: () => ownerRef.current === currentOwner && ownerEpochRef.current === currentEpoch,
      claim: (version) => claimReleaseNotice(currentOwner, version),
    }).then(() => {
      if (ownerRef.current === currentOwner && ownerEpochRef.current === currentEpoch) {
        setReceiptRevision((revision) => revision + 1)
      }
    })
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!summary || !dialog) return
    function otherModal() {
      return Array.from(document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"][aria-modal="true"]'))
        .find((element) => element !== dialog && (element.matches('dialog[open]') || element.getClientRects().length > 0))
    }
    function syncVisibility() {
      if (!dialog) return
      if (blocked || otherModal()) {
        if (dialog.open) dialog.close()
        return
      }
      if (!dialog.open) {
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        dialog.showModal()
        closeRef.current?.focus({ preventScroll: true })
      }
    }
    syncVisibility()
    const observer = new MutationObserver(syncVisibility)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'hidden'] })
    return () => {
      observer.disconnect()
      if (dialog.open) dialog.close()
      const opener = openerRef.current
      if (!blocked && !otherModal() && opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [summary, blocked, owner])

  if (!summary) return null
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="release-notice-heading"
      aria-describedby="release-notice-version"
      className="release-notice"
      onCancel={(event) => { event.preventDefault(); dismiss() }}
    >
      <h2 id="release-notice-heading" className="release-notice-title">{t('release.title')}</h2>
      <p id="release-notice-version" className="release-notice-version">{t('release.version', { version: appVersion })}</p>
      <ul className="release-notice-changes">
        {summary.map((key) => <li key={key}>{t(key)}</li>)}
      </ul>
      <div className="release-notice-actions">
        <a href={changelogUrl} target="_blank" rel="noopener noreferrer" className="release-notice-link">{t('release.changelog')}</a>
        <button ref={closeRef} type="button" onClick={dismiss} className="btn release-notice-dismiss">{t('release.dismiss')}</button>
      </div>
    </dialog>,
    document.body,
  )
}
