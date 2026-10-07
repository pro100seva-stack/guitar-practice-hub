import { describe, expect, it } from 'vitest'
import { defaultProgramBlockKeys, defaultProgramCopy } from '../supabase/functions/account-gateway/default-program'

describe('account gateway default program', () => {
  it('uses the approved block set in order', () => {
    expect(defaultProgramBlockKeys).toEqual(['chromatic', 'rhythm', 'chord_changes', 'repertoire'])
  })

  it('uses the approved localized weekly focus labels', () => {
    expect(defaultProgramCopy.en.focuses).toEqual([
      'Familiar patterns',
      'Even playing',
      'Connect the parts',
      'Recall and connect',
      'Review and choose',
    ])
    expect(defaultProgramCopy.ru.focuses).toEqual([
      'Знакомые рисунки',
      'Ровная игра',
      'Связать элементы',
      'Вспомнить и соединить',
      'Повторить и выбрать',
    ])
    expect(defaultProgramCopy.it.focuses).toEqual([
      'Schemi familiari',
      'Suono uniforme',
      'Collegare le parti',
      'Ricordare e collegare',
      'Ripassare e scegliere',
    ])
    expect(defaultProgramCopy.fr.focuses).toEqual([
      'Motifs familiers',
      'Jeu régulier',
      'Relier les éléments',
      'Se rappeler et relier',
      'Réviser et choisir',
    ])
  })

  it('sets the same optional, comfortable, pain-aware guidance in every language', () => {
    for (const language of ['en', 'ru', 'it', 'fr'] as const) {
      expect(defaultProgramCopy[language].tasks.length).toBeGreaterThan(0)
      expect(defaultProgramCopy[language].focuses).toHaveLength(5)
    }
    expect(defaultProgramCopy.en.tasks).toContain('Optional ideas')
    expect(defaultProgramCopy.en.tasks).toContain('play comfortably')
    expect(defaultProgramCopy.en.tasks).toContain('clear notes and a steady pulse')
    expect(defaultProgramCopy.en.tasks).toContain('Note what to revisit')
    expect(defaultProgramCopy.en.tasks).toContain('No speed goals or fixed minutes')
    expect(defaultProgramCopy.en.tasks).toContain('stop if you feel pain')
    expect(defaultProgramCopy.ru.tasks).toContain('Необязательные идеи')
    expect(defaultProgramCopy.ru.tasks).toContain('играйте комфортно')
    expect(defaultProgramCopy.ru.tasks).toContain('ровном пульсе')
    expect(defaultProgramCopy.ru.tasks).toContain('Отмечайте, к чему вернуться')
    expect(defaultProgramCopy.ru.tasks).toContain('Без целей по скорости и фиксированного времени')
    expect(defaultProgramCopy.ru.tasks).toContain('боль')
    expect(defaultProgramCopy.it.tasks).toContain('Idee facoltative')
    expect(defaultProgramCopy.it.tasks).toContain('suona comodamente')
    expect(defaultProgramCopy.it.tasks).toContain('note chiare e una pulsazione regolare')
    expect(defaultProgramCopy.it.tasks).toContain('Segna cosa riprendere')
    expect(defaultProgramCopy.it.tasks).toContain('Nessun obiettivo di velocità o durata fissa')
    expect(defaultProgramCopy.it.tasks).toContain('dolore')
    expect(defaultProgramCopy.fr.tasks).toContain('Idées facultatives')
    expect(defaultProgramCopy.fr.tasks).toContain('jouez confortablement')
    expect(defaultProgramCopy.fr.tasks).toContain('notes claires et une pulsation régulière')
    expect(defaultProgramCopy.fr.tasks).toContain('Notez ce qu’il faudra revoir')
    expect(defaultProgramCopy.fr.tasks).toContain('Pas d’objectif de vitesse ni de durée fixe')
    expect(defaultProgramCopy.fr.tasks).toContain('douleur')
  })
})