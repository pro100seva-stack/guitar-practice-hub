import { readFileSync } from 'node:fs'
import { transpileModule, ModuleKind, ScriptTarget, JsxEmit } from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { toYouTubeEmbedUrl } from '../src/lib/youtube'

type Node = { type: unknown; props: Record<string, unknown> }
const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
const handlers = source.slice(source.indexOf('  function addYouTubeMaterial('), source.indexOf('  function renderMaterialViewer('))
const icons = source.slice(source.indexOf('const materialActionClass ='), source.indexOf('function isScheduledWeek('))

function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return []
  const node = value as Node
  return [node, ...nodes(node.props.children)]
}

function fixture(block = 'warmup', songId?: string, instanceKey?: string) {
  const scope = songId ? `song:${songId}` : block
  const manual: Record<string, boolean> = {}
  const values: Record<string, string> = {}
  const save = vi.fn()
  const feedback = vi.fn()
  const fileClick = vi.fn()
  const focus = vi.fn()
  const frames: FrameRequestCallback[] = []
  const jsx = (type: unknown, props: Record<string, unknown>) => typeof type === 'function' ? type(props) : { type, props }
  const context = {
    localMaterialScopeKey: () => scope,
    materialFeedback: {}, materialAddScope: instanceKey ?? scope, manualYouTubeScopes: manual, materialUrlInputs: values,
    materialAddMenuRefs: { current: {} }, materialAddButtonRefs: { current: {} }, materialFileInputRefs: { current: { [instanceKey ?? scope]: { click: fileClick } } },
    materialUrlInputRefs: { current: { [instanceKey ?? scope]: { focus } } },
    urlSavesRef: { current: new Set<string>() }, uploadControllersRef: { current: {} }, materialsMountedRef: { current: true }, materialNavigationRef: { current: 1 },
    captureMaterialAccess: () => ({}), isLocalMaterialAccessCurrent: () => true,
    setMaterialAddScope: vi.fn(), setManualYouTubeScopes: (update: (old: typeof manual) => typeof manual) => Object.assign(manual, update(manual)),
    setMaterialUrlInputs: (update: (old: typeof values) => typeof values) => Object.assign(values, update(values)),
    patchMaterialFeedback: feedback, addMaterialUrl: save, toYouTubeEmbedUrl,
    window: { requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length } },
    SongToolIcon: () => null, songViewerRowRef: { current: null }, setSongViewerRow: vi.fn(), setSongMaterialFilters: vi.fn(),
    materialFileAccept: '.pdf', handleLocalMaterialUpload: vi.fn(),
    t: (key: string) => key,
  }
  const code = transpileModule(handlers, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText
  const make = new Function('require', 'exports', ...Object.keys(context), `${code}; return { renderMaterialAddControls, renderMaterialUrlInput };`) as (...args: unknown[]) => {
    renderMaterialAddControls: (block: string, song?: string, compact?: boolean, key?: string) => Node
    renderMaterialUrlInput: (block: string, song?: string, key?: string) => Node | null
  }
  const render = make(() => ({ jsx, jsxs: jsx }), {}, ...Object.values(context))
  const menuTree = () => nodes(render.renderMaterialAddControls(block, songId, Boolean(songId), instanceKey))
  const tree = () => [...menuTree(), ...nodes(render.renderMaterialUrlInput(block, songId, instanceKey))]
  return { tree, menuTree, save, feedback, fileClick, focus, frames, context }
}

describe('learning-material manual YouTube entry', () => {
  it.each([['warmup', undefined, undefined], ['repertoire', 'song-one', 'repertoire:song-one'], ['song', 'song-one', 'library:song-one']])('opens the input without adding a video in %s', (block, song, key) => {
    const item = fixture(block, song, key)
    const menu = item.tree()
    const chooseFile = menu.find((node) => node.type === 'button' && node.props.children === 'Choose file')!
    expect(chooseFile).toBeDefined()
    const paste = menu.find((node) => node.type === 'button' && node.props.children === 'materials.pasteYouTube')!
    ;(paste.props.onClick as () => void)()
    expect(item.context.setMaterialAddScope).toHaveBeenCalledWith(null)
    expect(item.save).not.toHaveBeenCalled()
    expect(item.menuTree().some((node) => node.type === 'input' && node.props.type === 'url')).toBe(false)
    const input = item.tree().find((node) => node.type === 'input' && node.props.type === 'url')!
    expect(input.props.onPaste).toBeUndefined()
    ;(input.props.onChange as (event: unknown) => void)({ target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    expect(item.save).not.toHaveBeenCalled()
    const add = item.tree().find((node) => node.type === 'button' && node.props.children === 'materials.addYouTube')!
    ;(add.props.onClick as () => void)()
    expect(item.save).toHaveBeenCalledWith(block, song, 'https://youtu.be/dQw4w9WgXcQ')
  })

  it('retains an invalid draft for correction and adds a valid draft only on explicit Enter', () => {
    const item = fixture()
    ;(item.tree().find((node) => node.props.children === 'materials.pasteYouTube')!.props.onClick as () => void)()
    let input = item.tree().find((node) => node.type === 'input' && node.props.type === 'url')!
    ;(input.props.onChange as (event: unknown) => void)({ target: { value: 'https://example.com/private-file' } })
    ;(item.tree().find((node) => node.props.children === 'materials.addYouTube')!.props.onClick as () => void)()
    expect(item.save).not.toHaveBeenCalled()
    expect(item.feedback).toHaveBeenLastCalledWith('warmup', expect.objectContaining({ error: 'materials.youtubeRequired' }))
    input = item.tree().find((node) => node.type === 'input' && node.props.type === 'url')!
    expect(input.props.value).toBe('https://example.com/private-file')
    ;(input.props.onChange as (event: unknown) => void)({ target: { value: ' https://youtu.be/dQw4w9WgXcQ ' } })
    input = item.tree().find((node) => node.type === 'input' && node.props.type === 'url')!
    const preventDefault = vi.fn()
    ;(input.props.onKeyDown as (event: unknown) => void)({ key: 'Enter', preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(item.save).toHaveBeenCalledExactlyOnceWith('warmup', undefined, 'https://youtu.be/dQw4w9WgXcQ')
  })
})

describe('learning-material entry action icons', () => {
  it('uses the bookmark pencil and X paths and hides decorative SVGs from assistive technology', () => {
    const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props })
    const code = transpileModule(icons, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText
    const make = new Function('require', 'exports', `${code}; return MaterialActionIcon;`) as (require: () => unknown, exports: object) => (props: { action: string }) => Node
    const icon = make(() => ({ jsx, jsxs: jsx }), {})
    const pencil = nodes(icon({ action: 'rename' }))
    const remove = nodes(icon({ action: 'remove' }))
    expect(pencil[0].props).toMatchObject({ 'aria-hidden': 'true', focusable: 'false' })
    expect(pencil.find((node) => node.type === 'path')?.props.d).toBe('m15 5 4 4M4 20l4.25-.75L20 7.5 16.5 4 4.75 15.75 4 20Z')
    expect(remove.find((node) => node.type === 'path')?.props.d).toBe('m6 6 12 12M18 6 6 18')
    expect(source.match(/aria-label=\{t\('Remove \{name\}'/g)).toHaveLength(2)
  })
})
