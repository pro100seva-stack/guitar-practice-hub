import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type Topic = Database['public']['Tables']['topics']['Row']
type Song = Database['public']['Tables']['songs']['Row']

type EditableTopic = {
  id: string | null
  name: string
  done: boolean
}

export default function Plan() {
  const [week, setWeek] = useState<PlanWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [focus, setFocus] = useState('')
  const [tasks, setTasks] = useState('')
  const [topics, setTopics] = useState<EditableTopic[]>([])
  const [songText, setSongText] = useState('')

  useEffect(() => {
    void loadWeek()
  }, [])

  async function loadWeek() {
    setLoading(true)
    setError(null)
    setMessage(null)

    const today = new Date().toISOString().slice(0, 10)
    const { data: weekData, error: weekError } = await supabase
      .from('plan_weeks')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle()

    if (weekError) {
      setError(weekError.message)
      setLoading(false)
      return
    }

    setWeek(weekData)
    setFocus(weekData?.focus ?? '')
    setTasks(weekData?.tasks ?? '')
    setTopics([])
    setSongText('')

    if (!weekData) {
      setLoading(false)
      return
    }

    const [{ data: topicsData, error: topicsError }, { data: weekSongsData, error: weekSongsError }] = await Promise.all([
      supabase
        .from('topics')
        .select('*')
        .eq('week_id', weekData.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('week_songs')
        .select('song_id, songs(*)')
        .eq('week_id', weekData.id),
    ])

    if (topicsError) {
      setError(topicsError.message)
      setLoading(false)
      return
    }

    if (weekSongsError) {
      setError(weekSongsError.message)
      setLoading(false)
      return
    }

    const loadedTopics = (topicsData ?? []).map((topic: Topic) => ({
      id: topic.id,
      name: topic.name,
      done: topic.done,
    }))

    const loadedSongs = ((weekSongsData ?? []) as Array<{ songs?: Song | null }>).flatMap((entry) => {
      const name = entry.songs?.name?.trim()
      return name ? [name] : []
    })

    setTopics(loadedTopics)
    setSongText(loadedSongs.join('\n'))
    setLoading(false)
  }

  function addTopic() {
    setTopics((current) => [...current, { id: null, name: '', done: false }])
  }

  function updateTopic(index: number, updates: Partial<EditableTopic>) {
    setTopics((current) => current.map((topic, topicIndex) => (topicIndex === index ? { ...topic, ...updates } : topic)))
  }

  function removeTopic(index: number) {
    setTopics((current) => current.filter((_, topicIndex) => topicIndex !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!week) return

    setSaving(true)
    setError(null)
    setMessage(null)

    const trimmedFocus = focus.trim()
    const trimmedTasks = tasks.trim() || null

    const { error: weekError } = await supabase
      .from('plan_weeks')
      .update({
        focus: trimmedFocus,
        tasks: trimmedTasks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', week.id)

    if (weekError) {
      setError(weekError.message)
      setSaving(false)
      return
    }

    const filteredTopics = topics.filter((topic) => topic.name.trim().length > 0)
    const { error: topicDeleteError } = await supabase.from('topics').delete().eq('week_id', week.id)

    if (topicDeleteError) {
      setError(topicDeleteError.message)
      setSaving(false)
      return
    }

    if (filteredTopics.length > 0) {
      const { error: topicInsertError } = await supabase.from('topics').insert(
        filteredTopics.map((topic, index) => ({
          week_id: week.id,
          name: topic.name.trim(),
          done: topic.done,
          sort_order: index + 1,
          source: 'app',
        }))
      )

      if (topicInsertError) {
        setError(topicInsertError.message)
        setSaving(false)
        return
      }
    }

    const songNames = Array.from(new Set(
      songText
        .split(/\n|,/) 
        .map((song) => song.trim())
        .filter(Boolean)
    ))

    const { data: existingSongs, error: existingSongsError } = await supabase.from('songs').select('*')
    if (existingSongsError) {
      setError(existingSongsError.message)
      setSaving(false)
      return
    }

    const songIdLookup = new Map<string, string>()
    for (const song of existingSongs ?? []) {
      songIdLookup.set(song.name.trim().toLowerCase(), song.id)
    }

    const songIds: string[] = []
    for (const songName of songNames) {
      const normalizedName = songName.toLowerCase()
      const existingSongId = songIdLookup.get(normalizedName)
      if (existingSongId) {
        songIds.push(existingSongId)
        continue
      }

      const { data: insertedSong, error: songInsertError } = await supabase
        .from('songs')
        .insert({
          name: songName,
          status: 'planned',
          notes: null,
          tuning: null,
        })
        .select()
        .single()

      if (songInsertError || !insertedSong) {
        setError(songInsertError?.message ?? 'Could not save the song list.')
        setSaving(false)
        return
      }

      songIdLookup.set(normalizedName, insertedSong.id)
      songIds.push(insertedSong.id)
    }

    const { error: weekSongDeleteError } = await supabase.from('week_songs').delete().eq('week_id', week.id)
    if (weekSongDeleteError) {
      setError(weekSongDeleteError.message)
      setSaving(false)
      return
    }

    if (songIds.length > 0) {
      const { error: weekSongInsertError } = await supabase.from('week_songs').insert(
        songIds.map((songId) => ({
          week_id: week.id,
          song_id: songId,
        }))
      )

      if (weekSongInsertError) {
        setError(weekSongInsertError.message)
        setSaving(false)
        return
      }
    }

    setMessage('Plan updated successfully.')
    setSaving(false)
    await loadWeek()
  }

  if (loading) return <p>Loading…</p>
  if (error) return <p className="text-red-400">Error: {error}</p>
  if (!week) return <p>No plan_weeks row covers today's date.</p>

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Current week</p>
            <h1 className="mt-1 text-xl font-semibold">Week {week.week_number}: {week.focus}</h1>
            <p className="mt-1 text-sm text-slate-400">{week.start_date} – {week.end_date} · {week.phase}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 lg:min-w-[240px]">
            <p className="text-xs uppercase tracking-wide text-slate-400">Plan status</p>
            <p className="mt-1 text-sm text-slate-200">Editable in-app</p>
            <p className="text-sm text-slate-400">Update the week focus, tasks, topics, and songs directly here.</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <label className="block space-y-2 text-sm">
          <span className="block text-slate-300">Focus</span>
          <input
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none ring-0 transition focus:border-slate-500"
            required
            placeholder="Short title for the week"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="block text-slate-300">Tasks</span>
          <textarea
            rows={8}
            value={tasks}
            onChange={(event) => setTasks(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none transition focus:border-slate-500"
            placeholder="Describe the week plan"
          />
        </label>

        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-200">Topics</p>
            <button
              type="button"
              onClick={addTopic}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
            >
              + Add topic
            </button>
          </div>

          <div className="space-y-2">
            {topics.length === 0 && <p className="text-sm text-slate-400">No topics yet for this week.</p>}

            {topics.map((topic, index) => (
              <div key={`${topic.id ?? 'new'}-${index}`} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={topic.done}
                  onChange={(event) => updateTopic(index, { done: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <input
                  value={topic.name}
                  onChange={(event) => updateTopic(index, { name: event.target.value })}
                  className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  placeholder="Topic name"
                />
                <button
                  type="button"
                  onClick={() => removeTopic(index)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="block text-slate-300">Songs</span>
          <textarea
            rows={6}
            value={songText}
            onChange={(event) => setSongText(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none transition focus:border-slate-500"
            placeholder="Add one song per line"
          />
          <span className="text-xs text-slate-400">Separate songs with line breaks or commas.</span>
        </label>

        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-100 px-3 py-2 font-medium text-slate-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </form>
    </div>
  )
}