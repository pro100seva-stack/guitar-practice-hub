// Titles and bodies are i18n keys; the overlay translates them with t().
export type TourStep = { target: string; title: string; body: string }

// Shown as a centered card (empty target, no spotlight) when none of a screen's anchors appear.
const planFallback: TourStep = { target: '', title: 'This week\'s plan', body: 'Add or open a week on the Plan screen to use this plan. Once a week covers today, its tour will appear here.' }
const genericFallback: TourStep = { target: '', title: 'Guided tour', body: 'This screen has nothing to point at yet. Open Help again once its content has loaded.' }

export function fallbackStep(path: string): TourStep {
  return path === '/plan' ? planFallback : genericFallback
}

export const tourSteps: Record<string, TourStep[]> = {
  '/landing': [
    { target: '[data-tour="menu"]', title: 'Your navigation menu', body: 'Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.' },
    { target: '[data-tour="progress"]', title: 'Track your progress', body: 'Review completed practice, upcoming weeks, and your progress timeline here.' },
    { target: '[data-tour="current-week"]', title: 'Plan your week', body: 'Open the current week to edit focus, tasks, ToDos, and songs.' },
    { target: '[data-tour="practice"]', title: 'Practice and log work', body: 'Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.' },
  ],
  '/progress': [
    { target: '[data-tour="progress-timeline"]', title: 'Your timeline', body: 'See every program and week as a journey: what you finished, where you are now, and what comes next.' },
    { target: '[data-tour="stats-link"]', title: 'Stats shortcut', body: 'Jump from here to Stats for your totals, streaks, and practice charts.' },
  ],
  '/plan': [
    { target: '[data-tour="plan-week"]', title: 'This week\'s plan', body: 'Pick a week, set its focus and tasks, then press Save plan to keep your changes.' },
    { target: '[data-tour="plan-songs-todos"]', title: 'Songs and ToDos', body: 'Keep a ToDo list for the week and add the songs you are learning, one per line.' },
  ],
  '/practice': [
    { target: '[data-tour="practice-day-blocks"]', title: 'Choose a day and blocks', body: 'Select a day, then choose your first block.' },
    { target: '[data-tour="practice-tools"]', title: 'Timer, metronome and tuner', body: 'Keep time with the metronome, tune your guitar, and time each block while you play.' },
    { target: '[data-tour="practice-save"]', title: 'Save your session', body: 'Add a few notes and save the session so it counts toward your progress and stats.' },
  ],
  '/stats': [
    { target: '[data-tour="stats-filters"]', title: 'Filter your stats', body: 'Switch between the current week, month, year, a custom range, or your full history.' },
    { target: '[data-tour="stats-summary"]', title: 'Your totals', body: 'Practice time, sessions logged, your current streak, and the selected period at a glance.' },
  ],
  '/settings': [
    { target: '[data-tour="settings-language"]', title: 'Interface language', body: 'Choose the language of the app. It is saved to your account and used on every device.' },
    { target: '[data-tour="settings-preferences"]', title: 'Preferences', body: 'Turn practice options on or off, such as default exercises and target practice time.' },
  ],
}
