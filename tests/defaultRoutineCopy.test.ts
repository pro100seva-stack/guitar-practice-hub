import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getDefaultMaterials } from '../src/lib/defaultMaterials'
import { getDefaultProgramCopy, supportedLanguages } from '../src/lib/language'

const expectedFocuses = {
  en: ['Familiar patterns', 'Even playing', 'Connect the parts', 'Recall and connect', 'Review and choose'],
  ru: ['Знакомые рисунки', 'Ровная игра', 'Связать элементы', 'Вспомнить и соединить', 'Повторить и выбрать'],
  it: ['Schemi familiari', 'Suono uniforme', 'Collegare le parti', 'Ricordare e collegare', 'Ripassare e scegliere'],
  fr: ['Motifs familiers', 'Jeu régulier', 'Relier les éléments', 'Se rappeler et relier', 'Réviser et choisir'],
}

const routineBlocks = ['chromatic', 'rhythm', 'chord_changes', 'repertoire']

describe('beginner Default routine copy', () => {
  it('binds the supplied PDF exclusively to localized two-notes-per-string materials', () => {
    const filePath = '/default-exercises/2-notes-per-string/2-notes-per-string.pdf'
    expect(readFileSync(new URL(`../public${filePath}`, import.meta.url)).subarray(0, 5).toString()).toBe('%PDF-')
    for (const language of supportedLanguages) {
      const entries = getDefaultMaterials(language, 'two_notes_per_string')
      expect(entries).toHaveLength(1)
      expect(entries[0].filePath).toBe(filePath)
      expect(entries[0].detail.trim()).not.toBe('')
      if (language !== 'en') {
        expect(entries[0].title).not.toBe(getDefaultMaterials('en', 'two_notes_per_string')[0].title)
        expect(entries[0].detail).not.toBe(getDefaultMaterials('en', 'two_notes_per_string')[0].detail)
      }
      for (const key of [...routineBlocks, 'technique', 'harmony', 'evening', 'learning', 'warmup']) {
        expect(getDefaultMaterials(language, key).some(entry => entry.filePath === filePath)).toBe(false)
      }
    }
  })

  it('provides the approved focuses and optional general guidance in every language', () => {
    for (const language of supportedLanguages) {
      const copy = getDefaultProgramCopy(language)
      expect(copy.focuses).toEqual(expectedFocuses[language])
      expect(copy.tasks.trim()).not.toBe('')
    }
  })

  it('provides localized guidance for each routine block in every language', () => {
    for (const language of supportedLanguages) {
      for (const block of routineBlocks) {
        const materials = getDefaultMaterials(language, block)
        const englishMaterial = getDefaultMaterials('en', block)[0]
        expect(materials.length, `${language}/${block}`).toBeGreaterThan(0)
        expect(materials[0].title.trim(), `${language}/${block} title`).not.toBe('')
        expect(materials[0].detail.trim(), `${language}/${block} detail`).not.toBe('')
        if (language !== 'en') {
          expect(materials[0].title, `${language}/${block} title fallback`).not.toBe(englishMaterial.title)
          expect(materials[0].detail, `${language}/${block} detail fallback`).not.toBe(englishMaterial.detail)
        }
      }
    }
  })
})