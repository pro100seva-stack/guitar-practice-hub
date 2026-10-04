import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteLocalMaterial, listLocalMaterials, saveLocalMaterial, type LocalMaterial } from '../src/lib/localMaterials'
import { createRequestTracker, findActiveMaterial, removeBlockMaterial, setBlockMaterials, updateBlockMaterial } from '../src/lib/materialScope'

function material(id: string, blockKey: string): LocalMaterial {
  return { id, blockKey, name: id, type: 'text/uri-list', size: 0, source: 'url', url: `https://example.com/${id}`, createdAt: '2026-01-01T00:00:00Z' }
}

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
})

type Row = Record<string, unknown> & { id: string }

function installFakeIndexedDb() {
  const rows = new Map<string, Row>()
  const succeed = <T,>(result: T) => {
    const request: { result: T; error: null; onsuccess?: () => void; onerror?: () => void } = { result, error: null }
    queueMicrotask(() => request.onsuccess?.())
    return request
  }
  const store = {
    put: (row: Row) => { rows.set(row.id, row); return succeed(undefined) },
    getAll: () => succeed([...rows.values()]),
    delete: (id: string) => { rows.delete(id); return succeed(undefined) },
  }
  const database = {
    createObjectStore: () => store,
    transaction: () => ({ objectStore: () => store }),
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
  return () => { delete globals.indexedDB; delete globals.window }
}

describe('localMaterials block scoping (in-memory IndexedDB fake)', () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = installFakeIndexedDb() })
  afterEach(() => cleanup())

  it('lists only the materials saved under the requested block key', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await saveLocalMaterial(material('l1', 'learning'))
    await saveLocalMaterial(material('w2', 'warmup'))
    expect((await listLocalMaterials('warmup')).map((item) => item.id).sort()).toEqual(['w1', 'w2'])
    expect((await listLocalMaterials('learning')).map((item) => item.id)).toEqual(['l1'])
    expect(await listLocalMaterials('rhythm')).toEqual([])
  })

  it('deletes by id without touching other blocks', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await saveLocalMaterial(material('l1', 'learning'))
    await deleteLocalMaterial('w1')
    expect(await listLocalMaterials('warmup')).toEqual([])
    expect(await listLocalMaterials('learning')).toHaveLength(1)
  })
})
