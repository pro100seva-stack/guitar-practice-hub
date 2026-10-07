export const defaultProgramBlockKeys = [
  'chromatic',
  'rhythm',
  'chord_changes',
  'repertoire',
] as const

export const defaultProgramCopy = {
  en: {
    name: 'Default Practice Program',
    focuses: ['Familiar patterns', 'Even playing', 'Connect the parts', 'Recall and connect', 'Review and choose'],
    tasks: 'Optional ideas: play comfortably, focusing on clear notes and a steady pulse. Note what to revisit. No speed goals or fixed minutes; stop if you feel pain.',
  },
  ru: {
    name: 'Основная программа практики',
    focuses: ['Знакомые рисунки', 'Ровная игра', 'Связать элементы', 'Вспомнить и соединить', 'Повторить и выбрать'],
    tasks: 'Необязательные идеи: играйте комфортно, сосредоточившись на чистых нотах и ровном пульсе. Отмечайте, к чему вернуться. Без целей по скорости и фиксированного времени; остановитесь, если почувствуете боль.',
  },
  it: {
    name: 'Programma di pratica predefinito',
    focuses: ['Schemi familiari', 'Suono uniforme', 'Collegare le parti', 'Ricordare e collegare', 'Ripassare e scegliere'],
    tasks: 'Idee facoltative: suona comodamente, concentrandoti su note chiare e una pulsazione regolare. Segna cosa riprendere. Nessun obiettivo di velocità o durata fissa; fermati se senti dolore.',
  },
  fr: {
    name: 'Programme de pratique par défaut',
    focuses: ['Motifs familiers', 'Jeu régulier', 'Relier les éléments', 'Se rappeler et relier', 'Réviser et choisir'],
    tasks: 'Idées facultatives : jouez confortablement, en vous concentrant sur des notes claires et une pulsation régulière. Notez ce qu’il faudra revoir. Pas d’objectif de vitesse ni de durée fixe ; arrêtez-vous en cas de douleur.',
  },
} as const