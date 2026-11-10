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
    { target: '[data-tour="menu"]', title: 'Menu and Help', body: 'Switch screens here. Tap Help at the bottom of any screen to replay its tour.' },
    { target: '[data-tour="progress"]', title: 'Track progress', body: 'See finished and upcoming weeks. Your first session shows up here.' },
    { target: '[data-tour="current-week"]', title: 'Plan your week', body: 'tour.songPlan' },
    { target: '[data-tour="practice"]', title: 'Practice and log', body: 'Pick blocks, use the timer, metronome and tuner, then save the session.' },
    { target: '[data-tour="featured-guitar"]', title: 'Featured guitar', body: 'Open the Frankenstrat note to read about the guitar shown here.' },
    { target: '[data-tour="help"]', title: 'Help', body: 'After closing this tour, use Help to replay this screen’s cards anytime.' },
  ],
  '/progress': [
    { target: '[data-tour="progress-timeline"]', title: 'Your timeline', body: 'Tap a program to open its weeks. Tap a week to open it in Plan; Practice starts that week.' },
    { target: '[data-tour="stats-link"]', title: 'Stats shortcut', body: 'Open Stats for totals, streaks and charts.' },
  ],
  '/plan': [
    { target: '[data-tour="plan-weeks"]', title: 'Your weeks', body: 'Each row is a practice week. Select one to edit it. Today marks this week.' },
    { target: '[data-tour="plan-week"]', title: 'Selected week', body: 'Set the focus, program and dates for the week you picked.' },
    { target: '[data-tour="plan-tasks"]', title: 'Weekly tasks', body: 'Write what to work on. Practice shows it as the week description.' },
    { target: '[data-tour="plan-repertoire"]', title: 'Week repertoire', body: 'tour.weekSongs' },
    { target: '[data-tour="plan-save"]', title: 'Save your plan', body: 'tour.planSave' },
    { target: '[data-tour="plan-practice"]', title: 'Practice', body: 'Open Practice for the selected week. Unsaved edits ask for your decision first.' },
  ],
  '/practice': [
    { target: '[data-tour="practice-days"]', title: 'Pick a day', body: 'Choose the day to log. Today is marked; days with a session show a check.' },
    { target: '[data-tour="practice-block-picker"]', title: 'Add a block', body: 'Blocks are what you practice, like warm-up or technique. Add at least one.' },
    { target: '[data-tour="practice-details"]', title: 'Block details', body: 'tour.blockName' },
    { target: '[data-tour="practice-songs"]', title: 'Songs', body: 'tour.practiceSongs' },
    { target: '[data-tour="practice-tools"]', title: 'Metronome and tuner', body: 'Tap play/stop; hold or right-click for settings. The tuner is beside it.' },
    { target: '[data-tour="practice-save"]', title: 'Save your session', body: 'Save logs your blocks and notes. Add a block to unlock a new session; saved days can save changes.' },
  ],
  '/stats': [
    { target: '[data-tour="stats-filters"]', title: 'Choose a period', body: 'Switch between week, month, year, a custom range or all time.' },
    { target: '[data-tour="stats-summary"]', title: 'Your totals', body: 'Time, sessions and streak for the chosen period. Charts are below.' },
  ],
  '/settings': [
    { target: '[data-tour="settings-language"]', title: 'Interface language', body: 'Choose the language of the app. It is saved to your account and used on every device.' },
    { target: '[data-tour="settings-preferences"]', title: 'Preferences', body: 'Turn practice options on or off, such as default exercises and target practice time.' },
  ],
}
