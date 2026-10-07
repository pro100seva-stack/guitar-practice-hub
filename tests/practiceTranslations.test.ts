import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { transpileModule } from 'typescript'

describe('Practice translations', () => {
  it('provides Russian translations for Practice and Repertoire keys', () => {
    const i18nSource = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionarySource = i18nSource.slice(i18nSource.indexOf('const pageTranslations:'), i18nSource.indexOf('const I18nContext ='))
    const dictionaries = runInNewContext(transpileModule(`${dictionarySource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
    const sessionsSource = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const gallerySource = readFileSync('src/components/BlockGallery.tsx', 'utf8')
    const catalogSource = readFileSync('src/lib/catalogApi.ts', 'utf8')
    const staticKeys = [sessionsSource, gallerySource]
      .flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map((match) => match[1]))
    const catalogLabelsSource = catalogSource.slice(catalogSource.indexOf('const builtInLabelKeys:'), catalogSource.indexOf('\n}\n\nexport function catalogBlockLabel'))
    const catalogLabels = [...catalogLabelsSource.matchAll(/:\s*'([^']+)'/g)].map((match) => match[1])
    const keys = [...new Set([...staticKeys, ...catalogLabels])]

    expect(dictionaries.ru.Notes).toBe('Заметки')
    expect(dictionaries.ru['Musical notes']).toBe('Ноты')
    expect(dictionaries.ru['Songs for this week']).toBe('Песни на эту неделю')
    expect(keys.filter((key) => !dictionaries.ru[key])).toEqual([])
  })
})