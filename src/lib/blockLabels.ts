export function normalizeBlockLabel(label: string): string {
  switch (label.trim().toLowerCase()) {
    case 'warmup':
    case 'warm-up':
      return 'Warm-up'
    case 'evening practice':
      return 'Evening Practice'
    case 'hand./impr.':
    case 'harm./improv.':
      return 'Harm./Improv.'
    default:
      return label
  }
}

type BlockMinutesSession = {
  total_minutes: number | null
  session_blocks: Array<{
    label: string | null
    block_key: string
    done: boolean
    actual_minutes: number | null
  }> | null
}

// A block counts as practiced when it has minutes or is marked done (item 60 rule).
export function countedSessionBlocks<T extends { done: boolean; actual_minutes: number | null }>(blocks: readonly T[] | null): T[] {
  return (blocks ?? []).filter((block) => block.done || Number(block.actual_minutes ?? 0) > 0)
}

export function aggregateSessionBlockMinutes(sessions: readonly BlockMinutesSession[]): Map<string, number> {
  const pieMap = new Map<string, number>()
  for (const session of sessions) {
    const countedBlocks = countedSessionBlocks(session.session_blocks)
    if (countedBlocks.length === 0) continue

    const explicitMinutes = countedBlocks.reduce(
      (sum, block) => sum + Number(block.actual_minutes ?? 0),
      0
    )
    const perBlockFallback =
      explicitMinutes > 0 ? null : Number(session.total_minutes ?? 0) / countedBlocks.length

    for (const block of countedBlocks) {
      const label = normalizeBlockLabel(block.label || block.block_key)
      const value =
        perBlockFallback !== null ? perBlockFallback : Number(block.actual_minutes ?? 0)
      pieMap.set(label, (pieMap.get(label) ?? 0) + value)
    }
  }
  return pieMap
}