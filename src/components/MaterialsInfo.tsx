import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import PickerDialog from './PickerDialog'

const paragraphs = ['materials.builtIn', 'materials.formats', 'materials.local', 'materials.network', 'materials.browser', 'materials.bookmarks'] as const

export default function MaterialsInfo() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" data-tour="materials-info" title={t('Learning materials')} aria-label={t('Learning materials')} aria-haspopup="dialog" onClick={() => setOpen(true)} className="icon-btn shrink-0">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>
    </button>
    {open && <PickerDialog title={t('Learning materials')} onClose={() => setOpen(false)}>
      <div className="space-y-3 text-sm leading-relaxed text-slate-200">{paragraphs.map(key => <p key={key}>{t(key)}</p>)}</div>
    </PickerDialog>}
  </>
}