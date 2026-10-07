import { useState, type KeyboardEvent, type FormEvent } from 'react'
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
}: BlockGalleryProps) {
  const { t } = useI18n()
  const [category, setCategory] = useState<string>('technique_warmups')
  const [announcement, setAnnouncement] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdBlocks, setCreatedBlocks] = useState<CatalogBlock[]>([])
  const allBlocks = [...blocks, ...createdBlocks.filter((created) => !blocks.some((block) => block.key === created.key))]
  const categoryBlocks = allBlocks.filter((block) => categoryFor(block) === category)
  const selectedSet = new Set(selectedKeys)
  const blockLabel = (block: CatalogBlock) => catalogBlockLabel(block, t)

  function selectCategory(next: string, focus = false) {
    setCategory(next)
    const selected = categories.find((item) => item.key === next)
    const count = allBlocks.filter((block) => categoryFor(block) === next).length
    setAnnouncement(t('{category}: {count} blocks', { category: selected ? t(selected.label) : '', count }))
    if (focus) document.getElementById(`block-category-${next}`)?.focus()
  }

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = categories.findIndex((item) => item.key === category)
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % categories.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + categories.length) % categories.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = categories.length - 1
    else return
    event.preventDefault()
    selectCategory(categories[nextIndex].key, true)
  }

  async function createOther(event: FormEvent) {
    event.preventDefault()
    const label = customLabel.trim()
    if (!label || !onCreateOther) return
    setCreateError(null)
    try {
      const created = await onCreateOther(label)
      setCreatedBlocks((current) => current.some((block) => block.key === created.key) ? current : [...current, created])
      setCustomLabel('')
      setAnnouncement(t('Created {label}. Choose it to add.', { label: blockLabel(created) }))
    } catch (creationError) {
      setCreateError(creationError instanceof Error ? creationError.message : t('Could not create the block.'))
    }
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={t('Block categories')} className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <button
            key={item.key}
            id={`block-category-${item.key}`}
            type="button"
            role="tab"
            aria-selected={category === item.key}
            aria-controls="block-category-panel"
            tabIndex={category === item.key ? 0 : -1}
            data-category-key={item.key}
            onClick={() => selectCategory(item.key)}
            onKeyDown={handleCategoryKeyDown}
            className={`min-h-11 max-w-[75vw] shrink-0 rounded border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${category === item.key ? 'border-sky-400 bg-sky-400/15 text-sky-100' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div id="block-category-panel" role="tabpanel" aria-labelledby={`block-category-${category}`}>
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
          <div aria-label={t('Blocks in category')} className="flex gap-2 overflow-x-auto pb-1">
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
                  className={`min-h-12 max-w-[80vw] shrink-0 rounded border px-4 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-950 text-slate-100 hover:border-sky-500'}`}
                >
                  {blockLabel(block)}{selected && <span className="sr-only"> · {t('Selected')}</span>}
                </button>
              )
            })}
          </div>
        )}
        {!loading && !error && category === 'other' && onCreateOther && (
          <form onSubmit={(event) => { void createOther(event) }} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t('Custom block name')}</span>
              <input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                maxLength={80}
                className="field min-h-11"
                placeholder={t('Create a custom block')}
              />
            </label>
            <button type="submit" disabled={!customLabel.trim() || creating} className="btn btn-secondary min-h-11 shrink-0">
              {creating ? t('Creating…') : t('Create block')}
            </button>
            {createError && <p role="alert" className="msg-error basis-full">{createError}</p>}
          </form>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  )
}