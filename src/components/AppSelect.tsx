import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import './AppSelect.css'

export type AppSelectOption = { value: string; label: string; disabled?: boolean; className?: string }

type Props = {
  value: string
  options: readonly AppSelectOption[]
  onValueChange: (value: string, trigger: HTMLButtonElement) => void
  disabled?: boolean
  id?: string
  className?: string
  title?: string
  name?: string
  required?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

type PopupPosition = { top: number; left: number; width: number; maxHeight: number; fontFamily: string }

export default function AppSelect({ value, options, onValueChange, disabled = false, id, className = '', title, name, required, ...accessible }: Props) {
  const generatedId = useId()
  const triggerId = id ?? `app-select-${generatedId}`
  const listboxId = `${triggerId}-listbox`
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<PopupPosition | null>(null)
  const [invalid, setInvalid] = useState(false)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const enabledIndices = useMemo(() => options.flatMap((option, index) => option.disabled ? [] : [index]), [options])

  function openPopup(index = selectedIndex) {
    if (disabled || enabledIndices.length === 0) return
    searchRef.current = { text: '', time: 0 }
    setActiveIndex(index >= 0 && !options[index]?.disabled ? index : enabledIndices[0])
    setPosition(null)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    const trigger = triggerRef.current
    if (disabled || !option || option.disabled || !trigger) return
    setOpen(false)
    setInvalid(false)
    if (option.value !== value) onValueChange(option.value, trigger)
    trigger.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (open && (disabled || enabledIndices.length === 0)) setOpen(false)
    else if (open && (!options[activeIndex] || options[activeIndex].disabled)) setActiveIndex(enabledIndices[0] ?? -1)
  }, [open, disabled, options, activeIndex, enabledIndices])

  useLayoutEffect(() => {
    if (!open) return
    function updatePosition() {
      const trigger = triggerRef.current
      const popup = popupRef.current
      if (!trigger || !popup) return
      const anchor = trigger.getBoundingClientRect()
      const viewport = window.visualViewport
      const viewportTop = viewport?.offsetTop ?? 0
      const viewportLeft = viewport?.offsetLeft ?? 0
      const viewportWidth = viewport?.width ?? window.innerWidth
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight)
      const below = Math.max(0, viewportBottom - anchor.bottom - 14)
      const above = Math.max(0, anchor.top - viewportTop - 14)
      const placeAbove = below < 180 && above > below
      const maxHeight = Math.min(320, Math.max(44, placeAbove ? above : below))
      const height = Math.min(popup.scrollHeight, maxHeight)
      const width = Math.min(Math.max(anchor.width, 192), viewportWidth - 16)
      const next: PopupPosition = {
        left: Math.max(viewportLeft + 8, Math.min(anchor.left, viewportLeft + viewportWidth - width - 8)),
        top: Math.max(viewportTop + 8, Math.min(placeAbove ? anchor.top - height - 6 : anchor.bottom + 6, viewportBottom - height - 8)),
        width,
        maxHeight,
        fontFamily: window.getComputedStyle(trigger).fontFamily,
      }
      setPosition((current) => current && Object.keys(next).every((key) => current[key as keyof PopupPosition] === next[key as keyof PopupPosition]) ? current : next)
    }
    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    if (popupRef.current) observer.observe(popupRef.current)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.visualViewport?.addEventListener('resize', updatePosition)
    window.visualViewport?.addEventListener('scroll', updatePosition)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.visualViewport?.removeEventListener('resize', updatePosition)
      window.visualViewport?.removeEventListener('scroll', updatePosition)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    function handleOutside(event: PointerEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside, true)
    return () => document.removeEventListener('pointerdown', handleOutside, true)
  }, [open])

  useLayoutEffect(() => {
    if (!open || activeIndex < 0) return
    const popup = popupRef.current
    const option = document.getElementById(`${listboxId}-option-${activeIndex}`)
    if (!popup || !option) return
    if (option.offsetTop < popup.scrollTop) popup.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > popup.scrollTop + popup.clientHeight) popup.scrollTop = option.offsetTop + option.offsetHeight - popup.clientHeight
  }, [open, activeIndex, listboxId, position])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false) }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(activeIndex)
      else openPopup()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { openPopup(); return }
      const current = enabledIndices.indexOf(activeIndex)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(enabledIndices[(current + direction + enabledIndices.length) % enabledIndices.length] ?? -1)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const index = event.key === 'Home' ? enabledIndices[0] : enabledIndices.at(-1)
      if (index === undefined) return
      if (open) setActiveIndex(index)
      else openPopup(index)
      return
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    const now = Date.now()
    const text = (now - searchRef.current.time < 700 ? searchRef.current.text : '') + event.key.toLocaleLowerCase()
    searchRef.current = { text, time: now }
    const query = [...text].every((letter) => letter === text[0]) ? text[0] : text
    const start = open ? activeIndex : selectedIndex
    const indices = query.length > 1 && open
      ? [...enabledIndices.filter((index) => index >= start), ...enabledIndices.filter((index) => index < start)]
      : [...enabledIndices.filter((index) => index > start), ...enabledIndices.filter((index) => index <= start)]
    const match = indices.find((index) => options[index].label.toLocaleLowerCase().startsWith(query))
    if (match !== undefined) {
      if (open) setActiveIndex(match)
      else { openPopup(match); searchRef.current = { text, time: now } }
    }
  }

  return <>
    <button
      ref={triggerRef}
      id={triggerId}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
      aria-required={required || undefined}
      aria-invalid={invalid && !value || undefined}
      {...accessible}
      disabled={disabled}
      title={title}
      className={`app-select-trigger ${className}`}
      onClick={() => { if (open) setOpen(false); else openPopup() }}
      onKeyDown={handleKeyDown}
      onBlur={(event) => { if (!popupRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false) }}
    >
      <span className="app-select-value">{options[selectedIndex]?.label ?? ''}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="app-select-chevron" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 7.5 5 5 5-5" /></svg>
    </button>
    {(required || name) && <input
      type="text"
      className="app-select-validation"
      tabIndex={-1}
      aria-hidden="true"
      autoComplete="off"
      name={name}
      value={value}
      disabled={disabled}
      required={required}
      onChange={() => undefined}
      onInvalid={(event) => { event.preventDefault(); setInvalid(true); triggerRef.current?.focus({ preventScroll: true }); openPopup() }}
    />}
    {open && createPortal(<div
      ref={popupRef}
      id={listboxId}
      role="listbox"
      aria-label={accessible['aria-label']}
      aria-labelledby={accessible['aria-labelledby'] ?? triggerId}
      className="app-select-popup"
      data-app-select-trigger={triggerId}
      style={position ? { ...position, visibility: 'visible' } : { visibility: 'hidden' }}
    >
      {options.map((option, index) => <div
        key={`${option.value}-${index}`}
        id={`${listboxId}-option-${index}`}
        role="option"
        aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined}
        className={`app-select-option${activeIndex === index ? ' app-select-option-active' : ''} ${option.className ?? ''}`}
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={(event) => { if (event.pointerType !== 'touch' && !option.disabled) setActiveIndex(index) }}
        onClick={(event) => { event.preventDefault(); choose(index) }}
      >
        <span>{option.label}</span>
        {option.value === value && <svg aria-hidden="true" viewBox="0 0 20 20" className="app-select-check" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 4 4 8-8" /></svg>}
      </div>)}
    </div>, document.body)}
  </>
}
