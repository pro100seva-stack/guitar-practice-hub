import type { Language } from './language'

export type DefaultMaterial = {
  title: string
  detail: string
  filePath?: string
}

const materials: Record<Language, Record<string, DefaultMaterial[]>> = {
  en: {
    chromatic: [
      { title: 'Chromatic warm-up', detail: 'Play 1-2-3-4 across every string, then reverse the pattern.' },
      { title: 'Finger independence', detail: 'Keep each finger close to the fretboard and use a relaxed, even attack.' },
    ],
    technique: [
      { title: 'Alternate picking', detail: 'Start slowly with a metronome and increase speed only while every note stays clear.' },
      { title: 'Legato control', detail: 'Practice hammer-ons and pull-offs with equal volume between picked and unpicked notes.' },
    ],
    rhythm: [
      { title: 'Metronome subdivisions', detail: 'Count quarter notes, eighth notes, and sixteenth notes before adding syncopation.' },
      { title: 'Strumming consistency', detail: 'Keep the picking hand moving evenly, including during silent strokes.' },
    ],
    harmony: [
      { title: 'Chord-tone map', detail: 'Locate the root, third, and fifth before building an improvised phrase.' },
      { title: 'Triad movement', detail: 'Connect nearby triad shapes instead of jumping to a new position.' },
    ],
    repertoire: [
      { title: 'Slow section practice', detail: 'Isolate one difficult phrase, loop it slowly, then reconnect it to the surrounding bars.' },
      { title: 'Full-song run', detail: 'Finish with one uninterrupted run and note the next section to refine.' },
    ],
    evening: [
      { title: 'Relaxed review', detail: 'Play familiar material quietly and stop before tension builds in either hand.' },
      { title: 'Memory pass', detail: 'Play one section without looking at notes, then check what needs reinforcement.' },
    ],
    learning: [
      { title: 'Active listening', detail: 'Write down one technique, phrase, or idea to try immediately after watching.' },
      { title: 'Reference notes', detail: 'Keep one short takeaway from each course, video, or theory session.' },
    ],
  },
  ru: {
    chromatic: [{ title: 'Хроматическая разминка', detail: 'Играйте 1-2-3-4 на каждой струне, затем повторите рисунок в обратную сторону.' }, { title: 'Независимость пальцев', detail: 'Держите пальцы близко к грифу и играйте расслабленно и ровно.' }],
    technique: [{ title: 'Переменный штрих', detail: 'Начните медленно с метрономом и ускоряйтесь только при чистом звучании каждой ноты.' }, { title: 'Контроль легато', detail: 'Отрабатывайте хаммер-оны и пулл-оффы с одинаковой громкостью нот.' }],
    rhythm: [{ title: 'Деление под метроном', detail: 'Считайте четверти, восьмые и шестнадцатые, затем добавляйте синкопы.' }, { title: 'Ровный бой', detail: 'Сохраняйте равномерное движение правой руки, включая беззвучные взмахи.' }],
    harmony: [{ title: 'Карта аккордовых тонов', detail: 'Найдите тонику, терцию и квинту перед построением импровизационной фразы.' }, { title: 'Движение трезвучий', detail: 'Соединяйте близкие формы трезвучий вместо резких переходов между позициями.' }],
    repertoire: [{ title: 'Медленная отработка', detail: 'Изолируйте сложную фразу, зациклите её медленно, затем соедините с соседними тактами.' }, { title: 'Прогон песни', detail: 'Завершите практику цельным прогоном и отметьте следующий фрагмент для работы.' }],
    evening: [{ title: 'Спокойное повторение', detail: 'Тихо сыграйте знакомый материал и остановитесь до появления напряжения в руках.' }, { title: 'Игра по памяти', detail: 'Сыграйте фрагмент без подсказок, затем проверьте, что нужно закрепить.' }],
    learning: [{ title: 'Активное слушание', detail: 'Запишите одну технику, фразу или идею, которую попробуете сразу после просмотра.' }, { title: 'Заметки по материалу', detail: 'Сохраняйте один короткий вывод после каждого курса, видео или занятия теорией.' }],
  },
  it: {
    chromatic: [{ title: 'Riscaldamento cromatico', detail: 'Suona 1-2-3-4 su ogni corda, poi ripeti il disegno al contrario.' }, { title: 'Indipendenza delle dita', detail: 'Tieni le dita vicine alla tastiera e usa un attacco rilassato e uniforme.' }],
    technique: [{ title: 'Pennata alternata', detail: 'Inizia lentamente con il metronomo e aumenta la velocità solo mantenendo note pulite.' }, { title: 'Controllo del legato', detail: 'Esercita hammer-on e pull-off con volume uniforme tra note pizzicate e legate.' }],
    rhythm: [{ title: 'Suddivisioni con metronomo', detail: 'Conta quarti, ottavi e sedicesimi prima di aggiungere sincopi.' }, { title: 'Strumming uniforme', detail: 'Mantieni costante il movimento della mano, anche nei colpi silenziosi.' }],
    harmony: [{ title: 'Mappa delle note dell’accordo', detail: 'Trova fondamentale, terza e quinta prima di costruire una frase improvvisata.' }, { title: 'Movimento delle triadi', detail: 'Collega forme di triade vicine invece di saltare tra posizioni lontane.' }],
    repertoire: [{ title: 'Studio lento delle sezioni', detail: 'Isola la frase difficile, ripetila lentamente e ricollegala alle battute vicine.' }, { title: 'Esecuzione completa', detail: 'Concludi con un’esecuzione senza interruzioni e annota la prossima sezione da perfezionare.' }],
    evening: [{ title: 'Ripasso rilassato', detail: 'Suona materiale familiare a volume basso e fermati prima che compaia tensione.' }, { title: 'Passaggio a memoria', detail: 'Suona una sezione senza guardare gli appunti, poi controlla cosa rinforzare.' }],
    learning: [{ title: 'Ascolto attivo', detail: 'Annota una tecnica, frase o idea da provare subito dopo il video.' }, { title: 'Note di riferimento', detail: 'Conserva un breve insegnamento per ogni corso, video o sessione di teoria.' }],
  },
  fr: {
    chromatic: [{ title: 'Échauffement chromatique', detail: 'Jouez 1-2-3-4 sur chaque corde, puis répétez le motif en sens inverse.' }, { title: 'Indépendance des doigts', detail: 'Gardez les doigts près du manche et utilisez une attaque détendue et régulière.' }],
    technique: [{ title: 'Aller-retour', detail: 'Commencez lentement avec le métronome et accélérez seulement si chaque note reste nette.' }, { title: 'Contrôle du legato', detail: 'Travaillez les hammer-ons et pull-offs avec un volume égal entre les notes.' }],
    rhythm: [{ title: 'Subdivisions au métronome', detail: 'Comptez les noires, croches et doubles-croches avant d’ajouter des syncopes.' }, { title: 'Régularité du mouvement', detail: 'Gardez la main en mouvement de façon régulière, même pendant les coups silencieux.' }],
    harmony: [{ title: 'Carte des notes d’accord', detail: 'Repérez fondamentale, tierce et quinte avant de construire une phrase improvisée.' }, { title: 'Mouvement des triades', detail: 'Reliez des formes de triades proches au lieu de sauter entre les positions.' }],
    repertoire: [{ title: 'Travail lent par section', detail: 'Isolez la phrase difficile, répétez-la lentement, puis reconnectez-la aux mesures voisines.' }, { title: 'Exécution complète', detail: 'Terminez par une exécution sans interruption et notez la prochaine section à travailler.' }],
    evening: [{ title: 'Révision détendue', detail: 'Jouez doucement du matériel familier et arrêtez-vous avant l’apparition de tensions.' }, { title: 'Passage de mémoire', detail: 'Jouez une section sans regarder vos notes, puis vérifiez ce qui doit être renforcé.' }],
    learning: [{ title: 'Écoute active', detail: 'Notez une technique, une phrase ou une idée à essayer juste après le visionnage.' }, { title: 'Notes de référence', detail: 'Gardez une courte idée à retenir pour chaque cours, vidéo ou séance de théorie.' }],
  },
}

const suppliedFiles: Record<string, string> = {
  chromatic: '/default-exercises/chromatic/Warmup.pdf',
  learning: '/default-exercises/learning/Solo-On-Guitar-The-Improvisers-Toolkit-PDF.pdf',
}

export function getDefaultMaterials(language: Language, blockKey: string) {
  return (materials[language][blockKey] ?? materials.en[blockKey] ?? []).map((material, index) => ({
    ...material,
    filePath: index === 0 ? suppliedFiles[blockKey] : undefined,
  }))
}