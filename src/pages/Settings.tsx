export default function Settings() {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Preferences</h1>
        <p className="mt-2 text-sm text-slate-300">
          This screen is reserved for user preferences and app configuration toggles.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        {[
          'Enable habit reminders',
          'Show completed weeks in progress overview',
          'Keep plan notes collapsed by default',
          'Use compact practice cards',
        ].map((label) => (
          <label key={label} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-200">
            <span>{label}</span>
            <input type="checkbox" defaultChecked={label.includes('Enable') || label.includes('Show')} className="h-4 w-4 accent-sky-500" />
          </label>
        ))}
      </section>
    </div>
  )
}
