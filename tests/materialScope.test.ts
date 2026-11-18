import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { getDefaultMaterials } from '../src/lib/defaultMaterials'
import { practiceKeyPools } from '../src/lib/practiceKey'
import * as localApi from '../src/lib/localMaterials'
import { normalizeBookmarks, type LocalMaterial, type OwnedLocalMaterial } from '../src/lib/localMaterials'
import type { LoopRegion } from '../src/lib/loopRegions'
import { captureLocalMaterialAccess, watchLocalMaterialIdentity, type LocalMaterialAccess } from '../src/lib/localMaterialAccess'
import { closeDeletedMaterial, createRequestTracker, findActiveMaterial, removeBlockMaterial, setBlockMaterials, updateBlockMaterial, type ActiveMaterial, type MaterialsByBlock } from '../src/lib/materialScope'

const auth = vi.hoisted(() => ({ change: (_event: string, _session: { user: { id: string }; access_token: string } | null) => {} }))
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (callback: typeof auth.change) => { auth.change = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } },
} } }))
let access: LocalMaterialAccess
const sessionFor = (id: string) => ({ user: { id }, access_token: `isolated-${id}` })
const saveLocalMaterial = (input: LocalMaterial) => localApi.saveLocalMaterial(access, input)
const listLocalMaterials = (blockKey: string, songId?: string) => localApi.listLocalMaterials(access, { blockKey, songId })
const loadLocalMaterialBlob = (ref: LocalMaterial) => localApi.loadLocalMaterialBlob(access, ref)
const patchLocalMaterialMetadata = (id: string, blockKey: string, patch: localApi.MaterialMetadataPatch, songId?: string) => localApi.patchLocalMaterialMetadata(access, { id, blockKey, songId }, patch)
const deleteLocalMaterial = (id: string, blockKey: string, songId?: string) => localApi.deleteLocalMaterial(access, { id, blockKey, songId })

function material(id: string, blockKey: string): OwnedLocalMaterial {
  return { id, blockKey, ownerUid: 'A', storage: 'indexeddb', name: id, type: 'text/uri-list', size: 0, source: 'url', url: `https://example.com/${id}`, createdAt: '2026-01-01T00:00:00Z' }
}

describe('default material asset synchronization', () => {
  it('keeps text guidance and binds the supplied exercise PDFs', () => {
    for (const language of ['en', 'ru', 'it', 'fr'] as const) {
      expect(getDefaultMaterials(language, 'warmup')).toEqual([])
      expect(getDefaultMaterials(language, 'chromatic')[0].filePath).toBe('/default-exercises/chromatic/chromatic.pdf')
      expect(existsSync(`public${getDefaultMaterials(language, 'chromatic')[0].filePath}`)).toBe(true)
      expect(getDefaultMaterials(language, 'learning')[0].filePath).toBeUndefined()
      expect(getDefaultMaterials(language, 'chromatic')).toHaveLength(2)
      const retained = getDefaultMaterials(language, 'two_notes_per_string')[0].filePath
      expect(retained).toBe('/default-exercises/2-notes-per-string/2-notes-per-string.pdf')
      expect(existsSync(`public${retained}`)).toBe(true)
    }
    const pdfs = readdirSync('public/default-exercises', { recursive: true }).filter((path) => String(path).toLowerCase().endsWith('.pdf'))
    expect(pdfs).toHaveLength(26)
  })

  it('matches every randomized scale key to an existing PDF in every language', () => {
    const expected = {
      major_scales: ['c', 'g', 'd', 'a', 'e', 'b', 'gb', 'db', 'ab', 'eb', 'bb', 'f'],
      minor_scales: ['am', 'em', 'bm', 'f#m', 'c#m', 'g#m', 'dm', 'gm', 'cm', 'fm', 'a#m', 'd#m'],
    }
    for (const language of ['en', 'ru', 'it', 'fr'] as const) {
      for (const blockKey of ['major_scales', 'minor_scales'] as const) {
        const folder = blockKey.replace('_', '-')
        const reached = new Set<string>()
        practiceKeyPools[blockKey].forEach((key, index) => {
          const material = getDefaultMaterials(language, blockKey, key)[0]
          const expectedPath = `/default-exercises/${folder}/${folder}-${expected[blockKey][index]}.pdf`
          expect(decodeURIComponent(material.filePath!)).toBe(expectedPath)
          expect(existsSync(`public${expectedPath}`)).toBe(true)
          expect(new URL(material.filePath!, 'https://example.com').hash).toBe('')
          expect(material.filePath).not.toContain('%2523')
          expect(material.title.length).toBeGreaterThan(0)
          reached.add(material.filePath!)
        })
        expect(reached.size).toBe(12)
        expect(getDefaultMaterials(language, blockKey)).toEqual([])
        expect(getDefaultMaterials(language, blockKey, 'unknown')).toEqual([])
      }
    }
    expect(getDefaultMaterials('en', 'minor_scales', 'F#')[0].filePath).toContain('f%23m.pdf')
    expect(getDefaultMaterials('en', 'major_scales', 'F#')[0].detail).toContain('Gb')
    expect(getDefaultMaterials('en', 'minor_scales', 'Bb')[0].detail).toContain('A#')
    expect(getDefaultMaterials('en', 'minor_scales', 'Eb')[0].detail).toContain('D#')
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

  it('separates exact song scope from its UI collection key and block scope', () => {
    const rows = [material('block', 'repertoire'), { ...material('song', 'repertoire'), songId: 'one' }, { ...material('foreign', 'repertoire'), songId: 'two' }]
    expect(setBlockMaterials({}, 'repertoire:song:one', rows, { blockKey: 'repertoire', songId: 'one' })['repertoire:song:one'].map((row) => row.id)).toEqual(['song'])
    expect(setBlockMaterials({}, 'repertoire', rows).repertoire.map((row) => row.id)).toEqual(['block'])
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
    let state: MaterialsByBlock = { warmup: [material('a', 'warmup')], learning: [material('b', 'learning')] }
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

type Row = Record<string, unknown> & { id: string; ownerUid?: string }

function installFakeIndexedDb(initialRows: Row[] = []) {
  const key = (row: Row) => JSON.stringify([row.ownerUid, row.id])
  const rows = new Map(initialRows.map((row) => [key(row), row]))
  const legacy = new Map<string, Row>()
  let previous = Promise.resolve()
  let holdCompletion = false
  let failWrite = false
  let afterCommit: (() => void) | undefined
  const events: string[] = []
  const completions: (() => void)[] = []
  const database = {
    close: () => {},
    objectStoreNames: { contains: (name: string) => name === 'learning-materials' },
    createObjectStore: () => ({ createIndex: () => {} }),
    transaction: (name: string, mode: string) => {
      if (name !== 'owned-learning-materials') throw new Error('Legacy store must not be accessed')
      let pending = 0
      let aborted = false
      let completed = false
      let working: Map<string, Row> | undefined
      const contents = () => working ??= new Map(rows)
      const wait = previous
      let release: () => void = () => {}
      previous = new Promise<void>((resolve) => { release = resolve })
      const complete = () => {
        if (completed || pending) return
        completed = true
        const finish = () => {
          if (mode === 'readwrite' && failWrite) { failWrite = false; aborted = true }
          if (aborted) transaction.onabort?.()
          else {
            if (mode === 'readwrite' && working) {
              rows.clear()
              for (const [id, row] of working) rows.set(id, row)
              events.push('metadata-commit')
              const committed = afterCommit
              afterCommit = undefined
              committed?.()
            }
            transaction.oncomplete?.()
          }
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
            try { result.result = operation(); result.onsuccess?.() } catch { aborted = true }
          }
          pending--
          queueMicrotask(complete)
        })
        return result
      }
      const store = {
        put: (row: Row) => request(() => { contents().set(key(row), row) }),
        add: (row: Row) => request(() => { if (contents().has(key(row))) throw new Error('Duplicate'); contents().set(key(row), row) }),
        get: (id: string[]) => request(() => contents().get(JSON.stringify(id))),
        getAll: () => request(() => [...contents().values()]),
        index: () => ({ getAll: (ownerUid: string) => request(() => [...contents().values()].filter((row) => row.ownerUid === ownerUid)) }),
        delete: (id: string[]) => request(() => { contents().delete(JSON.stringify(id)) }),
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
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', new EventTarget())
  vi.stubGlobal('navigator', {})
  return {
    events,
    failNextWrite: () => { failWrite = true },
    afterNextCommit: (callback: () => void) => { afterCommit = callback },
    seed: (row: Row) => rows.set(key(row), row),
    seedLegacy: (row: Row) => legacy.set(row.id, row),
    legacySnapshot: () => [...legacy.values()],
    snapshot: () => [...rows.values()],
    cleanup: () => { delete globals.indexedDB; vi.unstubAllGlobals() },
    hold: () => { holdCompletion = true },
    finish: () => { holdCompletion = false; completions.splice(0).forEach((complete) => complete()) },
  }
}

function installFakeCache(events: string[]) {
  const stores = new Map<string, Map<string, Response>>()
  const locks = new Map<string, Promise<unknown>>()
  let failPut = false
  let failDeletes = 0
  let afterPut: (() => void) | undefined
  const storage = (name: string) => {
    let store = stores.get(name)
    if (!store) { store = new Map(); stores.set(name, store) }
    return store
  }
  vi.stubGlobal('location', { origin: 'https://isolated-materials.test' })
  vi.stubGlobal('navigator', { locks: { request: (name: string, ...args: [() => Promise<unknown>] | [{ signal?: AbortSignal }, () => Promise<unknown>]) => {
    const action = args.length === 1 ? args[0] : args[1]
    const operation = (locks.get(name) ?? Promise.resolve()).then(action)
    locks.set(name, operation.catch(() => {}))
    return operation
  } } })
  vi.stubGlobal('caches', { open: vi.fn(async (name: string) => ({
    match: async (request: Request) => storage(name).get(request.url)?.clone(),
    put: async (request: Request, response: Response) => {
      if (failPut) { failPut = false; throw new Error('Cache quota') }
      events.push('cache-put')
      storage(name).set(request.url, response.clone())
      const written = afterPut
      afterPut = undefined
      written?.()
    },
    delete: async (request: Request) => {
      if (failDeletes > 0) { failDeletes--; throw new Error('Cache unavailable') }
      events.push('cache-delete')
      return storage(name).delete(request.url)
    },
  })) })
  return { storage, failPut: () => { failPut = true }, failDelete: (times = 1) => { failDeletes = times }, afterNextPut: (callback: () => void) => { afterPut = callback } }
}

describe('localMaterials block scoping (in-memory IndexedDB fake)', () => {
  let database: ReturnType<typeof installFakeIndexedDb>
  let stop: () => void
  beforeEach(() => {
    database = installFakeIndexedDb()
    stop = watchLocalMaterialIdentity(() => {})
    auth.change('SIGNED_IN', sessionFor('A'))
    access = captureLocalMaterialAccess()
  })
  afterEach(() => { stop(); database.cleanup() })

  it.each(['.', '..'])('rejects dot-segment %s IDs in every ref operation without touching storage', async (id) => {
    const cache = installFakeCache(database.events)
    const ref = material(id, 'learning')
    database.seed(ref)
    for (const operation of [
      () => saveLocalMaterial({ ...ref, source: 'file', blob: new Blob(['unsafe']) }),
      () => loadLocalMaterialBlob(ref),
      () => patchLocalMaterialMetadata(id, 'learning', { name: 'unsafe' }),
      () => deleteLocalMaterial(id, 'learning'),
    ]) await expect(operation()).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    expect(database.snapshot()).toEqual([ref])
    expect(database.events).toEqual([])
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(0)
  })

  it('encodes owner and ID as separate cache path segments without double decoding', async () => {
    const cache = installFakeCache(database.events)
    auth.change('SIGNED_IN', sessionFor('A/with %?#'))
    access = captureLocalMaterialAccess()
    const saved = await saveLocalMaterial({ ...material('../%2e/ ?#', 'learning'), source: 'file', blob: new Blob(['safe']) })
    expect([...cache.storage('guitar-practice-hub-media-v2').keys()]).toEqual(['https://isolated-materials.test/__guitar_practice_hub_local_media/v2/A%2Fwith%20%25%3F%23/..%2F%252e%2F%20%3F%23'])
    expect(await (await loadLocalMaterialBlob(saved)).text()).toBe('safe')
  })

  it('rejects a blocked upgrade, aborts its late upgrade and closes a late success without legacy writes', async () => {
    const cache = installFakeCache(database.events)
    const legacy = { ...material('legacy', 'warmup'), ownerUid: undefined, blob: new Blob(['legacy metadata bytes']) }
    database.seedLegacy(legacy)
    const legacyCache = cache.storage('guitar-practice-hub-media')
    legacyCache.set('https://isolated-materials.test/legacy', new Response('legacy cache bytes'))
    const close = vi.fn()
    const abort = vi.fn()
    const createObjectStore = vi.fn()
    const request: { onblocked?: () => void; onupgradeneeded?: () => void; onsuccess?: () => void; transaction: { abort: () => void }; result: { close: () => void; createObjectStore: typeof createObjectStore } } = {
      transaction: { abort }, result: { close, createObjectStore },
    }
    vi.stubGlobal('indexedDB', { open: () => request })
    const pending = listLocalMaterials('learning')
    const rejected = expect(pending).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    request.onblocked?.()
    await rejected
    request.onupgradeneeded?.()
    request.onsuccess?.()
    expect(abort).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect(createObjectStore).not.toHaveBeenCalled()
    expect(database.events).toEqual([])
    expect(database.legacySnapshot()).toEqual([legacy])
    expect(await legacy.blob.text()).toBe('legacy metadata bytes')
    expect(await [...legacyCache.values()][0].clone().text()).toBe('legacy cache bytes')
    expect(legacyCache.size).toBe(1)
  })

  it('cleans only uncommitted new bytes when cache put is followed by A-B-A invalidation', async () => {
    const cache = installFakeCache(database.events)
    const kept = await saveLocalMaterial({ ...material('kept', 'learning'), source: 'file', blob: new Blob(['keep']) })
    cache.afterNextPut(() => {
      auth.change('SIGNED_IN', sessionFor('B'))
      auth.change('SIGNED_IN', sessionFor('A'))
    })
    await expect(saveLocalMaterial({ ...material('stale', 'learning'), source: 'file', blob: new Blob(['discard']) })).rejects.toThrow('LOCAL_MATERIAL_ACCESS_DENIED')
    access = captureLocalMaterialAccess()
    expect(database.snapshot().map((row) => row.id)).toEqual(['kept'])
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(1)
    expect(await (await loadLocalMaterialBlob(kept)).text()).toBe('keep')
  })

  it('retains committed A bytes but rejects the late result when identity changes at commit', async () => {
    const cache = installFakeCache(database.events)
    database.afterNextCommit(() => { auth.change('SIGNED_IN', sessionFor('B')) })
    const input = { ...material('committed', 'learning'), source: 'file' as const, blob: new Blob(['A committed']) }
    await expect(saveLocalMaterial(input)).rejects.toThrow('LOCAL_MATERIAL_ACCESS_DENIED')
    access = captureLocalMaterialAccess()
    expect(await listLocalMaterials('learning')).toEqual([])
    await expect(loadLocalMaterialBlob(input)).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(1)
    auth.change('SIGNED_IN', sessionFor('A'))
    access = captureLocalMaterialAccess()
    expect(await (await loadLocalMaterialBlob(input)).text()).toBe('A committed')
  })

  it('snapshots mutable refs, scopes and patch arrays before asynchronous database work', async () => {
    await saveLocalMaterial({ ...material('fixed', 'learning'), source: 'file', blob: new Blob(['original']) })
    const scope = { blockKey: 'learning' }
    const listing = localApi.listLocalMaterials(access, scope)
    scope.blockKey = 'foreign'
    expect((await listing).map((row) => row.id)).toEqual(['fixed'])
    const ref = { id: 'fixed', blockKey: 'learning' }
    const patch = { bookmarks: [2] }
    const patching = localApi.patchLocalMaterialMetadata(access, ref, patch)
    ref.id = 'foreign'; ref.blockKey = 'foreign'; patch.bookmarks.push(99)
    expect((await patching).bookmarks).toEqual([{ seconds: 2 }])
    const blobRef = { id: 'fixed', blockKey: 'learning' }
    const loading = localApi.loadLocalMaterialBlob(access, blobRef)
    blobRef.id = 'foreign'
    expect(await (await loading).text()).toBe('original')
    const deleteRef = { id: 'fixed', blockKey: 'learning' }
    const deleting = localApi.deleteLocalMaterial(access, deleteRef)
    deleteRef.id = 'foreign'
    await deleting
    expect(await listLocalMaterials('learning')).toEqual([])
  })

  it('isolates same IDs and all CRUD/blob/patch operations across account switches', async () => {
    const cache = installFakeCache(database.events)
    const first = await saveLocalMaterial({ ...material('same', 'learning'), source: 'file', blob: new Blob(['A']) })
    await saveLocalMaterial(material('only-A', 'learning'))
    auth.change('SIGNED_IN', sessionFor('B'))
    access = captureLocalMaterialAccess()
    expect(await listLocalMaterials('learning')).toEqual([])
    for (const operation of [
      () => loadLocalMaterialBlob({ ...first, id: 'only-A', blob: new Blob(['forged']) }),
      () => patchLocalMaterialMetadata('only-A', 'learning', { name: 'stolen' }),
      () => deleteLocalMaterial('only-A', 'learning'),
    ]) await expect(operation()).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    const second = await saveLocalMaterial({ ...material('same', 'learning'), source: 'file', blob: new Blob(['B']) })
    expect(second.ownerUid).toBe('B')
    expect(await (await loadLocalMaterialBlob(first)).text()).toBe('B')
    await expect(patchLocalMaterialMetadata('same', 'repertoire', { name: 'wrong block' })).rejects.toThrow()
    auth.change('SIGNED_IN', sessionFor('A'))
    access = captureLocalMaterialAccess()
    expect(await (await loadLocalMaterialBlob(second)).text()).toBe('A')
    expect((await listLocalMaterials('learning')).map((row) => row.id)).toEqual(['same', 'only-A'])
    expect([...cache.storage('guitar-practice-hub-media-v2').keys()]).toEqual(['https://isolated-materials.test/__guitar_practice_hub_local_media/v2/A/same', 'https://isolated-materials.test/__guitar_practice_hub_local_media/v2/B/same'])
  })

  it('rejects forged blob metadata and duplicate creation without overwriting persisted bytes', async () => {
    const original = await saveLocalMaterial({ ...material('file', 'learning'), source: 'file', blob: new Blob(['real']) })
    expect(await (await loadLocalMaterialBlob({ ...original, blob: new Blob(['forged']) })).text()).toBe('real')
    await expect(saveLocalMaterial({ ...original, blob: new Blob(['replacement']) })).rejects.toThrow()
    expect(await (await loadLocalMaterialBlob(original)).text()).toBe('real')
    await expect(localApi.loadLocalMaterialBlob(access, { ...original, songId: 'wrong' })).rejects.toThrow()
  })

  it('aborts pending owned warm-up reassociation on A-B-A and does not revive the old access', async () => {
    database.seed(material('old', 'warmup'))
    database.hold()
    const oldAccess = access
    const pending = localApi.listLocalMaterials(oldAccess, { blockKey: 'chromatic' })
    const rejected = expect(pending).rejects.toThrow()
    for (let turn = 0; turn < 12; turn++) await Promise.resolve()
    auth.change('SIGNED_IN', sessionFor('B'))
    auth.change('SIGNED_IN', sessionFor('A'))
    database.finish()
    await rejected
    expect(database.snapshot()[0].blockKey).toBe('warmup')
    await expect(localApi.saveLocalMaterial(oldAccess, material('late', 'learning'))).rejects.toThrow()
    expect(database.snapshot()).toHaveLength(1)
  })

  it('writes cache bytes before metadata and preserves the original legacy cache byte-for-byte', async () => {
    const cache = installFakeCache(database.events)
    const legacyCache = cache.storage('guitar-practice-hub-media')
    legacyCache.set('https://isolated-materials.test/__guitar_practice_hub_local_media/old', new Response('legacy bytes'))
    const saved = await saveLocalMaterial({ ...material('cached', 'learning'), source: 'file', blob: new Blob(['new bytes']) })
    expect(database.events).toEqual(['cache-put', 'metadata-commit'])
    expect(saved.storage).toBe('cache')
    expect(await (await loadLocalMaterialBlob(saved)).text()).toBe('new bytes')
    expect([...cache.storage('guitar-practice-hub-media-v2').keys()]).toEqual(['https://isolated-materials.test/__guitar_practice_hub_local_media/v2/A/cached'])
    await deleteLocalMaterial('cached', 'learning')
    expect(database.events.slice(-3)).toEqual(['metadata-commit', 'cache-delete', 'metadata-commit'])
    expect(database.snapshot()).toEqual([])
    expect(await [...legacyCache.values()][0].clone().text()).toBe('legacy bytes')
    expect(legacyCache.size).toBe(1)
  })

  it('cleans only new cache bytes on metadata failure and preserves bytes on failed deletion', async () => {
    const cache = installFakeCache(database.events)
    const first = await saveLocalMaterial({ ...material('kept', 'learning'), source: 'file', blob: new Blob(['keep']) })
    database.failNextWrite()
    await expect(saveLocalMaterial({ ...material('failed', 'learning'), source: 'file', blob: new Blob(['discard']) })).rejects.toThrow()
    expect(database.snapshot().map((row) => row.id)).toEqual(['kept'])
    expect([...cache.storage('guitar-practice-hub-media-v2').keys()]).toEqual(['https://isolated-materials.test/__guitar_practice_hub_local_media/v2/A/kept'])
    database.failNextWrite()
    await expect(deleteLocalMaterial('kept', 'learning')).rejects.toThrow()
    expect(await (await loadLocalMaterialBlob(first)).text()).toBe('keep')
    cache.failPut()
    await expect(saveLocalMaterial({ ...material('quota', 'learning'), source: 'file', blob: new Blob(['quota']) })).rejects.toThrow()
    expect(database.snapshot()).toHaveLength(1)
  })

  it('serializes concurrent same-ID cache saves and does not remove the winning bytes', async () => {
    installFakeCache(database.events)
    const input = { ...material('race', 'learning'), source: 'file' as const, blob: new Blob(['winner']) }
    const results = await Promise.allSettled([saveLocalMaterial(input), saveLocalMaterial({ ...input, blob: new Blob(['loser']) })])
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(await (await loadLocalMaterialBlob(input)).text()).toBe('winner')
  })

  it('retries a transient cache-delete failure and then fully removes the material', async () => {
    const cache = installFakeCache(database.events)
    await saveLocalMaterial({ ...material('transient', 'learning'), source: 'file', blob: new Blob(['bytes']) })
    cache.failDelete(1)
    await deleteLocalMaterial('transient', 'learning')
    expect(database.snapshot()).toEqual([])
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(0)
  })

  it('reports cleanup pending instead of silently orphaning bytes, hides the row and retries only this owner', async () => {
    const cache = installFakeCache(database.events)
    const legacyCache = cache.storage('guitar-practice-hub-media')
    legacyCache.set('https://isolated-materials.test/legacy', new Response('legacy'))
    database.seedLegacy({ ...material('legacy', 'learning'), ownerUid: undefined })
    const saved = await saveLocalMaterial({ ...material('orphan', 'learning'), source: 'file', blob: new Blob(['bytes']) })
    const kept = await saveLocalMaterial({ ...material('kept', 'learning'), source: 'file', blob: new Blob(['keep']) })
    database.seed({ ...material('foreign-pending', 'learning'), ownerUid: 'B', storage: 'cache', pendingDeletion: true })
    cache.storage('guitar-practice-hub-media-v2').set('https://isolated-materials.test/__guitar_practice_hub_local_media/v2/B/foreign-pending', new Response('B bytes'))
    cache.failDelete(3)
    await expect(deleteLocalMaterial('orphan', 'learning')).rejects.toThrow(localApi.localMaterialCleanupPending)
    expect((await listLocalMaterials('learning')).map((row) => row.id)).toEqual(['kept'])
    await expect(loadLocalMaterialBlob(saved)).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    await expect(patchLocalMaterialMetadata('orphan', 'learning', { name: 'revived' })).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    await expect(saveLocalMaterial({ ...material('orphan', 'learning'), source: 'file', blob: new Blob(['resurrect']) })).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    expect(database.snapshot().find((row) => row.id === 'orphan')?.pendingDeletion).toBe(true)
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(3)

    expect(await localApi.retryPendingLocalMaterialCleanup(access)).toEqual({ attempted: 1, failed: 0 })
    expect(database.snapshot().map((row) => row.id).sort()).toEqual(['foreign-pending', 'kept'])
    expect([...cache.storage('guitar-practice-hub-media-v2').keys()].map((url) => url.split('/v2/')[1]).sort()).toEqual(['A/kept', 'B/foreign-pending'])
    expect(await (await loadLocalMaterialBlob(kept)).text()).toBe('keep')
    expect(database.legacySnapshot()).toHaveLength(1)
    expect(legacyCache.size).toBe(1)
  })

  it('keeps a pending row when the final metadata delete fails and finishes it on retry', async () => {
    const cache = installFakeCache(database.events)
    await saveLocalMaterial({ ...material('half', 'learning'), source: 'file', blob: new Blob(['bytes']) })
    database.afterNextCommit(() => { database.failNextWrite() })
    await expect(deleteLocalMaterial('half', 'learning')).rejects.toThrow(localApi.localMaterialCleanupPending)
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(0)
    expect(database.snapshot().map((row) => row.pendingDeletion)).toEqual([true])
    expect(await listLocalMaterials('learning')).toEqual([])
    expect(await localApi.retryPendingLocalMaterialCleanup(access)).toEqual({ attempted: 1, failed: 0 })
    expect(database.snapshot()).toEqual([])
  })

  it('stops a save aborted during its cache write before metadata commits and removes the late bytes', async () => {
    const cache = installFakeCache(database.events)
    const controller = new AbortController()
    cache.afterNextPut(() => controller.abort(new DOMException('Local material save timed out.', 'TimeoutError')))
    await expect(localApi.saveLocalMaterial(access, { ...material('late', 'learning'), source: 'file', blob: new Blob(['big video']) }, controller.signal)).rejects.toMatchObject({ name: 'TimeoutError' })
    expect(database.snapshot()).toEqual([])
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(0)
    expect(database.events).not.toContain('metadata-commit')
    const retried = await saveLocalMaterial({ ...material('retried', 'learning'), source: 'file', blob: new Blob(['big video']) })
    expect(await (await loadLocalMaterialBlob(retried)).text()).toBe('big video')
  })

  it('records a hidden pending row when an aborted save cannot remove its bytes, then cleans it on retry', async () => {
    const cache = installFakeCache(database.events)
    const controller = new AbortController()
    cache.afterNextPut(() => { controller.abort(new DOMException('Local material save cancelled.', 'AbortError')); cache.failDelete(3) })
    await expect(localApi.saveLocalMaterial(access, { ...material('stuck', 'learning'), source: 'file', blob: new Blob(['bytes']) }, controller.signal)).rejects.toThrow(localApi.localMaterialCleanupPending)
    expect(await listLocalMaterials('learning')).toEqual([])
    expect(database.snapshot()).toMatchObject([{ id: 'stuck', ownerUid: 'A', storage: 'cache', pendingDeletion: true }])
    expect(database.snapshot()[0].blob).toBeUndefined()
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(1)
    expect(await localApi.retryPendingLocalMaterialCleanup(access)).toEqual({ attempted: 1, failed: 0 })
    expect(database.snapshot()).toEqual([])
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(0)
  })

  it('rejects an already aborted save without touching storage', async () => {
    const cache = installFakeCache(database.events)
    const controller = new AbortController()
    controller.abort(new DOMException('Local material save cancelled.', 'AbortError'))
    await expect(localApi.saveLocalMaterial(access, { ...material('never', 'learning'), source: 'file', blob: new Blob(['bytes']) }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(database.snapshot()).toEqual([])
    expect(cache.storage('guitar-practice-hub-media-v2').size).toBe(0)
  })

  it('moves warm-up materials to Chromatic once while keeping other blocks unchanged', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await saveLocalMaterial(material('l1', 'learning'))
    await saveLocalMaterial(material('w2', 'warmup'))
    expect(await listLocalMaterials('warmup')).toEqual([])
    expect((await listLocalMaterials('chromatic')).map((item) => item.id).sort()).toEqual(['w1', 'w2'])
    expect((await listLocalMaterials('learning')).map((item) => item.id)).toEqual(['l1'])
    expect(await listLocalMaterials('rhythm')).toEqual([])
  })

  it('preserves and hides legacy rows and bytes; migrates only owned warm-up rows', async () => {
    const blob = new Blob(['unchanged bytes'], { type: 'application/pdf' })
    const legacy: Row = {
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
    delete legacy.ownerUid
    database.seedLegacy(legacy)
    database.seed(cached)
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...cached, blockKey: 'chromatic' }])
    expect(await listLocalMaterials('warmup')).toEqual([])
    expect(database.legacySnapshot()).toEqual([legacy])
    expect(await blob.text()).toBe('unchanged bytes')
    await expect(localApi.loadLocalMaterialBlob(access, { id: legacy.id, blockKey: 'warmup' })).rejects.toThrow()
  })

  it('migrates owned song attachments across roles without copying or changing cache bytes', async () => {
    const cache = installFakeCache(database.events)
    const saved = await saveLocalMaterial({ ...material('shared-video', 'learning'), source: 'file', type: 'video/mp4', blob: new Blob(['same bytes']), bookmarks: [{ seconds: 3, name: 'Verse' }] })
    database.seed({ ...saved, blockKey: 'repertoire', songId: 'shared-song' })
    const beforeKeys = [...cache.storage('guitar-practice-hub-media-v2').keys()]
    const migrated = await listLocalMaterials('learn_song', 'shared-song')
    expect(migrated).toEqual([{ ...saved, blockKey: 'song', songId: 'shared-song' }])
    expect(await listLocalMaterials('repertoire', 'shared-song')).toEqual(migrated)
    expect([...cache.storage('guitar-practice-hub-media-v2').keys()]).toEqual(beforeKeys)
    expect(await (await localApi.loadLocalMaterialBlob(access, { id: saved.id, blockKey: 'learn_song', songId: 'shared-song' })).text()).toBe('same bytes')
    expect(await listLocalMaterials('learning')).toEqual([])
    expect(await listLocalMaterials('repertoire', 'other-song')).toEqual([])
  })

  it('moves only an explicitly chosen owned block attachment to its song', async () => {
    const original = { ...material('unassigned', 'repertoire'), blob: new Blob(['reference']), source: 'file' as const, bookmarks: [9] }
    database.seed(original)
    const moved = await localApi.assignLocalMaterialToSong(access, original, 'my-song')
    expect(moved).toEqual({ ...original, blockKey: 'song', songId: 'my-song' })
    expect(await listLocalMaterials('repertoire')).toEqual([])
    expect(await listLocalMaterials('learn_song', 'my-song')).toEqual([moved])
    expect(await (await localApi.loadLocalMaterialBlob(access, moved)).text()).toBe('reference')
    await expect(localApi.assignLocalMaterialToSong(access, moved, 'different-song')).rejects.toThrow()
    await expect(localApi.assignLocalMaterialToSong(access, material('missing', 'repertoire'), 'my-song')).rejects.toThrow()
    await expect(localApi.assignLocalMaterialToSong(access, material('unassigned', 'learning'), 'my-song')).rejects.toThrow()
  })

  it('isolates repertoire materials by song and keeps block-level materials separate', async () => {
    const firstSongMaterial = { ...material('song-one-file', 'repertoire'), songId: 'song-one' }
    const secondSongMaterial = { ...material('song-two-file', 'repertoire'), songId: 'song-two' }
    const blockMaterial = material('repertoire-reference', 'repertoire')
    await saveLocalMaterial(firstSongMaterial)
    await saveLocalMaterial(secondSongMaterial)
    await saveLocalMaterial(blockMaterial)

    expect(await listLocalMaterials('repertoire', 'song-one')).toEqual([{ ...firstSongMaterial, blockKey: 'song' }])
    expect(await listLocalMaterials('repertoire', 'song-two')).toEqual([{ ...secondSongMaterial, blockKey: 'song' }])
    expect(await listLocalMaterials('repertoire')).toEqual([blockMaterial])

    await patchLocalMaterialMetadata('song-one-file', 'repertoire', { name: 'Updated' }, 'song-one')
    expect(await listLocalMaterials('repertoire', 'song-one')).toEqual([{ ...firstSongMaterial, blockKey: 'song', name: 'Updated' }])
    await expect(patchLocalMaterialMetadata('song-one-file', 'repertoire', { name: 'Leak' }, 'song-two')).rejects.toThrow()
    await expect(deleteLocalMaterial('song-one-file', 'repertoire', 'song-two')).rejects.toThrow()
    expect(await listLocalMaterials('repertoire', 'song-one')).toEqual([{ ...firstSongMaterial, blockKey: 'song', name: 'Updated' }])
    await deleteLocalMaterial('song-two-file', 'repertoire', 'song-two')
    expect(await listLocalMaterials('repertoire', 'song-one')).toHaveLength(1)
    expect(await listLocalMaterials('repertoire', 'song-two')).toEqual([])
    expect(await listLocalMaterials('repertoire')).toEqual([blockMaterial])
  })

  it('deletes by exact ref without touching other blocks', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await saveLocalMaterial(material('l1', 'learning'))
    await deleteLocalMaterial('w1', 'chromatic')
    expect(await listLocalMaterials('warmup')).toEqual([])
    expect(await listLocalMaterials('learning')).toHaveLength(1)
  })

  it('patches only metadata, trims names and preserves cached/blob fields', async () => {
    const original = { ...material('w1', 'warmup'), source: 'file' as const, storage: 'indexeddb' as const, blob: new Blob(['data']), bookmarks: [12] }
    await saveLocalMaterial(original)
    const saved = { ...original, bookmarks: [{ seconds: 12 }] }
    await patchLocalMaterialMetadata('w1', 'chromatic', { name: '  My lesson  ' })
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...saved, blockKey: 'chromatic', name: 'My lesson' }])
    await patchLocalMaterialMetadata('w1', 'chromatic', { bookmarks: [3.14, 3.11, 0, -1, NaN] })
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...saved, blockKey: 'chromatic', name: 'My lesson', bookmarks: [{ seconds: 0 }, { seconds: 3.1 }] }])
    await expect(patchLocalMaterialMetadata('w1', 'warmup', { name: '  ' })).rejects.toThrow()
  })

  it('does not recreate deleted or foreign-block records', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await expect(patchLocalMaterialMetadata('w1', 'learning', { name: 'Wrong' })).rejects.toThrow()
    await deleteLocalMaterial('w1', 'chromatic')
    await expect(patchLocalMaterialMetadata('w1', 'warmup', { bookmarks: [1] })).rejects.toThrow()
    expect(await listLocalMaterials('warmup')).toEqual([])
  })

  it('preserves another metadata field when updates overlap', async () => {
    await saveLocalMaterial(material('w1', 'warmup'))
    await Promise.all([
      patchLocalMaterialMetadata('w1', 'chromatic', { name: 'Renamed' }),
      patchLocalMaterialMetadata('w1', 'chromatic', { bookmarks: [5] }),
    ])
    expect((await listLocalMaterials('chromatic'))[0]).toMatchObject({ name: 'Renamed', bookmarks: [{ seconds: 5 }] })
  })

  it('persists independent named loop regions and preserves bookmarks through rename/delete/reload', async () => {
    const loops: LoopRegion[] = [
      { id: 'phrase', name: 'Lick 1', start: 5.25, end: 12.5, color: 0, order: 0 },
      { id: 'solo', name: 'Full solo', start: 5.25, end: 30, color: 4, order: 1 },
    ]
    await saveLocalMaterial({ ...material('loop-video', 'learning'), bookmarks: [{ seconds: 3, name: 'Intro' }], loops })
    const loaded = (await listLocalMaterials('learning'))[0]
    expect(loaded.loops).toEqual(loops)
    await Promise.all([
      patchLocalMaterialMetadata('loop-video', 'learning', { name: 'Renamed video' }),
      patchLocalMaterialMetadata('loop-video', 'learning', { bookmarks: [{ seconds: 8, name: 'Target' }] }),
      patchLocalMaterialMetadata('loop-video', 'learning', { loops: loops.map((loop) => loop.id === 'phrase' ? { ...loop, name: 'Renamed lick' } : loop) }),
    ])
    expect((await listLocalMaterials('learning'))[0]).toMatchObject({
      name: 'Renamed video', bookmarks: [{ seconds: 8, name: 'Target' }],
      loops: [{ ...loops[0], name: 'Renamed lick' }, loops[1]],
    })
    await patchLocalMaterialMetadata('loop-video', 'learning', { loops: [loops[1]] })
    expect((await listLocalMaterials('learning'))[0]).toMatchObject({ loops: [loops[1]], bookmarks: [{ seconds: 8, name: 'Target' }] })
    await patchLocalMaterialMetadata('loop-video', 'learning', { loops: [] })
    expect((await listLocalMaterials('learning'))[0].loops).toEqual([])
  })

  it('queues YouTube metadata edits and keeps deleted links as sync tombstones', async () => {
    const url = 'https://www.youtube.com/watch?v=abcdefghijk'
    await saveLocalMaterial({ ...material('youtube-video', 'learning'), url })
    await saveLocalMaterial({ ...material('external-page', 'learning'), url: 'https://example.com/lesson' })
    expect(await localApi.listLocalYoutubeMaterials(access)).toMatchObject([
      { id: 'youtube-video', youtubeSync: { revision: 0, generation: 1, pending: true } },
    ])
    expect((await listLocalMaterials('learning')).find((row) => row.id === 'external-page')?.youtubeSync).toBeUndefined()

    await patchLocalMaterialMetadata('youtube-video', 'learning', { looperOpen: true })
    expect((await listLocalMaterials('learning')).find((row) => row.id === 'youtube-video')).toMatchObject({
      looperOpen: true, youtubeSync: { revision: 0, generation: 2, pending: true },
    })
    await deleteLocalMaterial('youtube-video', 'learning')
    expect(await listLocalMaterials('learning')).toEqual([
      expect.objectContaining({ id: 'external-page' }),
    ])
    expect(await localApi.listLocalYoutubeMaterials(access)).toMatchObject([
      { id: 'youtube-video', youtubeSync: { revision: 0, generation: 3, pending: true, deleted: true } },
    ])
  })

  it('isolates loop metadata by account, video ID and canonical song scope', async () => {
    const loop: LoopRegion = { id: 'same-loop-id', name: 'A phrase', start: 1, end: 4, color: 2, order: 0 }
    await saveLocalMaterial({ ...material('same-video-id', 'repertoire'), songId: 'song-A', loops: [loop] })
    await saveLocalMaterial({ ...material('other-video', 'repertoire'), songId: 'song-A' })
    expect((await listLocalMaterials('learn_song', 'song-A')).find((row) => row.id === 'same-video-id')?.loops).toEqual([loop])
    expect((await listLocalMaterials('song', 'song-A')).find((row) => row.id === 'other-video')?.loops).toBeUndefined()
    await expect(patchLocalMaterialMetadata('same-video-id', 'song', { loops: [] }, 'song-B')).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    auth.change('SIGNED_IN', sessionFor('B'))
    access = captureLocalMaterialAccess()
    expect(await listLocalMaterials('song', 'song-A')).toEqual([])
    await expect(patchLocalMaterialMetadata('same-video-id', 'song', { loops: [] }, 'song-A')).rejects.toThrow('LOCAL_MATERIAL_UNAVAILABLE')
    await saveLocalMaterial({ ...material('same-video-id', 'song'), songId: 'song-A', loops: [{ ...loop, name: 'B phrase' }] })
    expect((await listLocalMaterials('song', 'song-A'))[0].loops?.[0].name).toBe('B phrase')
    auth.change('SIGNED_IN', sessionFor('A'))
    access = captureLocalMaterialAccess()
    expect((await listLocalMaterials('song', 'song-A')).find((row) => row.id === 'same-video-id')?.loops).toEqual([loop])
  })

  it('snapshots loop arrays and controlled metadata before asynchronous work', async () => {
    await saveLocalMaterial(material('video', 'learning'))
    const loop = { id: 'phrase', name: 'Keep', start: 1, end: 5, color: 3, order: 0, ownerUid: 'forged', videoId: 'foreign' }
    const patch = { loops: [loop] }
    const pending = patchLocalMaterialMetadata('video', 'learning', patch)
    loop.name = 'Late mutation'
    loop.start = 3
    patch.loops.push({ ...loop, id: 'late' })
    expect((await pending).loops).toEqual([{ id: 'phrase', name: 'Keep', start: 1, end: 5, color: 3, order: 0 }])
  })

  it('retains committed loop/bookmark metadata after a failed write or stale-account update', async () => {
    const loop: LoopRegion = { id: 'kept', name: 'Kept phrase', start: 2, end: 6, color: 1, order: 0 }
    await saveLocalMaterial({ ...material('video', 'learning'), loops: [loop], bookmarks: [1] })
    database.failNextWrite()
    await expect(patchLocalMaterialMetadata('video', 'learning', { loops: [] })).rejects.toThrow()
    expect((await listLocalMaterials('learning'))[0]).toMatchObject({ loops: [loop], bookmarks: [{ seconds: 1 }] })
    const pending = patchLocalMaterialMetadata('video', 'learning', { loops: [] })
    const rejection = expect(pending).rejects.toThrow('LOCAL_MATERIAL_ACCESS_DENIED')
    auth.change('SIGNED_IN', sessionFor('B'))
    await rejection
    auth.change('SIGNED_IN', sessionFor('A'))
    access = captureLocalMaterialAccess()
    expect((await listLocalMaterials('learning'))[0].loops).toEqual([loop])
  })

  it('keeps legacy bookmarks byte-for-byte when adding loop metadata to an existing video', async () => {
    const legacyBookmarks = [1.234, 4, { seconds: 8, name: '  Legacy name  ' }]
    database.seed({ ...material('legacy-video', 'learning'), bookmarks: legacyBookmarks })
    const loop: LoopRegion = { id: 'new-region', name: 'Phrase', start: 0, end: 2.5, color: 0, order: 0 }
    await patchLocalMaterialMetadata('legacy-video', 'learning', { loops: [loop] })
    expect((await listLocalMaterials('learning'))[0]).toMatchObject({ loops: [loop], bookmarks: legacyBookmarks })
    expect(database.snapshot().find((row) => row.id === 'legacy-video')?.bookmarks).toEqual(legacyBookmarks)
  })

  it('normalizes finite nonnegative bookmarks to tenths', () => {
    expect(normalizeBookmarks([2.26, 1, 2.3, Infinity, -1, NaN])).toEqual([{ seconds: 1 }, { seconds: 2.3 }])
    expect(normalizeBookmarks([1e308])).toEqual([{ seconds: 1e308 }])
  })

  it('reads legacy numeric and mixed bookmarks, trims/limits names and dedupes by time keeping the first', () => {
    const long = 'x'.repeat(80)
    expect(normalizeBookmarks([
      12.5,
      { seconds: 4, name: '  Solo  ' },
      { seconds: 4.04, name: 'Duplicate' },
      { seconds: 7, name: '   ' },
      { seconds: 9, name: long },
      { seconds: 2, name: 42 },
      { seconds: -1, name: 'Negative' },
      { name: 'No time' },
      null,
      'text',
    ])).toEqual([
      { seconds: 2 },
      { seconds: 4, name: 'Solo' },
      { seconds: 7 },
      { seconds: 9, name: 'x'.repeat(60) },
      { seconds: 12.5 },
    ])
  })

  it('renames and clears a bookmark name only when bookmarks are patched, leaving legacy rows untouched otherwise', async () => {
    const legacy = { ...material('w1', 'warmup'), storage: 'cache' as const, bookmarks: [8, 3] }
    database.seed({ ...legacy, blockKey: 'chromatic' })
    await patchLocalMaterialMetadata('w1', 'chromatic', { name: 'Only name' })
    expect((await listLocalMaterials('chromatic'))[0].bookmarks).toEqual([8, 3])
    await patchLocalMaterialMetadata('w1', 'chromatic', { bookmarks: [{ seconds: 3 }, { seconds: 8, name: ' Chorus ' }] })
    expect((await listLocalMaterials('chromatic'))[0].bookmarks).toEqual([{ seconds: 3 }, { seconds: 8, name: 'Chorus' }])
    await patchLocalMaterialMetadata('w1', 'chromatic', { bookmarks: [{ seconds: 3 }, { seconds: 8, name: '' }] })
    expect((await listLocalMaterials('chromatic'))[0].bookmarks).toEqual([{ seconds: 3 }, { seconds: 8 }])
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
      deleteLocalMaterial('w1', 'chromatic'),
      patchLocalMaterialMetadata('w1', 'warmup', { name: 'Too late' }),
    ])
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(await listLocalMaterials('warmup')).toEqual([])
  })

  it('ignores fields outside the metadata allowlist and leaves cached storage untouched', async () => {
    const original = { ...material('w1', 'warmup'), storage: 'cache' as const, bookmarks: [3] }
    database.seed({ ...original, blockKey: 'chromatic' })
    const patch = { name: 'Renamed cache', url: 'https://evil.test', id: 'other', blockKey: 'other', storage: 'indexeddb', ownerUid: 'B', blob: new Blob(['forged']) }
    await patchLocalMaterialMetadata('w1', 'chromatic', patch)
    expect(await listLocalMaterials('chromatic')).toEqual([{ ...original, blockKey: 'chromatic', name: 'Renamed cache' }])
  })
})
