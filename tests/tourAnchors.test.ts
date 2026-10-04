// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

describe('guided tour anchors', () => {
  it('has a data-tour attribute in the UI for every tourSteps selector', () => {
    const steps = readFileSync('src/components/tour/tourSteps.ts', 'utf8')
    const anchors = [...new Set([...steps.matchAll(/\[data-tour="([^"]+)"\]/g)].map((match) => match[1]))]
    const ui = [...sourceFiles('src/pages'), ...sourceFiles('src/components')].map((file) => readFileSync(file, 'utf8')).join('\n')
    // Anchors are literal (data-tour="x") or string literals inside a data-tour={...} expression.
    const present = new Set<string>()
    for (const match of ui.matchAll(/data-tour=(?:"([^"]+)"|\{([^}]*)\})/g)) {
      if (match[1]) present.add(match[1])
      for (const literal of (match[2] ?? '').matchAll(/'([^']+)'/g)) present.add(literal[1])
    }

    expect(anchors.length).toBeGreaterThan(0)
    const missing = anchors.filter((anchor) => !present.has(anchor))
    expect(missing).toEqual([])
  })
})
