import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { catalogBlockLabel, categoryForCatalogBlock, type CatalogBlock } from '../lib/catalogApi'

const categories = [
  { key: 'technique_warmups', label: 'Technique and Warm-Ups' },
  { key: 'chords_rhythm', label: 'Chords and Rhythm' },
  { key: 'scales_fretboard', label: 'Scales and Fretboard Geography' },
  { key: 'ear_training', label: 'Ear Training' },
  { key: 'repertoire_songwork', label: 'Repertoire and Songwork' },
  { key: 'improvisation_composition', label: 'Improvisation and Composition' },
  { key: 'other', label: 'Other' },
] as const

function categoryFor(block: CatalogBlock) {
  const key = categoryForCatalogBlock(block).toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (key.includes('technique') || key.includes('warm')) return 'technique_warmups'
  if (key.includes('chord') || key.includes('rhythm')) return 'chords_rhythm'
  if (key.includes('scale') || key.includes('fretboard') || key.includes('geography')) return 'scales_fretboard'
  if (key.includes('ear')) return 'ear_training'
  if (key.includes('repertoire') || key.includes('song')) return 'repertoire_songwork'
  if (key.includes('improv') || key.includes('composition')) return 'improvisation_composition'
  return 'other'
}

type BlockGalleryProps = {
  blocks: readonly CatalogBlock[]
  selectedKeys?: readonly string[]
  selectionBehavior?: 'add' | 'toggle'
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onSelect: (block: CatalogBlock) => void
  onCreateOther?: (label: string) => Promise<CatalogBlock>
  creating?: boolean
  layout?: 'gallery' | 'dialog'
}

export default function BlockGallery({
  blocks,
  selectedKeys = [],
  selectionBehavior = 'toggle',
  loading = false,
  error = null,
  onRetry,
  onSelect,
  onCreateOther,
  creating = false,
  layout = 'gallery',
}: BlockGalleryProps) {
  const { t } = useI18n()
  const instanceId = useId()
  const panelId = `${instanceId}-panel`
  const galleryRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [blocksStep, setBlocksStep] = useState(false)
  const previousStep = useRef(false)
  const [category, setCategory] = useState<string>('technique_warmups')
  const [announcement, setAnnouncement] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdBlocks, setCreatedBlocks] = useState<CatalogBlock[]>([])
  const [createPending, setCreatePending] = useState(false)
  const createPendingRef = useRef(false)
  const allBlocks = [...blocks, ...createdBlocks.filter((created) => !blocks.some((block) => block.key === created.key))]
  const categoryBlocks = allBlocks.filter((block) => categoryFor(block) === category)
  const selectedSet = new Set(selectedKeys)
  const blockLabel = (block: CatalogBlock) => catalogBlockLabel(block, t)

  useEffect(() => {
    const wasBlocksStep = previousStep.current
    previousStep.current = blocksStep
    if (layout !== 'dialog' || window.matchMedia('(min-width: 640px)').matches) return
    if (blocksStep) panelRef.current?.focus()
    else if (wasBlocksStep) document.getElementById(`${instanceId}-${category}`)?.focus()
  }, [blocksStep, category, instanceId, layout])

  useEffect(() => {
    const gallery = galleryRef.current
    if (layout !== 'dialog' || !gallery) return
    const breakpoint = window.matchMedia('(min-width: 640px)')
    let lastFocused = document.activeElement instanceof HTMLElement && gallery.contains(document.activeElement)
      ? document.activeElement : null

    function rememberFocus(event: FocusEvent) {
      if (event.target instanceof HTMLElement) lastFocused = event.target
    }

    function forgetFocus(event: FocusEvent) {
      if (event.relatedTarget instanceof Node || (event.target instanceof HTMLElement && event.target.getClientRects().length > 0)) {
        lastFocused = null
      }
    }

    function transferHiddenFocus() {
      if (!gallery || !gallery.closest('dialog')?.matches(':modal')) return
      const active = document.activeElement
      const focused = active instanceof HTMLElement && gallery.contains(active)
        ? active : active === document.body ? lastFocused : null
      if (!focused || !gallery.contains(focused) || focused.getClientRects().length > 0) return
      const target = breakpoint.matches || blocksStep
        ? panelRef.current : document.getElementById(`${instanceId}-${category}`)
      if (target?.getClientRects().length) target.focus({ preventScroll: true })
    }

    gallery.addEventListener('focusin', rememberFocus)
    gallery.addEventListener('focusout', forgetFocus)
    breakpoint.addEventListener('change', transferHiddenFocus)
    return () => {
      gallery.removeEventListener('focusin', rememberFocus)
      gallery.removeEventListener('focusout', forgetFocus)
      breakpoint.removeEventListener('change', transferHiddenFocus)
    }
  }, [blocksStep, category, instanceId, layout])

  function selectCategory(next: string, focus = false) {
    setCategory(next)
    const selected = categories.find((item) => item.key === next)
    const count = allBlocks.filter((block) => categoryFor(block) === next).length
    setAnnouncement(t('{category}: {count} blocks', { category: selected ? t(selected.label) : '', count }))
    if (focus) document.getElementById(`${instanceId}-${next}`)?.focus()
  }

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = categories.findIndex((item) => item.key === category)
    let nextIndex = index
    const vertical = layout === 'dialog'
    if (event.key === (vertical ? 'ArrowDown' : 'ArrowRight')) nextIndex = (index + 1) % categories.length
    else if (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) nextIndex = (index - 1 + categories.length) % categories.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = categories.length - 1
    else return
    event.preventDefault()
    selectCategory(categories[nextIndex].key, true)
  }

  async function createOther() {
    const label = customLabel.trim()
    if (!label || !onCreateOther || creating || createPendingRef.current) return
    createPendingRef.current = true
    setCreatePending(true)
    setCreateError(null)
    try {
      const created = await onCreateOther(label)
      setCreatedBlocks((current) => current.some((block) => block.key === created.key) ? current : [...current, created])
      setCustomLabel('')
      setAnnouncement(t('Created {label}. Choose it to add.', { label: blockLabel(created) }))
    } catch (creationError) {
      setCreateError(creationError instanceof Error ? creationError.message : t('Could not create the block.'))
    } finally {
      createPendingRef.current = false
      setCreatePending(false)
    }
  }

  return (
    <div ref={galleryRef} className={layout === 'dialog' ? 'picker-gallery' : 'space-y-3'} data-step={blocksStep ? 'blocks' : 'categories'}>
      <div role="tablist" aria-orientation={layout === 'dialog' ? 'vertical' : 'horizontal'} aria-label={t('Block categories')} className={layout === 'dialog' ? 'picker-categories flex min-w-0 flex-col gap-2' : 'flex gap-2 overflow-x-auto pb-1'}>
        {categories.map((item) => (
          <button
            key={item.key}
            id={`${instanceId}-${item.key}`}
            type="button"
            role="tab"
            aria-selected={category === item.key}
            aria-controls={panelId}
            tabIndex={category === item.key ? 0 : -1}
            data-category-key={item.key}
            onClick={() => { selectCategory(item.key); if (layout === 'dialog') setBlocksStep(true) }}
            onKeyDown={handleCategoryKeyDown}
            className={`min-h-11 ${layout === 'dialog' ? 'w-full break-words py-2 text-left' : 'max-w-[75vw]'} shrink-0 rounded border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${category === item.key ? 'border-sky-400 bg-sky-400/15 text-sky-100' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div ref={panelRef} tabIndex={0} id={panelId} role="tabpanel" aria-labelledby={`${instanceId}-${category}`} className={layout === 'dialog' ? 'picker-blocks min-w-0' : undefined}>
        {layout === 'dialog' && <div className="mb-3 flex min-w-0 items-center gap-2 sm:hidden">
          <button type="button" onClick={() => setBlocksStep(false)} title={t('Block categories')} aria-label={t('Block categories')} className="icon-btn">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
          </button>
          <span className="min-w-0 break-words text-sm font-medium">{t(categories.find(item => item.key === category)?.label ?? 'Block categories')}</span>
        </div>}
        {loading && <p role="status" className="state py-3">{t('Loading blocks…')}</p>}
        {!loading && error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 py-2">
            <p className="msg-error">{error}</p>
            {onRetry && <button type="button" onClick={onRetry} className="btn btn-secondary">{t('Retry')}</button>}
          </div>
        )}
        {!loading && !error && categoryBlocks.length === 0 && (
          <p className="state py-3">{t('No blocks in this category.')}</p>
        )}
        {!loading && !error && categoryBlocks.length > 0 && (
          <div aria-label={t('Blocks in category')} className={layout === 'dialog' ? 'flex min-w-0 flex-col gap-2 p-1' : 'flex gap-2 overflow-x-auto p-1'}>
            {categoryBlocks.map((block) => {
              const selected = selectedSet.has(block.key)
              const disabled = selectionBehavior === 'add' && selected
              return (
                <button
                  key={block.key}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => {
                    onSelect(block)
                    setAnnouncement(t('{label} selected', { label: blockLabel(block) }))
                  }}
                  className={`min-h-12 ${layout === 'dialog' ? 'w-full min-w-0 break-words py-3' : 'max-w-[80vw]'} shrink-0 rounded border px-4 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-950 text-slate-100 hover:border-sky-500'}`}
                >
                  {blockLabel(block)}{selected && <span className="sr-only"> · {t('Selected')}</span>}
                </button>
              )
            })}
          </div>
        )}
        {!loading && !error && category === 'other' && onCreateOther && (
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t('Custom block name')}</span>
              <input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                maxLength={80}
                disabled={creating || createPending}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); void createOther() } }}
                className="field min-h-11"
                placeholder={t('Create a custom block')}
              />
            </label>
            <button type="button" onClick={() => { void createOther() }} disabled={!customLabel.trim() || creating || createPending} className="btn btn-secondary min-h-11 break-words">
              {creating || createPending ? t('Creating…') : t('Create block')}
            </button>
            {createError && <p role="alert" className="msg-error basis-full">{createError}</p>}
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  )
}