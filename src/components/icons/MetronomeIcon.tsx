export default function MetronomeIcon({ className = 'h-7 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 473 649" aria-hidden="true" focusable="false" className={className}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M140 28H300L425 622H25Z" strokeWidth="40" />
        <path d="M46 540H402" strokeWidth="34" />
        <path d="M150 540A75 75 0 0 1 300 540" strokeWidth="34" />
        <path d="M105 540V588H345V540" strokeWidth="28" />
        <path d="M225 100V470" strokeWidth="34" />
        <path d="M175 160H275M175 245H275M175 330H275M175 415H275" strokeWidth="28" />
        <path d="M305 440L408 188" strokeWidth="34" />
        <path d="M428 98L442 56" strokeWidth="34" />
      </g>
      <circle cx="420" cy="140" r="52" fill="currentColor" />
    </svg>
  )
}
