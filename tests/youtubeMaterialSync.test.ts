import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalMaterial, OwnedLocalMaterial } from '../src/lib/localMaterials'
import type { LocalMaterialAccess } from '../src/lib/localMaterialAccess'
import type { Database } from '../src/lib/database.types'
import type { YoutubeSyncTransport } from '../src/lib/youtubeMaterialSync'

type CloudRow = Database['public']['Tables']['youtube_materials']['Row']

const state = vi.hoisted(() => ({
  owner: 'user-a',
  records: new Map<string, Record<string, unknown>>(),
}))

vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
vi.mock('../src/lib/localMaterialAccess', () => ({
  localMaterialOwner: (access: { owner: string }) => {
    if (access.owner !== state.owner) throw new Error('LOCAL_MATERIAL_ACCESS_DENIED')
    return access.owner
  },
}))
vi.mock('../src/lib/localMaterials', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/localMaterials')>()
  return {
    ...actual,
    isYoutubeMaterial: (material: LocalMaterial) => material.source === 'url' && !!material.url?.includes('youtube'),
    listLocalYoutubeMaterials: async () => [...state.records.values()] as OwnedLocalMaterial[],
    mutateLocalYoutubeMaterial: async (_access: unknown, id: string, update: (current: OwnedLocalMaterial | undefined) => OwnedLocalMaterial | undefined) => {
      const current = state.records.get(id) as OwnedLocalMaterial | undefined
      const next = update(current)
      if (next) state.records.set(id, next)
      else state.records.delete(id)
      return next
    },
    saveLocalMaterial: vi.fn(),
  }
})

import { syncYoutubeMaterials } from '../src/lib/youtubeMaterialSync'

const access = { owner: 'user-a' } as unknown as LocalMaterialAccess
const materialId = 'local-material-a'
const videoId = 'abcdefghijk'
const createdAt = '2026-01-02T12:00:00.000Z'

function localMaterial(overrides: Partial<OwnedLocalMaterial> = {}): OwnedLocalMaterial {
  return {
    id: materialId, ownerUid: 'user-a', blockKey: 'learning', name: 'Lesson',
    type: 'text/uri-list', size: 0, source: 'url',
    url: `https://www.youtube-nocookie.com/embed/${videoId}?start=30`,
    createdAt, bookmarks: [{ seconds: 4.5, name: 'Intro' }],
    loops: [{ id: 'loop-a', name: 'Chorus', start: 5, end: 9, color: 2, order: 0, repeats: 3 }],
    looperOpen: true,
    youtubeSync: { revision: 0, generation: 1, pending: true },
    ...overrides,
  }
}

function cloudRow(overrides: Partial<CloudRow> = {}): CloudRow {
  return {
    user_id: 'user-a', material_id: materialId, block_key: 'learning', song_id: null,
    video_id: videoId, start_seconds: 30, name: 'Lesson',
    bookmarks: [{ seconds: 4.5, name: 'Intro' }],
    loops: [{ id: 'loop-a', name: 'Chorus', start: 5, end: 9, color: 2, order: 0, repeats: 3 }],
    looper_open: true, revision: 1, created_at: createdAt, updated_at: createdAt,
    deleted_at: null, ...overrides,
  }
}

function transport(rows: CloudRow[] = []): YoutubeSyncTransport {
  return {
    list: vi.fn(async () => rows),
    save: vi.fn(async () => cloudRow()),
  }
}

beforeEach(() => {
  state.owner = 'user-a'
  state.records.clear()
})

describe('YouTube material cross-device sync', () => {
  it('uploads existing local metadata and acknowledges the exact server revision', async () => {
    const material = localMaterial()
    state.records.set(material.id, material)
    const api = transport()

    const status = await syncYoutubeMaterials(access, api)

    expect(api.save).toHaveBeenCalledWith(materialId, 0, expect.objectContaining({
      user_id: 'user-a', video_id: videoId, start_seconds: 30, looper_open: true,
      bookmarks: [{ seconds: 4.5, name: 'Intro' }],
      loops: [{ id: 'loop-a', name: 'Chorus', start: 5, end: 9, color: 2, order: 0, repeats: 3 }],
    }), false)
    expect(status).toMatchObject({ pending: 0, conflicts: [], unavailable: false })
    expect((state.records.get(materialId) as OwnedLocalMaterial).youtubeSync).toMatchObject({ revision: 1, generation: 1, pending: false })
  })

  it('hydrates a cloud-only material without treating it as a new local write', async () => {
    const api = transport([cloudRow()])

    const status = await syncYoutubeMaterials(access, api)

    expect(state.records.get(materialId)).toMatchObject({
      id: materialId, ownerUid: 'user-a', url: `https://www.youtube-nocookie.com/embed/${videoId}?start=30`,
      bookmarks: [{ seconds: 4.5, name: 'Intro' }],
      loops: [{ id: 'loop-a', repeats: 3 }],
      looperOpen: true, youtubeSync: { revision: 1, pending: false },
    })
    expect(api.save).not.toHaveBeenCalled()
    expect(status).toMatchObject({ pending: 0, conflicts: [], unavailable: false })
  })

  it('preserves a stale local draft and surfaces a revision conflict', async () => {
    const material = localMaterial({ name: 'Offline edit', youtubeSync: { revision: 1, generation: 2, pending: true } })
    state.records.set(material.id, material)
    const api = transport([cloudRow({ name: 'Newer cloud edit', revision: 2 })])

    const status = await syncYoutubeMaterials(access, api)

    expect(api.save).not.toHaveBeenCalled()
    expect(state.records.get(materialId)).toMatchObject({
      name: 'Offline edit', youtubeSync: { revision: 1, generation: 2, pending: true, conflict: true },
    })
    expect(status.conflicts.map((item) => item.id)).toEqual([materialId])
  })

  it('keeps unsent local work retryable when the network is unavailable', async () => {
    state.records.set(materialId, localMaterial())
    const api = transport()
    api.list = vi.fn().mockRejectedValue(new Error('offline'))

    const status = await syncYoutubeMaterials(access, api)

    expect(status).toMatchObject({ pending: 1, conflicts: [], unavailable: true })
    expect((state.records.get(materialId) as OwnedLocalMaterial).youtubeSync).toMatchObject({ revision: 0, pending: true })
    expect(api.save).not.toHaveBeenCalled()
  })

  it('sends an offline deletion as a tombstone and acknowledges its new revision', async () => {
    const material = localMaterial({ youtubeSync: { revision: 1, generation: 2, pending: true, deleted: true } })
    state.records.set(material.id, material)
    const api = transport()
    api.save = vi.fn(async () => cloudRow({ revision: 2, deleted_at: createdAt }))

    const status = await syncYoutubeMaterials(access, api)

    expect(api.save).toHaveBeenCalledWith(materialId, 1, expect.any(Object), true)
    expect((state.records.get(materialId) as OwnedLocalMaterial).youtubeSync).toMatchObject({
      revision: 2, generation: 2, pending: false, deleted: true,
    })
    expect(status).toMatchObject({ pending: 0, conflicts: [], unavailable: false })
  })

  it('does not replace a newer device edit when an older save finishes', async () => {
    state.records.set(materialId, localMaterial())
    let finishSave!: (row: CloudRow) => void
    const api = transport()
    api.save = vi.fn(() => new Promise<CloudRow>((resolve) => { finishSave = resolve }))

    const sync = syncYoutubeMaterials(access, api)
    await vi.waitFor(() => expect(api.save).toHaveBeenCalledOnce())
    state.records.set(materialId, localMaterial({
      name: 'Edited during request',
      youtubeSync: { revision: 0, generation: 2, pending: true },
    }))
    finishSave(cloudRow())
    const status = await sync

    expect(state.records.get(materialId)).toMatchObject({
      name: 'Edited during request', youtubeSync: { revision: 1, generation: 2, pending: true },
    })
    expect(status.pending).toBe(1)
  })

  it('aborts hydration if account authority changes during the cloud request', async () => {
    let finishList!: (rows: CloudRow[]) => void
    const api = transport()
    api.list = vi.fn(() => new Promise((resolve) => { finishList = resolve }))

    const sync = syncYoutubeMaterials(access, api)
    await vi.waitFor(() => expect(api.list).toHaveBeenCalledOnce())
    state.owner = 'user-b'
    finishList([cloudRow()])

    await expect(sync).rejects.toThrow('LOCAL_MATERIAL_ACCESS_DENIED')
    expect(state.records.size).toBe(0)
  })
})
