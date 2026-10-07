import { describe, expect, it } from 'vitest'
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