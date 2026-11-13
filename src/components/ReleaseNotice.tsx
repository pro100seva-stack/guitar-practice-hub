import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { appVersion } from '../lib/buildInfo'
import { acknowledgeRelease, changelogUrl, getReleaseSummary, readReleaseAcknowledgement } from '../lib/releaseNotes'
import { useI18n } from '../lib/i18n'

// If browser storage is unavailable, still dismiss once for this app session.
const dismissedThisSession = new Set<string>()

export default function ReleaseNotice({ blocked }: { blocked: boolean }) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const [summary] = useState(() => {
    if (dismissedThisSession.has(appVersion)) return null
    let acknowledged = null
    try { acknowledged = readReleaseAcknowledgement(window.localStorage) } catch { /* Storage access itself may be denied. */ }
    return getReleaseSummary(appVersion, acknowledged)
  })
  const [dismissed, setDismissed] = useState(false)

  function dismiss() {
    dismissedThisSession.add(appVersion)
    try { acknowledgeRelease(appVersion, window.localStorage) } catch { /* Session dismissal still works without storage. */ }
    setDismissed(true)
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!summary || dismissed || !dialog) return
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
  }, [summary, dismissed, blocked])

  if (!summary || dismissed) return null
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="release-notice-heading"
      aria-describedby="release-notice-version"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-slate-950/70"
      onCancel={(event) => { event.preventDefault(); dismiss() }}
    >
      <h2 id="release-notice-heading" className="text-lg font-semibold">{t('release.title')}</h2>
      <p id="release-notice-version" className="mt-1 text-sm text-slate-400">{t('release.version', { version: appVersion })}</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-200">
        {summary.map((key) => <li key={key}>{t(key)}</li>)}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <a href={changelogUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded text-sm text-sky-300 underline underline-offset-4 hover:text-sky-100 focus-visible:outline-2 focus-visible:outline-sky-400">{t('release.changelog')}</a>
        <button ref={closeRef} type="button" onClick={dismiss} className="btn btn-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400">{t('release.dismiss')}</button>
      </div>
    </dialog>,
    document.body,
  )
}
