export default function RemoveBlockIcon() {
  return (
    <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 transition hover:bg-rose-400">
      <span className="relative block h-2.5 w-2.5">
        <span className="absolute left-1/2 top-1/2 h-0.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-slate-950" />
        <span className="absolute left-1/2 top-1/2 h-0.5 w-2.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-slate-950" />
      </span>
    </span>
  )
}