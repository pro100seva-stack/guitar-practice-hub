import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDefaultMaterials } from '../src/lib/defaultMaterials'
import { deleteLocalMaterial, listLocalMaterials, loadLocalMaterialBlob, patchLocalMaterialMetadata, normalizeBookmarks, saveLocalMaterial, type LocalMaterial } from '../src/lib/localMaterials'
import { closeDeletedMaterial, createRequestTracker, findActiveMaterial, removeBlockMaterial, setBlockMaterials, updateBlockMaterial, type ActiveMaterial } from '../src/lib/materialScope'

function material(id: string, blockKey: string): LocalMaterial {
  return { id, blockKey, name: id, type: 'text/uri-list', size: 0, source: 'url', url: `https://example.com/${id}`, createdAt: '2026-01-01T00:00:00Z' }
}

describe('default warm-up materials', () => {
  it('shows the supplied warm-up references under Chromatic in every language', () => {
    for (const language of ['en', 'ru', 'it', 'fr'] as const) {
      expect(getDefaultMaterials(language, 'warmup')).toEqual([])
      expect(getDefaultMaterials(language, 'chromatic')[0].filePath).toBe('/default-exercises/chromatic/Warmup.pdf')
      expect(getDefaultMaterials(language, 'chromatic')).toHaveLength(2)
    }
  })
})

describe('materialScope', () => {
  it('keeps materials per block and drops foreign entries', () => {
    const state = setBlockMaterials({}, 'warmup', [material('a', 'warmup'), material('b', 'learning')])
    expect(state.warmup.map((item) => item.id)).toEqual(['a'])
    const next = setBlockMaterials(state, 'learning', [material('b', 'learning')])
    expect(next.warmup.map((item) => item.id)).toEqual(['a'])
    expect(next.learning.map((item) => item.id)).toEqual(['b'])
  })

  it('removes and updates only inside the owning block', () => {
    const state = { warmup: [material('a', 'warmup')], learning: [material('a2', 'learning')] }
    expect(removeBlockMaterial(state, 'warmup', 'a2').learning).toHaveLength(1)
    expect(removeBlockMaterial(state, 'warmup', 'a').warmup).toHaveLength(0)
    expect(updateBlockMaterial(state, 'learning', 'a', { bookmarks: [1] }).warmup[0].bookmarks).toBeUndefined()
    expect(updateBlockMaterial(state, 'warmup', 'a', { bookmarks: [1] }).warmup[0].bookmarks).toEqual([1])
  })

  it('resolves the active material only in its own block', () => {
    const state = { warmup: [material('a', 'warmup')], learning: [] }
    expect(findActiveMaterial(state, { blockKey: 'warmup', id: 'a' })?.id).toBe('a')
    expect(findActiveMaterial(state, { blockKey: 'learning', id: 'a' })).toBeNull()
    expect(findActiveMaterial(state, null)).toBeNull()
  })

  it('treats only the latest request per block as current', () => {
    const tracker = createRequestTracker()
    const first = tracker.begin('warmup')
    const other = tracker.begin('learning')
    const second = tracker.begin('warmup')
    expect(tracker.isCurrent('warmup', first)).toBe(false)
    expect(tracker.isCurrent('warmup', second)).toBe(true)
    expect(tracker.isCurrent('learning', other)).toBe(true)
  })

  it('drops a late load started during deletion after commit, without affecting another block', async () => {
    const tracker = createRequestTracker()
    let state = { warmup: [material('a', 'warmup')], learning: [material('b', 'learning')] }
    const commitDeletion = tracker.beginDeletion('warmup')
    const newerLoad = tracker.begin('warmup')
    const otherLoad = tracker.begin('learning')
    const oldRows = state.warmup
    let finishLoad: () => void = () => {}
    const load = new Promise<void>((resolve) => { finishLoad = resolve }).then(() => {
      if (tracker.isCurrent('warmup', newerLoad)) state = setBlockMaterials(state, 'warmup', oldRows)
    })
    commitDeletion()
    state = removeBlockMaterial(state, 'warmup', 'a')
    finishLoad()
    await load
    expect(state.warmup).toEqual([])
    expect(state.learning).toEqual([material('b', 'learning')])
    expect(tracker.isCurrent('learning', otherLoad)).toBe(true)
    const freshLoad = tracker.begin('warmup')
    expect(tracker.isCurrent('warmup', freshLoad)).toBe(true)
  })

  it('keeps the material visible and permits loads when deletion fails', async () => {
    const tracker = createRequestTracker()
    const state = { warmup: [material('a', 'warmup')] }
    const commitDeletion = tracker.beginDeletion('warmup')
    const pendingLoad = tracker.begin('warmup')
    await expect(Promise.reject(new Error('Delete failed')).then(commitDeletion)).rejects.toThrow('Delete failed')
    expect(tracker.isCurrent('warmup', pendingLoad)).toBe(true)
    expect(setBlockMaterials(state, 'warmup', state.warmup).warmup).toEqual([material('a', 'warmup')])
    expect(tracker.isCurrent('warmup', tracker.begin('warmup'))).toBe(true)
  })

  it('closes only the current deletion target after an async selection change', async () => {
    let active: ActiveMaterial | null = { blockKey: 'warmup', id: 'a' }
    let finishDelete: () => void = () => {}
    const deletion = new Promise<void>((resolve) => { finishDelete = resolve }).then(() => {
      active = closeDeletedMaterial(active, 'warmup', 'a')
    })
    const next = { blockKey: 'warmup', id: 'b' }
    active = next
    finishDelete()
    await deletion
    expect(active).toBe(next)
    const otherBlock = { blockKey: 'learning', id: 'a' }
    expect(closeDeletedMaterial(otherBlock, 'warmup', 'a')).toBe(otherBlock)
    expect(closeDeletedMaterial({ blockKey: 'warmup', id: 'a' }, 'warmup', 'a')).toBeNull()
    expect(closeDeletedMaterial(null, 'warmup', 'a')).toBeNull()
  })
})

type Row = Record<string, unknown> & { id: string }

function installFakeIndexedDb(initialRows: Row[] = []) {
  const rows = new Map(initialRows.map((row) => [row.id, row]))
  let previous = Promise.resolve()
  let holdCompletion = false
  const completions: (() => void)[] = []
  const database = {
    close: () => {},
    createObjectStore: () => {},
    transaction: () => {
      let pending = 0
      let aborted = false
      let completed = false
      const wait = previous
      let release: () => void = () => {}
      previous = new Promise<void>((resolve) => { release = resolve })
      const complete = () => {
        if (completed || pending) return
        completed = true
        const finish = () => {
          if (aborted) transaction.onabort?.()
          else transaction.oncomplete?.()
          release()
        }
        if (holdCompletion) completions.push(finish)
        else finish()
      }
      const transaction: { oncomplete?: () => void; onabort?: () => void; onerror?: () => void; objectStore: () => typeof store; abort: () => void } = {
        objectStore: () => store,
        abort: () => { aborted = true; queueMicrotask(complete) },
      }
      const request = <T,>(operation: () => T) => {
        pending++
        const result: { result?: T; error: null; onsuccess?: () => void; onerror?: () => void } = { error: null }
        void wait.then(() => {
          if (!aborted) {
            result.result = operation()
            result.onsuccess?.()
          }
          pending--
          queueMicrotask(complete)
        })
        return result
      }
      const store = {
        put: (row: Row) => request(() => { rows.set(row.id, row) }),
        get: (id: string) => request(() => rows.get(id)),
        getAll: () => request(() => [...rows.values()]),
        delete: (id: string) => request(() => { rows.delete(id) }),
      }
      return transaction
    },
  }
  const globals = globalThis as Record<string, unknown>
  globals.indexedDB = {
    open: () => {
      const request: { result: typeof database; error: null; onupgradeneeded?: () => void; onsuccess?: () => void } = { result: database, error: null }
      queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.() })
      return request
    },
  }
  globals.window = {}
  return {
    seed: (row: Row) => rows.set(row.id, row),
    snapshot: () => [...rows.values()],
    cleanup: () => { delete globals.indexedDB; delete globals.window },
    hold: () => { holdCompletion = true },
    finish: () => { holdCompletion = false; completions.splice(0).forEach((complete) => complete()) },
  }
}

describe('localMaterials block scoping (in-memory IndexedDB fake)', () => {
  let database: ReturnType<typeof installFakeIndexedDb>
  beforeEach(() => { database = installFakeIndexedDb() })
  afterEach(() => database.cleanup())

  it('moves warm-up materials to Chromatic once while keeping other blocks unchanged', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await saveLocalMaterial(material('l1', 'learning'))
    await saveLocalMaterial(material('w2', 'warmup'))
    expect(await listLocalMaterials('warmup')).toEqual([])
    expect((await listLocalMaterials('chromatic')).map((item) => item.id).sort()).toEqual(['w1', 'w2'])
    expect((await listLocalMaterials('learning')).map((item) => item.id)).toEqual(['l1'])
    expect(await listLocalMaterials('rhythm')).toEqual([])
  })

  it('waits for migration before returning a local blob and preserves its record metadata', async () => {
    const blob = new Blob(['unchanged bytes'], { type: 'application/pdf' })
    const legacy = {
      ...material('legacy-pdf', 'warmup'),
      name: 'Warm-up notes',
      type: 'application/pdf',
      size: blob.size,
      blob,
      bookmarks: [12.5],
      storage: 'indexeddb' as const,
    }
    const cached = {
      ...material('legacy-cache', 'warmup'),
      type: 'application/pdf',
      size: 42,
      source: 'file' as const,
      bookmarks: [4],
      storage: 'cache' as const,
    }
    database.seed(legacy)
    database.seed(cached)
    database.hold()

    let resolved = false
    const load = loadLocalMaterialBlob(legacy).then((result) => {
      resolved = true
      return result
    })
    for (let turn = 0; turn < 10; turn++) await Promise.resolve()
    expect(resolved).toBe(false)

    database.finish()
    expect(await load).toBe(blob)
    const migrated = await listLocalMaterials('chromatic')
    expect(migrated).toHaveLength(2)
    expect(migrated).toEqual(expect.arrayContaining([
      { ...legacy, blockKey: 'chromatic' },
      { ...cached, blockKey: 'chromatic' },
    ]))
    expect(await listLocalMaterials('warmup')).toEqual([])

    const persistedRows = database.snapshot()
    database.cleanup()
    database = installFakeIndexedDb(persistedRows)
    expect(await listLocalMaterials('chromatic')).toEqual(expect.arrayContaining([
      { ...legacy, blockKey: 'chromatic' },
      { ...cached, blockKey: 'chromatic' },
    ]))
  })

  it('isolates repertoire materials by song and keeps block-level materials separate', async () => {
    const firstSongMaterial = { ...material('song-one-file', 'repertoire'), songId: 'song-one' }
    const secondSongMaterial = { ...material('song-two-file', 'repertoire'), songId: 'song-two' }
    const blockMaterial = material('repertoire-reference', 'repertoire')
    await saveLocalMaterial(firstSongMaterial)
    await saveLocalMaterial(secondSongMaterial)
    await saveLocalMaterial(blockMaterial)

    expect(await listLocalMaterials('repertoire', 'song-one')).toEqual([firstSongMaterial])
    expect(await listLocalMaterials('repertoire', 'song-two')).toEqual([secondSongMaterial])
    expect(await listLocalMaterials('repertoire')).toEqual([blockMaterial])

    await patchLocalMaterialMetadata('song-one-file', 'repertoire', { name: 'Updated' }, 'song-one')
    expect(await listLocalMaterials('repertoire', 'song-one')).toEqual([{ ...firstSongMaterial, name: 'Updated' }])
    await expect(patchLocalMaterialMetadata('song-one-file', 'repertoire', { name: 'Leak' }, 'song-two')).rejects.toThrow()
    await deleteLocalMaterial('song-one-file', 'repertoire', 'song-two')
    expect(await listLocalMaterials('repertoire', 'song-one')).toEqual([{ ...firstSongMaterial, name: 'Updated' }])
    await deleteLocalMaterial('song-two-file', 'repertoire', 'song-two')
    expect(await listLocalMaterials('repertoire', 'song-one')).toHaveLength(1)
    expect(await listLocalMaterials('repertoire', 'song-two')).toEqual([])
    expect(await listLocalMaterials('repertoire')).toEqual([blockMaterial])
  })

  it('deletes by id without touching other blocks', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await saveLocalMaterial(material('l1', 'learning'))
    await deleteLocalMaterial('w1')
    expect(await listLocalMaterials('warmup')).toEqual([])
    expect(await listLocalMaterials('learning')).toHaveLength(1)
  })

  it('patches only metadata, trims names and preserves cached/blob fields', async () => {
    const original = { ...material('w1', 'warmup'), storage: 'indexeddb' as const, blob: new Blob(['data']), bookmarks: [12] }
    await saveLocalMaterial(original)
    await patchLocalMaterialMetadata('w1', 'chromatic', { name: '  My lesson  ' })
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...original, blockKey: 'chromatic', name: 'My lesson' }])
    await patchLocalMaterialMetadata('w1', 'chromatic', { bookmarks: [3.14, 3.11, 0, -1, NaN] })
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...original, blockKey: 'chromatic', name: 'My lesson', bookmarks: [0, 3.1] }])
    await expect(patchLocalMaterialMetadata('w1', 'warmup', { name: '  ' })).rejects.toThrow()
  })

  it('does not recreate deleted or foreign-block records', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await expect(patchLocalMaterialMetadata('w1', 'learning', { name: 'Wrong' })).rejects.toThrow()
    await deleteLocalMaterial('w1')
    await expect(patchLocalMaterialMetadata('w1', 'warmup', { bookmarks: [1] })).rejects.toThrow()
    expect(await listLocalMaterials('warmup')).toEqual([])
  })

  it('preserves another metadata field when updates overlap', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await Promise.all([
      patchLocalMaterialMetadata('w1', 'chromatic', { name: 'Renamed' }),
      patchLocalMaterialMetadata('w1', 'chromatic', { bookmarks: [5] }),
    ])
    expect((await listLocalMaterials('chromatic'))[0]).toMatchObject({ name: 'Renamed', bookmarks: [5] })
  })

  it('normalizes finite nonnegative bookmarks to tenths', () => {
    expect(normalizeBookmarks([2.26, 1, 2.3, Infinity, -1, NaN])).toEqual([1, 2.3])
    expect(normalizeBookmarks([1e308])).toEqual([1e308])
  })

  it('resolves only after transaction completion, not after put success', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await Promise.resolve()
    database.hold()
    let resolved = false
    const update = patchLocalMaterialMetadata('w1', 'chromatic', { name: 'Committed' }).then(() => { resolved = true })
    for (let turn = 0; turn < 10; turn++) await Promise.resolve()
    expect(resolved).toBe(false)
    database.finish()
    await update
    expect(resolved).toBe(true)
  })

  it('rejects metadata updates queued behind deletion without resurrection', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    const results = await Promise.allSettled([
      deleteLocalMaterial('w1'),
      patchLocalMaterialMetadata('w1', 'warmup', { name: 'Too late' }),
    ])
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(await listLocalMaterials('warmup')).toEqual([])
  })

  it('ignores fields outside the metadata allowlist and leaves cached storage untouched', async () => {
    const original = { ...material('w1', 'warmup'), storage: 'cache' as const, bookmarks: [3] }
    await saveLocalMaterial(original)
    const patch = { name: 'Renamed cache', url: 'https://evil.test', id: 'other', blockKey: 'other', storage: 'indexeddb' }
    await patchLocalMaterialMetadata('w1', 'chromatic', patch)
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...original, blockKey: 'chromatic', name: 'Renamed cache' }])
  })
})
