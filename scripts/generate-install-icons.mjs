import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const checkOnly = process.argv.includes('--check')
assert(process.argv.slice(2).every(argument => argument === '--check'), 'Usage: node scripts/generate-install-icons.mjs [--check]')
const browserPath = process.env.ICON_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(candidate => existsSync(candidate))
assert(browserPath, 'Set ICON_BROWSER_PATH to an installed Chromium browser executable')
const svg = await readFile(join(root, 'public/favicon.svg'), 'utf8')
const specifications = [
  { name: 'pwa-192x192.png', size: 192, widthFraction: 0.84, opaque: false },
  { name: 'pwa-512x512.png', size: 512, widthFraction: 0.84, opaque: false },
  { name: 'pwa-maskable-512x512.png', size: 512, widthFraction: 0.56, opaque: true },
  { name: 'apple-touch-icon.png', size: 180, widthFraction: 0.8, opaque: true },
]
const existing = checkOnly ? await Promise.all(specifications.map(async specification =>
  (await readFile(join(root, 'public', specification.name))).toString('base64'),
)) : []
const profile = await mkdtemp(join(tmpdir(), 'guitar-hub-icons-'))
const browser = spawn(browserPath, [
  '--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--disable-extensions', '--force-color-profile=srgb', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })
const exited = new Promise(resolve => browser.once('exit', resolve))
let socket
let requestId = 0
const pending = new Map()
const deadline = setTimeout(() => browser.kill(), 60000)

function command(method, params = {}, sessionId) {
  const id = ++requestId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}

try {
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = ''
    browser.once('error', reject)
    browser.once('exit', () => reject(new Error('Browser exited before opening isolated DevTools endpoint')))
    browser.stderr.on('data', chunk => {
      stderr += chunk.toString()
      const match = stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+)/)
      if (match) resolve(match[1])
    })
  })
  socket = new WebSocket(endpoint)
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
  })
  socket.addEventListener('close', () => {
    for (const request of pending.values()) request.reject(new Error('Isolated browser connection closed'))
    pending.clear()
  })
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true })
  const rendered = await command('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(${async function render(source, specs, supplied) {
      function require(condition, message) {
        if (!condition) throw new Error(message)
      }
      async function image(url) {
        const loaded = new Image()
        loaded.src = url
        await loaded.decode()
        return loaded
      }
      const document = new DOMParser().parseFromString(source, 'image/svg+xml')
      const viewBox = document.documentElement.getAttribute('viewBox').split(/\s+/).map(Number)
      require(viewBox.join(' ') === '0 0 48 46', 'Unexpected source viewBox; review icon framing')
      const artwork = await image('data:image/svg+xml;base64,' + btoa(source))
      const results = []
      for (const [index, spec] of specs.entries()) {
        const canvas = new OffscreenCanvas(spec.size, spec.size)
        const context = canvas.getContext('2d', { colorSpace: 'srgb' })
        if (spec.opaque) {
          context.fillStyle = '#0f172a'
          context.fillRect(0, 0, spec.size, spec.size)
        }
        const width = spec.size * spec.widthFraction
        const height = width * viewBox[3] / viewBox[2]
        context.drawImage(artwork, (spec.size - width) / 2, (spec.size - height) / 2, width, height)
        const expected = context.getImageData(0, 0, spec.size, spec.size).data
        const blob = await canvas.convertToBlob({ type: 'image/png' })
        const base64 = await new Promise(resolve => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.readAsDataURL(blob)
        })
        const decoded = await image('data:image/png;base64,' + (supplied[index] || base64))
        require(decoded.naturalWidth === spec.size && decoded.naturalHeight === spec.size, spec.name + ': incorrect dimensions')
        context.clearRect(0, 0, spec.size, spec.size)
        context.drawImage(decoded, 0, 0)
        const pixels = context.getImageData(0, 0, spec.size, spec.size).data
        let foreground = 0
        let maxRadius = 0
        for (let offset = 0; offset < pixels.length; offset += 4) {
          for (let channel = 0; channel < 4; channel++) require(pixels[offset + channel] === expected[offset + channel], spec.name + ': pixels differ from source SVG rendering')
          if (spec.opaque) require(pixels[offset + 3] === 255, spec.name + ': nonopaque pixel')
          const isArtwork = spec.opaque
            ? pixels[offset] !== 15 || pixels[offset + 1] !== 23 || pixels[offset + 2] !== 42
            : pixels[offset + 3] !== 0
          if (isArtwork) {
            foreground++
            const pixel = offset / 4
            const radius = Math.hypot(pixel % spec.size + 0.5 - spec.size / 2, Math.floor(pixel / spec.size) + 0.5 - spec.size / 2) + Math.SQRT1_2
            maxRadius = Math.max(maxRadius, radius)
          }
        }
        require(foreground > spec.size * spec.size * 0.08, spec.name + ': missing artwork')
        require(foreground < spec.size * spec.size * 0.7, spec.name + ': missing surrounding space')
        if (spec.name.includes('maskable')) require(maxRadius <= spec.size * 0.4, spec.name + ': artwork outside safe-zone circle')
        require(pixels[3] === (spec.opaque ? 255 : 0), spec.name + ': unexpected corner alpha')
        results.push({ name: spec.name, size: spec.size, foreground, maxRadius: Number(maxRadius.toFixed(3)), base64 })
      }
      return results
    }.toString()})(${JSON.stringify(svg)}, ${JSON.stringify(specifications)}, ${JSON.stringify(existing)})`,
  }, sessionId)
  assert(!rendered.exceptionDetails, JSON.stringify(rendered.exceptionDetails))
  for (const result of rendered.result.value) {
    const png = Buffer.from(result.base64, 'base64')
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16), result.size)
    assert.equal(png.readUInt32BE(20), result.size)
    if (!checkOnly) await writeFile(join(root, 'public', result.name), png)
    console.log(`PASS ${result.name}: ${result.size}x${result.size}, ${result.foreground} artwork pixels, max radius ${result.maxRadius}`)
  }
  console.log(`SVG SHA-256: ${createHash('sha256').update(svg).digest('hex')}`)
  console.log(checkOnly ? 'Existing PNG pixels match source SVG; no assets written.' : 'Install icons generated from unchanged favicon.svg.')
} finally {
  if (socket?.readyState === WebSocket.OPEN) await command('Browser.close').catch(() => {})
  else browser.kill()
  await exited
  socket?.close()
  clearTimeout(deadline)
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}