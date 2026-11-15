import { useEffect, useSyncExternalStore } from 'react'
import PwaUpdateNotice from './PwaUpdateNotice'
import { initializePwaUpdates, isPwaUpdateLocked, subscribePwaUpdate } from '../lib/pwaUpdateRuntime'

export default function PwaUpdateHost() {
  useSyncExternalStore(subscribePwaUpdate, isPwaUpdateLocked, () => false)

  useEffect(() => {
    const blockInteraction = (event: Event) => {
      if (!isPwaUpdateLocked()) return
      const target = event.target
      if (target instanceof Element && target.closest('[data-pwa-update-control]')) return
      if (event.cancelable) event.preventDefault()
      event.stopImmediatePropagation()
    }
    const eventTypes = ['click', 'pointerdown', 'keydown', 'beforeinput', 'input', 'change', 'submit']
    eventTypes.forEach((type) => document.addEventListener(type, blockInteraction, true))
    initializePwaUpdates()
    return () => eventTypes.forEach((type) => document.removeEventListener(type, blockInteraction, true))
  }, [])

  return <PwaUpdateNotice />
}
