import { normalizeBlockLabel } from './blockLabels'

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

export function isPracticedSessionBlock(block: Pick<SessionBlockSaveInput, 'done' | 'elapsedSeconds' | 'actualMinutes'>) {
  const minutes = sessionBlockMinutes(block)
  return block.done || (minutes != null && minutes > 0)
}

// Only practiced blocks are persisted; untouched pre-filled blocks stay editor-only.
export function selectPracticedSessionBlocks<T extends Pick<SessionBlockSaveInput, 'done' | 'elapsedSeconds' | 'actualMinutes'>>(blocks: readonly T[]): T[] {
  return blocks.filter(isPracticedSessionBlock)
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
      label: normalizeBlockLabel(block.label),
      done: block.done,
      target_minutes: block.targetMinutes,
      actual_minutes: sessionBlockMinutes(block),
    })),
    blockKeysToKeep: selectedBlocks.map((block) => block.key),
  }
}