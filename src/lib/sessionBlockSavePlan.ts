type SessionBlockSaveInput = {
  key: string
  label: string
  done: boolean
  targetMinutes: number | null
  actualMinutes: string
  elapsedSeconds?: number
}

export function sessionBlockMinutes(block: Pick<SessionBlockSaveInput, 'elapsedSeconds' | 'actualMinutes'>): number | null {
  return block.elapsedSeconds
    ? Math.round(block.elapsedSeconds / 60)
    : block.actualMinutes ? Number(block.actualMinutes) : null
}

export function hasUnsupportedSessionBlocks(
  savedBlocks: readonly { block_key: string }[],
  templates: readonly { key: string }[],
) {
  const templateKeys = new Set(templates.map((template) => template.key))
  return savedBlocks.some((block) => !templateKeys.has(block.block_key))
}

export function planSessionBlockSave(sessionId: string, selectedBlocks: SessionBlockSaveInput[]) {
  return {
    upserts: selectedBlocks.map((block) => ({
      session_id: sessionId,
      block_key: block.key,
      label: block.label,
      done: block.done,
      target_minutes: block.targetMinutes,
      actual_minutes: sessionBlockMinutes(block),
    })),
    blockKeysToKeep: selectedBlocks.map((block) => block.key),
  }
}