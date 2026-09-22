import { useNavigate } from 'react-router'

const journey = [
  { label: 'Week 1', status: 'completed', color: 'emerald' },
  { label: 'Week 2', status: 'completed', color: 'emerald' },
  { label: 'Week 3', status: 'current', color: 'sky' },
  { label: 'Week 4', status: 'upcoming', color: 'amber' },
  { label: 'Week 5', status: 'upcoming', color: 'amber' },
]

export default function Progress() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Progress</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Practice journey</h1>
        <p className="mt-2 text-sm text-slate-300">
          A tree-style overview of where you are, what you have done, and what is coming next.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="space-y-4">
          {journey.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                item.status === 'completed' && 'bg-emerald-500/20 text-emerald-200',
                item.status === 'current' && 'bg-sky-500/20 text-sky-200',
                item.status === 'upcoming' && 'bg-amber-500/20 text-amber-200',
              ].join(' ')}>
                {item.status === 'completed' ? '✓' : item.status === 'current' ? '•' : '○'}
              </div>

              <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-200">{item.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{item.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/plan')}
          className="rounded-xl border border-violet-700/60 bg-violet-500/10 px-4 py-3 text-left text-violet-100 transition hover:border-violet-500"
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-violet-200/70">Action</p>
          <h2 className="mt-2 text-lg font-semibold">Open plan</h2>
        </button>

        <button
          type="button"
          onClick={() => navigate('/stats')}
          className="rounded-xl border border-amber-700/60 bg-amber-500/10 px-4 py-3 text-left text-amber-100 transition hover:border-amber-500"
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/70">Action</p>
          <h2 className="mt-2 text-lg font-semibold">View stats</h2>
        </button>
      </section>
    </div>
  )
}
