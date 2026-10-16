import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { transpileModule } from 'typescript'

describe('Practice translations', () => {
  it('covers removal confirmation and source-grounded materials education in all four languages', () => {
    const source = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionarySource = source.slice(source.indexOf('const pageTranslations:'), source.indexOf('const I18nContext ='))
    const dictionaries = runInNewContext(transpileModule(`${dictionarySource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
    const keys = ['Remove this week?', 'Later weeks will be renumbered and their dates moved back by this week’s duration.', 'Learning materials', 'Block details', 'materials.builtIn', 'materials.formats', 'materials.local', 'materials.network', 'materials.browser', 'materials.bookmarks']
    for (const language of ['en', 'ru', 'it', 'fr']) {
      expect(keys.filter(key => !dictionaries[language][key]), language).toEqual([])
      for (const key of ['materials.formats', 'materials.local', 'materials.network', 'materials.browser', 'materials.bookmarks']) {
        expect(dictionaries[language][key]).not.toBe(key)
        if (language !== 'en') expect(dictionaries[language][key]).not.toBe(dictionaries.en[key])
      }
      expect(dictionaries[language]['materials.formats']).toContain('.txt')
      expect(dictionaries[language]['materials.formats']).toContain('HTTP(S)')
      expect(dictionaries[language]['materials.bookmarks']).toContain('Guitar Pro')
    }
    expect(dictionaries.en['materials.local']).toContain('not uploaded')
    for (const language of ['en', 'ru', 'it', 'fr']) {
      for (const key of ['materials.accountScope', 'materials.legacy', 'materials.capacity', 'auth.rateLimited', 'auth.unavailable', 'auth.recoveryFailed', 'auth.invalidRequest', 'auth.signInFailed']) expect(dictionaries[language][key], `${language}:${key}`).toBeTruthy()
      expect(dictionaries[language]['auth.rateLimited']).toContain('{seconds}')
      expect(dictionaries[language]['materials.local']).toContain('DevTools')
    }
    expect(dictionaries.en['materials.network']).toContain('does not download')
    expect(dictionaries.en['materials.browser']).toContain('codec')
    expect(dictionaries.en['materials.bookmarks']).toContain('not PDF pages')
    const component = readFileSync('src/components/MaterialsInfo.tsx', 'utf8')
    for (const key of keys.filter(key => key.startsWith('materials.'))) expect(component).toContain(`'${key}'`)
    expect(component).toContain('aria-haspopup="dialog"')
    expect(component).toContain('aria-label={t(\'Learning materials\')}')
  })

  it('covers Configured Blocks controls and feedback in all four languages', () => {
    const source = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionarySource = source.slice(source.indexOf('const pageTranslations:'), source.indexOf('const I18nContext ='))
    const dictionaries = runInNewContext(transpileModule(`${dictionarySource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
    const keys = ['Replace block', 'Remove block', 'Add a block', 'Add another block', 'Current week', 'Loading blocks…', 'Could not load block composition.', 'No blocks yet', 'Save composition', 'Retry', 'Close', 'Initial week blocks', 'No scheduled weeks for this program.', 'Block categories', 'Blocks in category', 'Custom block name', 'Create block', 'Creating…', 'Could not create the block.', 'Selected']
    for (const language of ['en', 'ru', 'it', 'fr']) {
      expect(keys.filter((key) => !dictionaries[language][key])).toEqual([])
    }
  })

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