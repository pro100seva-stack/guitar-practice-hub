import type { Language } from './language'

export type DefaultMaterial = {
  title: string
  detail: string
  filePath?: string
}

const materials: Record<Language, Record<string, DefaultMaterial[]>> = {
  en: {
    chromatic: [
      { title: 'Easy chromatic pattern', detail: 'Optionally play 1-2-3-4 across the strings, then reverse. Keep it easy and even.' },
      { title: 'Finger independence', detail: 'Keep each finger close to the fretboard and use a relaxed, even attack.' },
    ],
    technique: [
      { title: 'Alternate picking', detail: 'Start slowly with a metronome and increase speed only while every note stays clear.' },
      { title: 'Legato control', detail: 'Practice hammer-ons and pull-offs with equal volume between picked and unpicked notes.' },
    ],
    rhythm: [
      { title: 'Steady familiar strum', detail: 'Strum a familiar chord while counting a steady pulse, at a comfortable pace.' },
      { title: 'Metronome subdivisions', detail: 'Count quarter notes, eighth notes, and sixteenth notes before adding syncopation.' },
      { title: 'Strumming consistency', detail: 'Keep the picking hand moving evenly, including during silent strokes.' },
    ],
    harmony: [
      { title: 'Chord-tone map', detail: 'Locate the root, third, and fifth before building an improvised phrase.' },
      { title: 'Triad movement', detail: 'Connect nearby triad shapes instead of jumping to a new position.' },
    ],
    repertoire: [
      { title: 'Choose a song passage', detail: 'Choose a passage, play it comfortably, and note what you would like to revisit.' },
      { title: 'Full-song run', detail: 'Finish with one uninterrupted run and note the next section to refine.' },
    ],
    chord_changes: [
      { title: 'Two familiar chords', detail: 'Move slowly between two familiar chords. Aim for clear changes, not speed.' },
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
    chromatic: [{ title: 'Простой хроматический рисунок', detail: 'По желанию сыграйте 1-2-3-4 на струнах, затем в обратном порядке. Играйте легко и ровно.' }, { title: 'Независимость пальцев', detail: 'Держите пальцы близко к грифу и играйте расслабленно и ровно.' }],
    technique: [{ title: 'Переменный штрих', detail: 'Начните медленно с метрономом и ускоряйтесь только при чистом звучании каждой ноты.' }, { title: 'Контроль легато', detail: 'Отрабатывайте хаммер-оны и пулл-оффы с одинаковой громкостью нот.' }],
    rhythm: [{ title: 'Ровный бой знакомого аккорда', detail: 'Играйте бой знакомого аккорда, считая ровный пульс в комфортном темпе.' }, { title: 'Деление под метроном', detail: 'Считайте четверти, восьмые и шестнадцатые, затем добавляйте синкопы.' }, { title: 'Ровный бой', detail: 'Сохраняйте равномерное движение правой руки, включая беззвучные взмахи.' }],
    harmony: [{ title: 'Карта аккордовых тонов', detail: 'Найдите тонику, терцию и квинту перед построением импровизационной фразы.' }, { title: 'Движение трезвучий', detail: 'Соединяйте близкие формы трезвучий вместо резких переходов между позициями.' }],
    repertoire: [{ title: 'Фрагмент знакомой песни', detail: 'Выберите фрагмент песни, сыграйте его комфортно и отметьте, что стоит повторить.' }, { title: 'Медленная отработка', detail: 'Изолируйте сложную фразу, зациклите её медленно, затем соедините с соседними тактами.' }, { title: 'Прогон песни', detail: 'Завершите практику цельным прогоном и отметьте следующий фрагмент для работы.' }],
    chord_changes: [{ title: 'Два знакомых аккорда', detail: 'Медленно переходите между двумя знакомыми аккордами. Важна чистота, а не скорость.' }],
    evening: [{ title: 'Спокойное повторение', detail: 'Тихо сыграйте знакомый материал и остановитесь до появления напряжения в руках.' }, { title: 'Игра по памяти', detail: 'Сыграйте фрагмент без подсказок, затем проверьте, что нужно закрепить.' }],
    learning: [{ title: 'Активное слушание', detail: 'Запишите одну технику, фразу или идею, которую попробуете сразу после просмотра.' }, { title: 'Заметки по материалу', detail: 'Сохраняйте один короткий вывод после каждого курса, видео или занятия теорией.' }],
  },
  it: {
    chromatic: [{ title: 'Schema cromatico semplice', detail: 'Se ti va, suona 1-2-3-4 sulle corde e poi al contrario. Mantieni un ritmo facile e uniforme.' }, { title: 'Indipendenza delle dita', detail: 'Tieni le dita vicine alla tastiera e usa un attacco rilassato e uniforme.' }],
    technique: [{ title: 'Pennata alternata', detail: 'Inizia lentamente con il metronomo e aumenta la velocità solo mantenendo note pulite.' }, { title: 'Controllo del legato', detail: 'Esercita hammer-on e pull-off con volume uniforme tra note pizzicate e legate.' }],
    rhythm: [{ title: 'Accompagnamento regolare', detail: 'Suona un accordo familiare contando un ritmo regolare, a un’andatura confortevole.' }, { title: 'Suddivisioni con metronomo', detail: 'Conta quarti, ottavi e sedicesimi prima di aggiungere sincopi.' }, { title: 'Strumming uniforme', detail: 'Mantieni costante il movimento della mano, anche nei colpi silenziosi.' }],
    harmony: [{ title: 'Mappa delle note dell’accordo', detail: 'Trova fondamentale, terza e quinta prima di costruire una frase improvvisata.' }, { title: 'Movimento delle triadi', detail: 'Collega forme di triade vicine invece di saltare tra posizioni lontane.' }],
    repertoire: [{ title: 'Scegli un passaggio', detail: 'Scegli un passaggio di un brano, suonalo con comodità e annota cosa riprendere.' }, { title: 'Studio lento delle sezioni', detail: 'Isola la frase difficile, ripetila lentamente e ricollegala alle battute vicine.' }, { title: 'Esecuzione completa', detail: 'Concludi con un’esecuzione senza interruzioni e annota la prossima sezione da perfezionare.' }],
    chord_changes: [{ title: 'Due accordi familiari', detail: 'Passa lentamente tra due accordi familiari. Punta alla chiarezza, non alla velocità.' }],
    evening: [{ title: 'Ripasso rilassato', detail: 'Suona materiale familiare a volume basso e fermati prima che compaia tensione.' }, { title: 'Passaggio a memoria', detail: 'Suona una sezione senza guardare gli appunti, poi controlla cosa rinforzare.' }],
    learning: [{ title: 'Ascolto attivo', detail: 'Annota una tecnica, frase o idea da provare subito dopo il video.' }, { title: 'Note di riferimento', detail: 'Conserva un breve insegnamento per ogni corso, video o sessione di teoria.' }],
  },
  fr: {
    chromatic: [{ title: 'Motif chromatique simple', detail: 'Si vous le souhaitez, jouez 1-2-3-4 sur les cordes, puis en sens inverse. Restez à l’aise et régulier.' }, { title: 'Indépendance des doigts', detail: 'Gardez les doigts près du manche et utilisez une attaque détendue et régulière.' }],
    technique: [{ title: 'Aller-retour', detail: 'Commencez lentement avec le métronome et accélérez seulement si chaque note reste nette.' }, { title: 'Contrôle du legato', detail: 'Travaillez les hammer-ons et pull-offs avec un volume égal entre les notes.' }],
    rhythm: [{ title: 'Battement régulier sur un accord familier', detail: 'Grattez un accord familier en comptant une pulsation régulière, à votre rythme.' }, { title: 'Subdivisions au métronome', detail: 'Comptez les noires, croches et doubles-croches avant d’ajouter des syncopes.' }, { title: 'Régularité du mouvement', detail: 'Gardez la main en mouvement de façon régulière, même pendant les coups silencieux.' }],
    harmony: [{ title: 'Carte des notes d’accord', detail: 'Repérez fondamentale, tierce et quinte avant de construire une phrase improvisée.' }, { title: 'Mouvement des triades', detail: 'Reliez des formes de triades proches au lieu de sauter entre les positions.' }],
    repertoire: [{ title: 'Choisir un passage', detail: 'Choisissez un passage, jouez-le confortablement et notez ce que vous souhaitez revoir.' }, { title: 'Travail lent par section', detail: 'Isolez la phrase difficile, répétez-la lentement, puis reconnectez-la aux mesures voisines.' }, { title: 'Exécution complète', detail: 'Terminez par une exécution sans interruption et notez la prochaine section à travailler.' }],
    chord_changes: [{ title: 'Deux accords familiers', detail: 'Passez lentement entre deux accords familiers. Privilégiez la netteté, pas la vitesse.' }],
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