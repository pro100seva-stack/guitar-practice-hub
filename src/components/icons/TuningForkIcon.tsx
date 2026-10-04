export default function TuningForkIcon({ className = 'h-7 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="150 0 1300 1600" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="currentColor"
        d="M640 129A64 64 0 0 1 768 129V958A32 32 0 0 0 832 958V129A64 64 0 0 1 960 129V960A160 160 0 0 1 864 1110V1370H736V1110A160 160 0 0 1 640 960Z"
      />
      <circle cx="800" cy="1440" r="96" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="90" strokeLinecap="round">
        <path d="M420 270A340 340 0 0 0 420 880M540 400A190 190 0 0 0 540 750" />
        <path d="M1180 270A340 340 0 0 1 1180 880M1060 400A190 190 0 0 1 1060 750" />
      </g>
    </svg>
  )
}
