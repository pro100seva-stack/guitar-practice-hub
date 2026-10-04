type SessionBlockSaveInput = {
  key: string
  label: string
  done: boolean
  targetMinutes: number | null
  actualMinutes: string
  elapsedSeconds?: number
}

export function planSessionBlockSave(sessionId: string, selectedBlocks: SessionBlockSaveInput[]) {
  return {
    upserts: selectedBlocks.map((block) => ({
      session_id: sessionId,
      block_key: block.key,
      label: block.label,
      done: block.done,
      target_minutes: block.targetMinutes,
      actual_minutes: block.elapsedSeconds
        ? Math.max(1, Math.ceil(block.elapsedSeconds / 60))
        : block.actualMinutes ? Number(block.actualMinutes) : null,
    })),
    blockKeysToKeep: selectedBlocks.map((block) => block.key),
  }
}