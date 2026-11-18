import { readFileSync } from 'node:fs'
import { ScriptTarget, transpileModule } from 'typescript'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
const start = source.indexOf('  async function saveMaterialLoops(')
const code = transpileModule(source.slice(start, source.indexOf('  function getExternalMediaKind(', start)), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
const regions = [{ id: 'phrase-one', name: 'Lick', start: 7, end: 9.25, color: 2, order: 0 }]

function fixture(persist = async () => ({ loops: regions })) {
  const access = {}
  const patch = vi.fn(persist)
  const setMaterialsByBlock = vi.fn()
  const updateBlockMaterial = vi.fn((state) => state)
  const context = {
    captureMaterialAccess: () => access,
    localMaterialScopeKey: (_block: string, song?: string) => song ? `song:${song}` : _block,
    materialNavigationRef: { current: 3 }, materialsMountedRef: { current: true },
    materialsRequestTrackerRef: { current: { begin: vi.fn() } },
    patchLocalMaterialMetadata: patch, isLocalMaterialAccessCurrent: vi.fn(() => true),
    synchronizeYoutubeMaterials: vi.fn(),
    setMaterialsByBlock, updateBlockMaterial,
  }
  const create = new Function(...Object.keys(context), `${code}; return saveMaterialLoops;`) as (...args: unknown[]) => (block: string, id: string, next: typeof regions, song?: string) => Promise<void>
  return { save: create(...Object.values(context)), patch, access, context, setMaterialsByBlock, updateBlockMaterial }
}

describe('loop persistence from the selected material', () => {
  it('patches only loops for the owned material and updates the canonical song scope', async () => {
    const item = fixture()
    await item.save('repertoire', 'video-one', regions, 'song-one')
    expect(item.patch).toHaveBeenCalledWith(item.access, { id: 'video-one', blockKey: 'repertoire', songId: 'song-one' }, { loops: regions })
    const update = item.setMaterialsByBlock.mock.calls[0][0]
    update({})
    expect(item.updateBlockMaterial).toHaveBeenCalledWith({}, 'song:song-one', 'video-one', { loops: regions })
    expect(item.context.synchronizeYoutubeMaterials).toHaveBeenCalledWith(item.access)
  })

  it('keeps a failed write retryable without pretending the UI was saved', async () => {
    const failure = new Error('Storage unavailable')
    const item = fixture(async () => { throw failure })
    await expect(item.save('technique', 'video-one', regions)).rejects.toBe(failure)
    expect(item.setMaterialsByBlock).not.toHaveBeenCalled()
  })

  it.each(['navigation', 'account', 'unmount'])('rejects a late %s result without updating a different view', async (change) => {
    let complete!: (value: { loops: typeof regions }) => void
    const item = fixture(() => new Promise((resolve) => { complete = resolve }))
    const saved = item.save('technique', 'video-one', regions)
    if (change === 'navigation') item.context.materialNavigationRef.current++
    if (change === 'account') item.context.isLocalMaterialAccessCurrent.mockReturnValue(false)
    if (change === 'unmount') item.context.materialsMountedRef.current = false
    complete({ loops: regions })
    await expect(saved).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    expect(item.setMaterialsByBlock).not.toHaveBeenCalled()
  })
})
