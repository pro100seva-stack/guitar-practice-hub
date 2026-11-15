import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultLanguage, isLanguage, type Language } from './language'
import { supabase } from './supabase'
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, onLocalMaterialInvalidation } from './localMaterialAccess'

type TranslationValues = Record<string, string | number>

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, values?: TranslationValues) => string
}

const pageTranslations: Record<Language, Record<string, string>> = {
  en: {
    'Practice plan': 'Practice plan', 'Week overview': 'Week overview', 'Practice weeks': 'Practice weeks', 'Add week': 'Add week', 'Insert after selected': 'Insert after selected', 'Start': 'Start', 'End': 'End', 'Navigate weeks': 'Navigate weeks', 'Remove week': 'Remove week', 'Current week': 'Current week', 'Choose a covered week': 'Choose a covered week', 'Prev': 'Prev', 'Next': 'Next', 'Today': 'Today', 'Updated': 'Updated', 'Draft': 'Draft', 'Selected week': 'Selected week', 'Focus': 'Focus', 'Short title for the week': 'Short title for the week', 'Week info': 'Week info', 'Program': 'Program', 'Other': 'Other', 'Program name': 'Program name', 'Your program name': 'Your program name', 'Dates': 'Dates', 'Tasks': 'Tasks', 'Describe the week plan': 'Describe the week plan', 'Topics': 'Topics', '+ Add topic': '+ Add topic', 'No topics yet for this week.': 'No topics yet for this week.', 'Topic name': 'Topic name', 'Remove': 'Remove', 'Songs': 'Songs', 'Add one song per line': 'Add one song per line', 'Separate songs with line breaks or commas.': 'Separate songs with line breaks or commas.', 'Save plan': 'Save plan', 'Saving…': 'Saving…', 'No plan_weeks row covers today\'s date.': 'No plan_weeks row covers today\'s date.', 'This week is currently unscheduled.': 'This week is currently unscheduled.', 'Week end date must be on or after the start date.': 'Week end date must be on or after the start date.', 'Enter a name for the other program.': 'Enter a name for the other program.', 'Could not add the week.': 'Could not add the week.', 'Could not remove the week.': 'Could not remove the week.', 'Week added successfully.': 'Week added successfully.', 'Week removed successfully.': 'Week removed successfully.', 'Plan updated successfully.': 'Plan updated successfully.',
    'Practice journey': 'Practice journey', 'A tree-style overview of where you are, what you have done, and what is coming next.': 'A tree-style overview of where you are, what you have done, and what is coming next.', 'Loading practice journey…': 'Loading practice journey…', 'No scheduled practice weeks yet. Start a program from Plan.': 'No scheduled practice weeks yet. Start a program from Plan.', 'session': 'session', 'sessions': 'sessions', 'minutes': 'minutes', 'week': 'week', 'weeks': 'weeks', 'Add week after week {week}': 'Add week after week {week}', 'Add week after Week {week}': 'Add week after Week {week}', 'Week focus': 'Week focus', 'Cancel': 'Cancel',
    'Session {date}': 'Session {date}', 'Practice week navigator for the current cycle.': 'Practice week navigator for the current cycle.', 'Metronome': 'Metronome', 'Playing': 'Playing', 'Standby': 'Standby', 'Stop': 'Stop', 'BPM': 'BPM', 'Time': 'Time', 'Custom': 'Custom', 'Beat': 'Beat', 'Measure': 'Measure', 'Tap': 'Tap', 'Tuner': 'Tuner', 'Hide': 'Hide', 'Show': 'Show', 'Guitar tuning': 'Guitar tuning', 'Play {note} reference tone': 'Play {note} reference tone', 'Stop tone': 'Stop tone', 'Practice time': 'Practice time', 'Total across selected blocks': 'Total across selected blocks', 'Jump to': 'Jump to', 'No week selected': 'No week selected', 'Week description': 'Week description', 'No description recorded for this week yet.': 'No description recorded for this week yet.', 'Days in selected week': 'Days in selected week', 'Current day': 'Current day', 'Done': 'Done', 'Selected day': 'Selected day', 'Add practice block': 'Add practice block', 'Choose a block': 'Choose a block', 'Add block': 'Add block', 'No practice blocks selected for this day.': 'No practice blocks selected for this day.', 'Target: {minutes} min': 'Target: {minutes} min', 'No description available for this practice block.': 'No description available for this practice block.', 'Materials stay on this device': 'Materials stay on this device', 'Storage estimate unavailable': 'Storage estimate unavailable', 'Saving locally…': 'Saving locally…', 'Saved on this device': 'Saved on this device', 'Add URL': 'Add URL', 'Close': 'Close', 'Open in browser': 'Open in browser', 'Set A': 'Set A', 'Set B': 'Set B', 'Looping': 'Looping', 'Loop A-B': 'Loop A-B', 'Clear': 'Clear', 'Audio track fallback': 'Audio track fallback', 'Pause': 'Pause', 'Timer': 'Timer', 'Remove block': 'Remove block', 'Notes': 'Notes', 'What did you work on?': 'What did you work on?', 'Save session': 'Save session', 'Recent sessions': 'Recent sessions', 'No sessions yet.': 'No sessions yet.', 'Loading…': 'Loading…', 'Not signed in.': 'Not signed in.', 'Session saved successfully.': 'Session saved successfully.',
    'A simple overview of your practice history.': 'A simple overview of your practice history.', 'Sessions logged': 'Sessions logged', 'Current streak': 'Current streak', 'days': 'days', 'min': 'min', 'week of': 'week of', 'Week of {date}': 'Week of {date}', 'daily': 'daily', 'weekly': 'weekly', 'monthly': 'monthly', 'yearly': 'yearly', 'Imported': 'Imported', 'App': 'App', 'Selected period': 'Selected period', 'Last session': 'Last session', 'No sessions yet': 'No sessions yet', 'Cumulative practice time': 'Cumulative practice time', 'Cumulative practice timeline': 'Cumulative practice timeline', 'Practice blocks': 'Practice blocks', 'Practice block distribution': 'Practice block distribution', 'No block data for this period.': 'No block data for this period.', 'Current Month': 'Current Month', 'This year': 'This year', 'Custom range': 'Custom range', 'Reset': 'Reset', 'From': 'From', 'To': 'To', 'Reset to full history': 'Reset to full history', 'Most continuous streak': 'Most continuous streak', 'Log a session to start building momentum.': 'Log a session to start building momentum.', 'Longest practice': 'Longest practice', 'Your best session will appear here.': 'Your best session will appear here.', 'Peak week': 'Peak week', 'This snapshot will highlight your strongest week.': 'This snapshot will highlight your strongest week.', 'Longest run of consecutive weeks with practice.': 'Longest run of consecutive weeks with practice.', 'Your biggest single session in this range.': 'Your biggest single session in this range.', 'No week yet': 'No week yet', '{date} was your strongest week.': '{date} was your strongest week.', '{value} min total': '{value} min total', 'Error: {error}': 'Error: {error}',
    'Standard · E A D G B E': 'Standard · E A D G B E', 'Drop D · D A D G B E': 'Drop D · D A D G B E', 'DADGAD · D A D G A D': 'DADGAD · D A D G A D', 'Half-step down · Eb Ab Db Gb Bb Eb': 'Half-step down · Eb Ab Db Gb Bb Eb', 'Low E': 'Low E', 'High E': 'High E', 'Low D': 'Low D', 'High D': 'High D',
  },
  ru: {}, it: {}, fr: {},
}

Object.assign(pageTranslations.en, {
  'release.openSummary': 'Open the current release summary',
  'calendar.title': 'Calendar reminders', 'calendar.setUpReminder': 'Set up a reminder', 'calendar.provider': 'Calendar provider',
  'calendar.googleChoice': 'Google Calendar', 'calendar.appleChoice': 'Apple Calendar', 'calendar.deviceChoice': 'Device calendar',
  'calendar.apple': 'Apple Calendar', 'calendar.device': 'Device calendar',
  'calendar.disconnect': 'Disconnect', 'calendar.checkingConnection': 'Checking Google Calendar connection…',
  'calendar.googleConfiguration': 'Google Calendar is not configured.', 'calendar.connect': 'Connect Google Calendar', 'calendar.reconnect': 'Reconnect',
  'calendar.retryLoading': 'Retry loading Google Calendar', 'calendar.googleAccountLinked': 'Google account connected.',
  'calendar.googleSessionLinked': 'Google Calendar connected for this session.', 'calendar.googleReconnect': 'Reconnect Google Calendar to continue.',
  'calendar.noCalendars': 'No calendars are available for this Google account.', 'calendar.destination': 'Calendar',
  'calendar.googleNotifications': 'Google Calendar will use its default notification settings.',
  'calendar.manualImport': 'Download the reminder and import it into your calendar app.',
  'calendar.reminderName': 'Reminder name', 'calendar.eventTitle': 'Guitar practice',
  'calendar.schedule': 'Schedule', 'calendar.once': 'Once', 'calendar.recurring': 'Recurring', 'calendar.severalDates': 'Several dates',
  'calendar.date': 'Date', 'calendar.dateRange': 'Date range', 'calendar.selectSeveral': 'Select dates',
  'calendar.selectedCount': '{count} dates selected', 'calendar.selectedRange': 'Selected range: {start} to {end}',
  'calendar.selectRangeEnd': 'Select the end date', 'calendar.frequency': 'Repeat', 'calendar.every': 'Repeat every',
  'calendar.daily': 'Daily', 'calendar.weekly': 'Weekly', 'calendar.monthly': 'Monthly', 'calendar.everyValue': 'Every {interval}',
  'calendar.allDay': 'All day', 'calendar.time': 'Time', 'calendar.sessionLength': 'Session length',
  'calendar.minutes': '{minutes} minutes', 'calendar.timezone': 'Time zone: {timezone}',
  'calendar.allDayAlerts': 'All-day reminders use your calendar app’s default notification settings.',
  'calendar.timedAlert': 'Timed reminders use your calendar app’s default notification settings.',
  'calendar.review': 'Review reminder', 'calendar.reviewHeading': 'Review calendar reminder',
  'calendar.confirm': 'Add to Google Calendar', 'calendar.confirmFailed': 'Could not add the reminder to Google Calendar.',
  'calendar.addedCount': '{count} reminders added.', 'calendar.pendingCount': '{count} reminders still need to be added.',
  'calendar.importReady': 'Calendar file downloaded. Import it into your calendar app.',
  'calendar.retryPending': 'Retry remaining reminders', 'calendar.download': 'Download calendar file',
  'calendar.downloadAgain': 'Download calendar file again', 'calendar.keepCompleted': 'Keep added reminders',
  'calendar.back': 'Back', 'calendar.previousMonth': 'Previous month', 'calendar.nextMonth': 'Next month',
  'calendar.id': 'Calendar ID', 'calendar.summary': 'Calendar name',
  'calendar.googleSdk': 'Could not load Google Calendar. Check your connection and try again.',
  'calendar.googleConsent': 'Google Calendar authorization was not completed.',
  'calendar.googlePermission': 'Google Calendar permission is missing or the selected calendar is unavailable.',
  'calendar.googleUnavailable': 'Google Calendar is temporarily unavailable. Try again.',
  'calendar.googleConflict': 'A reminder could not be verified. No duplicate was created.',
  'calendar.googleInvalidPlan': 'The reminder details are invalid. Review them and try again.',
  'calendar.invalidDate': 'Choose a valid date.', 'calendar.selectDates': 'Select at least one date.',
  'calendar.invalidTime': 'Enter a valid time.', 'calendar.invalidTimezone': 'Choose a valid time zone.',
  'calendar.invalidDuration': 'Choose a valid session length.', 'calendar.invalidInterval': 'Enter a repeat interval from 1 to 99.',
  'calendar.invalidUntil': 'Choose a valid end date.', 'calendar.nonexistentTime': 'That local time does not exist because of a time change.',
  'calendar.invalidTimestamp': 'A reminder time is invalid.', 'calendar.invalidPlan': 'The reminder details are invalid.',
  'calendar.invalidTitle': 'Enter a reminder name of up to 200 characters.',
  'calendar.invalidDescription': 'The reminder description is too long.',
  'calendar.icsEndRequired': 'Choose an end date for the recurring reminder.',
  'calendar.icsRange': 'The recurring reminder must end within five years.',
})

Object.assign(pageTranslations.ru, {
  'release.openSummary': 'Открыть описание текущей версии',
  'calendar.title': 'Напоминания в календаре', 'calendar.setUpReminder': 'Настроить напоминание', 'calendar.provider': 'Календарь',
  'calendar.googleChoice': 'Google Календарь', 'calendar.appleChoice': 'Календарь Apple', 'calendar.deviceChoice': 'Календарь на устройстве',
  'calendar.apple': 'Календарь Apple', 'calendar.device': 'Календарь на устройстве',
  'calendar.disconnect': 'Отключить', 'calendar.checkingConnection': 'Проверяем подключение к Google Календарю…',
  'calendar.googleConfiguration': 'Google Календарь не настроен.', 'calendar.connect': 'Подключить Google Календарь', 'calendar.reconnect': 'Подключить снова',
  'calendar.retryLoading': 'Повторить загрузку Google Календаря', 'calendar.googleAccountLinked': 'Аккаунт Google подключён.',
  'calendar.googleSessionLinked': 'Google Календарь подключён на время сеанса.', 'calendar.googleReconnect': 'Подключите Google Календарь снова.',
  'calendar.noCalendars': 'В этом аккаунте Google нет доступных календарей.', 'calendar.destination': 'Календарь',
  'calendar.googleNotifications': 'Google Календарь использует стандартные настройки уведомлений.',
  'calendar.manualImport': 'Скачайте напоминание и импортируйте его в приложение календаря.',
  'calendar.reminderName': 'Название напоминания', 'calendar.eventTitle': 'Практика игры на гитаре',
  'calendar.schedule': 'Расписание', 'calendar.once': 'Один раз', 'calendar.recurring': 'Повторять', 'calendar.severalDates': 'Несколько дат',
  'calendar.date': 'Дата', 'calendar.dateRange': 'Диапазон дат', 'calendar.selectSeveral': 'Выберите даты',
  'calendar.selectedCount': 'Выбрано дат: {count}', 'calendar.selectedRange': 'Выбранный период: с {start} по {end}',
  'calendar.selectRangeEnd': 'Выберите конечную дату', 'calendar.frequency': 'Повтор', 'calendar.every': 'Повторять каждые',
  'calendar.daily': 'Каждый день', 'calendar.weekly': 'Каждую неделю', 'calendar.monthly': 'Каждый месяц', 'calendar.everyValue': 'Каждые: {interval}',
  'calendar.allDay': 'Весь день', 'calendar.time': 'Время', 'calendar.sessionLength': 'Длительность занятия',
  'calendar.minutes': '{minutes} мин.', 'calendar.timezone': 'Часовой пояс: {timezone}',
  'calendar.allDayAlerts': 'Для напоминаний на весь день используются стандартные уведомления календаря.',
  'calendar.timedAlert': 'Используются стандартные настройки уведомлений календаря.',
  'calendar.review': 'Проверить напоминание', 'calendar.reviewHeading': 'Проверьте напоминание',
  'calendar.confirm': 'Добавить в Google Календарь', 'calendar.confirmFailed': 'Не удалось добавить напоминание в Google Календарь.',
  'calendar.addedCount': 'Добавлено напоминаний: {count}', 'calendar.pendingCount': 'Осталось добавить напоминаний: {count}',
  'calendar.importReady': 'Файл календаря скачан. Импортируйте его в приложение календаря.',
  'calendar.retryPending': 'Повторить добавление', 'calendar.download': 'Скачать файл календаря',
  'calendar.downloadAgain': 'Скачать файл календаря ещё раз', 'calendar.keepCompleted': 'Оставить добавленные напоминания',
  'calendar.back': 'Назад', 'calendar.previousMonth': 'Предыдущий месяц', 'calendar.nextMonth': 'Следующий месяц',
  'calendar.id': 'Идентификатор календаря', 'calendar.summary': 'Название календаря',
  'calendar.googleSdk': 'Не удалось загрузить Google Календарь. Проверьте соединение и повторите попытку.',
  'calendar.googleConsent': 'Не удалось завершить подключение к Google Календарю.',
  'calendar.googlePermission': 'Нет доступа к Google Календарю или выбранный календарь недоступен.',
  'calendar.googleUnavailable': 'Google Календарь временно недоступен. Повторите попытку.',
  'calendar.googleConflict': 'Не удалось проверить напоминание. Дубликат не создан.',
  'calendar.googleInvalidPlan': 'Данные напоминания некорректны. Проверьте их и повторите попытку.',
  'calendar.invalidDate': 'Выберите корректную дату.', 'calendar.selectDates': 'Выберите хотя бы одну дату.',
  'calendar.invalidTime': 'Укажите корректное время.', 'calendar.invalidTimezone': 'Выберите корректный часовой пояс.',
  'calendar.invalidDuration': 'Выберите корректную длительность занятия.', 'calendar.invalidInterval': 'Укажите интервал повтора от 1 до 99.',
  'calendar.invalidUntil': 'Выберите корректную конечную дату.', 'calendar.nonexistentTime': 'Такого местного времени нет из-за перехода времени.',
  'calendar.invalidTimestamp': 'Указано некорректное время напоминания.', 'calendar.invalidPlan': 'Данные напоминания некорректны.',
  'calendar.invalidTitle': 'Название напоминания должно содержать не более 200 символов.',
  'calendar.invalidDescription': 'Описание напоминания слишком длинное.',
  'calendar.icsEndRequired': 'Укажите конечную дату повторяющегося напоминания.',
  'calendar.icsRange': 'Повторяющееся напоминание должно завершаться в течение пяти лет.',
})

Object.assign(pageTranslations.it, {
  'release.openSummary': 'Apri il riepilogo della versione attuale',
  'calendar.title': 'Promemoria del calendario', 'calendar.setUpReminder': 'Configura un promemoria', 'calendar.provider': 'Calendario',
  'calendar.googleChoice': 'Google Calendar', 'calendar.appleChoice': 'Calendario Apple', 'calendar.deviceChoice': 'Calendario del dispositivo',
  'calendar.apple': 'Calendario Apple', 'calendar.device': 'Calendario del dispositivo',
  'calendar.disconnect': 'Disconnetti', 'calendar.checkingConnection': 'Verifica della connessione a Google Calendar…',
  'calendar.googleConfiguration': 'Google Calendar non è configurato.', 'calendar.connect': 'Collega Google Calendar', 'calendar.reconnect': 'Ricollega',
  'calendar.retryLoading': 'Riprova a caricare Google Calendar', 'calendar.googleAccountLinked': 'Account Google collegato.',
  'calendar.googleSessionLinked': 'Google Calendar collegato per questa sessione.', 'calendar.googleReconnect': 'Ricollega Google Calendar per continuare.',
  'calendar.noCalendars': 'Nessun calendario disponibile per questo account Google.', 'calendar.destination': 'Calendario',
  'calendar.googleNotifications': 'Google Calendar userà le impostazioni di notifica predefinite.',
  'calendar.manualImport': 'Scarica il promemoria e importalo nell’app del calendario.',
  'calendar.reminderName': 'Nome del promemoria', 'calendar.eventTitle': 'Pratica di chitarra',
  'calendar.schedule': 'Programmazione', 'calendar.once': 'Una volta', 'calendar.recurring': 'Ricorrente', 'calendar.severalDates': 'Più date',
  'calendar.date': 'Data', 'calendar.dateRange': 'Intervallo di date', 'calendar.selectSeveral': 'Seleziona le date',
  'calendar.selectedCount': '{count} date selezionate', 'calendar.selectedRange': 'Intervallo selezionato: dal {start} al {end}',
  'calendar.selectRangeEnd': 'Seleziona la data finale', 'calendar.frequency': 'Ripeti', 'calendar.every': 'Ripeti ogni',
  'calendar.daily': 'Ogni giorno', 'calendar.weekly': 'Ogni settimana', 'calendar.monthly': 'Ogni mese', 'calendar.everyValue': 'Ogni {interval}',
  'calendar.allDay': 'Tutto il giorno', 'calendar.time': 'Ora', 'calendar.sessionLength': 'Durata della sessione',
  'calendar.minutes': '{minutes} minuti', 'calendar.timezone': 'Fuso orario: {timezone}',
  'calendar.allDayAlerts': 'I promemoria giornalieri usano le notifiche predefinite del calendario.',
  'calendar.timedAlert': 'I promemoria usano le impostazioni di notifica predefinite del calendario.',
  'calendar.review': 'Controlla il promemoria', 'calendar.reviewHeading': 'Controlla il promemoria del calendario',
  'calendar.confirm': 'Aggiungi a Google Calendar', 'calendar.confirmFailed': 'Impossibile aggiungere il promemoria a Google Calendar.',
  'calendar.addedCount': '{count} promemoria aggiunti.', 'calendar.pendingCount': 'Promemoria ancora da aggiungere: {count}.',
  'calendar.importReady': 'File del calendario scaricato. Importalo nell’app del calendario.',
  'calendar.retryPending': 'Riprova i promemoria rimanenti', 'calendar.download': 'Scarica il file del calendario',
  'calendar.downloadAgain': 'Scarica di nuovo il file del calendario', 'calendar.keepCompleted': 'Mantieni i promemoria aggiunti',
  'calendar.back': 'Indietro', 'calendar.previousMonth': 'Mese precedente', 'calendar.nextMonth': 'Mese successivo',
  'calendar.id': 'ID del calendario', 'calendar.summary': 'Nome del calendario',
  'calendar.googleSdk': 'Impossibile caricare Google Calendar. Controlla la connessione e riprova.',
  'calendar.googleConsent': 'Autorizzazione di Google Calendar non completata.',
  'calendar.googlePermission': 'Manca l’autorizzazione a Google Calendar o il calendario selezionato non è disponibile.',
  'calendar.googleUnavailable': 'Google Calendar non è al momento disponibile. Riprova.',
  'calendar.googleConflict': 'Impossibile verificare il promemoria. Non è stato creato alcun duplicato.',
  'calendar.googleInvalidPlan': 'I dati del promemoria non sono validi. Controllali e riprova.',
  'calendar.invalidDate': 'Seleziona una data valida.', 'calendar.selectDates': 'Seleziona almeno una data.',
  'calendar.invalidTime': 'Inserisci un orario valido.', 'calendar.invalidTimezone': 'Seleziona un fuso orario valido.',
  'calendar.invalidDuration': 'Seleziona una durata valida.', 'calendar.invalidInterval': 'Inserisci un intervallo da 1 a 99.',
  'calendar.invalidUntil': 'Seleziona una data finale valida.', 'calendar.nonexistentTime': 'Questo orario locale non esiste a causa del cambio dell’ora.',
  'calendar.invalidTimestamp': 'L’orario del promemoria non è valido.', 'calendar.invalidPlan': 'I dati del promemoria non sono validi.',
  'calendar.invalidTitle': 'Il nome del promemoria deve contenere al massimo 200 caratteri.',
  'calendar.invalidDescription': 'La descrizione del promemoria è troppo lunga.',
  'calendar.icsEndRequired': 'Scegli una data finale per il promemoria ricorrente.',
  'calendar.icsRange': 'Il promemoria ricorrente deve terminare entro cinque anni.',
})

Object.assign(pageTranslations.fr, {
  'release.openSummary': 'Ouvrir le résumé de la version actuelle',
  'calendar.title': 'Rappels du calendrier', 'calendar.setUpReminder': 'Configurer un rappel', 'calendar.provider': 'Calendrier',
  'calendar.googleChoice': 'Google Agenda', 'calendar.appleChoice': 'Calendrier Apple', 'calendar.deviceChoice': 'Calendrier de l’appareil',
  'calendar.apple': 'Calendrier Apple', 'calendar.device': 'Calendrier de l’appareil',
  'calendar.disconnect': 'Déconnecter', 'calendar.checkingConnection': 'Vérification de la connexion à Google Agenda…',
  'calendar.googleConfiguration': 'Google Agenda n’est pas configuré.', 'calendar.connect': 'Connecter Google Agenda', 'calendar.reconnect': 'Reconnecter',
  'calendar.retryLoading': 'Réessayer de charger Google Agenda', 'calendar.googleAccountLinked': 'Compte Google connecté.',
  'calendar.googleSessionLinked': 'Google Agenda est connecté pour cette session.', 'calendar.googleReconnect': 'Reconnectez Google Agenda pour continuer.',
  'calendar.noCalendars': 'Aucun calendrier n’est disponible pour ce compte Google.', 'calendar.destination': 'Calendrier',
  'calendar.googleNotifications': 'Google Agenda utilisera ses paramètres de notification par défaut.',
  'calendar.manualImport': 'Téléchargez le rappel et importez-le dans votre application de calendrier.',
  'calendar.reminderName': 'Nom du rappel', 'calendar.eventTitle': 'Pratique de la guitare',
  'calendar.schedule': 'Programme', 'calendar.once': 'Une fois', 'calendar.recurring': 'Récurrent', 'calendar.severalDates': 'Plusieurs dates',
  'calendar.date': 'Date', 'calendar.dateRange': 'Plage de dates', 'calendar.selectSeveral': 'Sélectionner des dates',
  'calendar.selectedCount': '{count} dates sélectionnées', 'calendar.selectedRange': 'Plage sélectionnée : du {start} au {end}',
  'calendar.selectRangeEnd': 'Sélectionnez la date de fin', 'calendar.frequency': 'Répétition', 'calendar.every': 'Répéter tous les',
  'calendar.daily': 'Tous les jours', 'calendar.weekly': 'Toutes les semaines', 'calendar.monthly': 'Tous les mois', 'calendar.everyValue': 'Tous les {interval}',
  'calendar.allDay': 'Toute la journée', 'calendar.time': 'Heure', 'calendar.sessionLength': 'Durée de la séance',
  'calendar.minutes': '{minutes} minutes', 'calendar.timezone': 'Fuseau horaire : {timezone}',
  'calendar.allDayAlerts': 'Les rappels sur toute la journée utilisent les notifications par défaut du calendrier.',
  'calendar.timedAlert': 'Les rappels utilisent les paramètres de notification par défaut du calendrier.',
  'calendar.review': 'Vérifier le rappel', 'calendar.reviewHeading': 'Vérifier le rappel du calendrier',
  'calendar.confirm': 'Ajouter à Google Agenda', 'calendar.confirmFailed': 'Impossible d’ajouter le rappel à Google Agenda.',
  'calendar.addedCount': '{count} rappels ajoutés.', 'calendar.pendingCount': '{count} rappels restent à ajouter.',
  'calendar.importReady': 'Fichier de calendrier téléchargé. Importez-le dans votre application de calendrier.',
  'calendar.retryPending': 'Réessayer les rappels restants', 'calendar.download': 'Télécharger le fichier calendrier',
  'calendar.downloadAgain': 'Télécharger à nouveau le fichier calendrier', 'calendar.keepCompleted': 'Conserver les rappels ajoutés',
  'calendar.back': 'Retour', 'calendar.previousMonth': 'Mois précédent', 'calendar.nextMonth': 'Mois suivant',
  'calendar.id': 'Identifiant du calendrier', 'calendar.summary': 'Nom du calendrier',
  'calendar.googleSdk': 'Impossible de charger Google Agenda. Vérifiez la connexion et réessayez.',
  'calendar.googleConsent': 'L’autorisation de Google Agenda n’a pas abouti.',
  'calendar.googlePermission': 'L’autorisation Google Agenda manque ou le calendrier sélectionné est indisponible.',
  'calendar.googleUnavailable': 'Google Agenda est temporairement indisponible. Réessayez.',
  'calendar.googleConflict': 'Impossible de vérifier le rappel. Aucun doublon n’a été créé.',
  'calendar.googleInvalidPlan': 'Les détails du rappel sont invalides. Vérifiez-les et réessayez.',
  'calendar.invalidDate': 'Choisissez une date valide.', 'calendar.selectDates': 'Sélectionnez au moins une date.',
  'calendar.invalidTime': 'Saisissez une heure valide.', 'calendar.invalidTimezone': 'Choisissez un fuseau horaire valide.',
  'calendar.invalidDuration': 'Choisissez une durée de séance valide.', 'calendar.invalidInterval': 'Saisissez un intervalle de répétition entre 1 et 99.',
  'calendar.invalidUntil': 'Choisissez une date de fin valide.', 'calendar.nonexistentTime': 'Cette heure locale n’existe pas en raison du changement d’heure.',
  'calendar.invalidTimestamp': 'L’heure du rappel est invalide.', 'calendar.invalidPlan': 'Les détails du rappel sont invalides.',
  'calendar.invalidTitle': 'Le nom du rappel doit comporter au maximum 200 caractères.',
  'calendar.invalidDescription': 'La description du rappel est trop longue.',
  'calendar.icsEndRequired': 'Choisissez une date de fin pour le rappel récurrent.',
  'calendar.icsRange': 'Le rappel récurrent doit se terminer dans les cinq ans.',
})

Object.assign(pageTranslations.en, {
  'Add song': 'Add song',
  'tour.songPlan': 'See and edit this week’s focus, tasks and song choices.',
  'tour.weekSongs': 'Choose songs for this week. Song selections are saved immediately.',
  'tour.planSave': 'Save the week’s focus, program, dates and tasks. Song selections save immediately.',
  'tour.blockName': 'Tap a block name to open its timer and learning materials.',
  'tour.practiceSongs': 'Your songs are available across weeks. Practice adds a song to the selected day’s Repertoire without starting its timer.',
  "songs.unavailable": "Songs are unavailable right now. Check your connection and try again.",
  "songs.empty": "No songs yet.",
  "songs.added": "Added",
  "songs.removeConfirm": "Remove from Songs? Saved practice and materials are kept.",
  "songs.chooseForDay": "Choose a song from Songs below to practice on this day.",
  "songs.unassigned": "Unassigned materials",
  "songs.chooseSong": "Choose a song",
  "songs.move": "Move to song"
})
Object.assign(pageTranslations.ru, {
  'Add song': 'Добавить песню',
  'tour.songPlan': 'Просматривайте и меняйте фокус недели, задачи и выбранные песни.',
  'tour.weekSongs': 'Выберите песни для этой недели. Выбор сохраняется сразу.',
  'tour.planSave': 'Сохраните фокус, программу, даты и задачи недели. Выбор песен сохраняется сразу.',
  'tour.blockName': 'Нажмите на название блока, чтобы открыть таймер и учебные материалы.',
  'tour.practiceSongs': 'Ваши песни доступны во всех неделях. «Практика» добавляет песню в репертуар выбранного дня, не запуская таймер.',
  "songs.unavailable": "Песни сейчас недоступны. Проверьте подключение и попробуйте ещё раз.",
  "songs.empty": "Песен пока нет.",
  "songs.added": "Добавлено",
  "songs.removeConfirm": "Убрать из песен? Практика и материалы сохранятся.",
  "songs.chooseForDay": "Выберите песню в списке ниже для практики в этот день.",
  "songs.unassigned": "Материалы без песни",
  "songs.chooseSong": "Выберите песню",
  "songs.move": "Перенести к песне"
})
Object.assign(pageTranslations.it, {
  'Add song': 'Aggiungi brano',
  'tour.songPlan': 'Visualizza e modifica obiettivo, attività e brani della settimana.',
  'tour.weekSongs': 'Scegli i brani della settimana. Le selezioni vengono salvate subito.',
  'tour.planSave': 'Salva obiettivo, programma, date e attività. I brani selezionati vengono salvati subito.',
  'tour.blockName': 'Tocca il nome di un blocco per aprire timer e materiali didattici.',
  'tour.practiceSongs': 'I tuoi brani sono disponibili in tutte le settimane. Pratica aggiunge il brano al Repertorio del giorno selezionato senza avviare il timer.',
  "songs.unavailable": "I brani non sono disponibili al momento. Controlla la connessione e riprova.",
  "songs.empty": "Nessun brano.",
  "songs.added": "Aggiunto",
  "songs.removeConfirm": "Rimuovere dai brani? Pratica e materiali vengono conservati.",
  "songs.chooseForDay": "Scegli un brano dall’elenco sotto per esercitarti in questo giorno.",
  "songs.unassigned": "Materiali senza brano",
  "songs.chooseSong": "Scegli un brano",
  "songs.move": "Sposta nel brano"
})
Object.assign(pageTranslations.fr, {
  'Add song': 'Ajouter un morceau',
  'tour.songPlan': 'Consultez et modifiez l’objectif, les tâches et les morceaux de la semaine.',
  'tour.weekSongs': 'Choisissez les morceaux de la semaine. La sélection est enregistrée immédiatement.',
  'tour.planSave': 'Enregistrez l’objectif, le programme, les dates et les tâches. La sélection des morceaux est enregistrée immédiatement.',
  'tour.blockName': 'Touchez le nom d’un bloc pour ouvrir son minuteur et ses supports.',
  'tour.practiceSongs': 'Vos morceaux sont disponibles pour toutes les semaines. Pratique ajoute le morceau au Répertoire du jour sélectionné sans lancer le minuteur.',
  "songs.unavailable": "Les morceaux sont indisponibles pour le moment. Vérifiez votre connexion et réessayez.",
  "songs.empty": "Aucun morceau.",
  "songs.added": "Ajouté",
  "songs.removeConfirm": "Retirer des morceaux ? La pratique et les supports sont conservés.",
  "songs.chooseForDay": "Choisissez un morceau dans la liste ci-dessous pour ce jour.",
  "songs.unassigned": "Supports sans morceau",
  "songs.chooseSong": "Choisir un morceau",
  "songs.move": "Associer au morceau"
})

Object.assign(pageTranslations.en, {
  'ux.planLoadFailed': 'We couldn’t load your plan. Try again.',
  'ux.noCurrentWeek': 'No practice week is scheduled for today.',
  'materials.accountScope': 'Files for this account on this device',
  'materials.legacy': 'Older unassigned materials are preserved but temporarily unavailable.',
  'materials.capacity': 'Device storage capacity: {quota}',
  'auth.rateLimited': 'Too many requests. Try again in {seconds} seconds.',
  'auth.unavailable': 'Account recovery and registration are temporarily unavailable. Check your connection and try again later.',
  'auth.recoveryFailed': 'Recovery failed. Check your login and answer.',
  'auth.invalidRequest': 'Check the account details and try again.',
  'auth.signInFailed': 'Could not sign in. Check your login, password and connection.',
})
Object.assign(pageTranslations.ru, {
  'ux.planLoadFailed': 'Не удалось загрузить план. Попробуйте ещё раз.',
  'ux.noCurrentWeek': 'На сегодня не запланирована неделя практики.',
  'materials.accountScope': 'Файлы этого аккаунта на этом устройстве',
  'materials.legacy': 'Старые материалы без владельца сохранены, но временно недоступны.',
  'materials.capacity': 'Объём хранилища устройства: {quota}',
  'auth.rateLimited': 'Слишком много запросов. Повторите через {seconds} сек.',
  'auth.unavailable': 'Восстановление и регистрация временно недоступны. Проверьте соединение и повторите позже.',
  'auth.recoveryFailed': 'Не удалось восстановить доступ. Проверьте логин и ответ.',
  'auth.invalidRequest': 'Проверьте данные аккаунта и повторите попытку.',
  'auth.signInFailed': 'Не удалось войти. Проверьте логин, пароль и соединение.',
})
Object.assign(pageTranslations.it, {
  'ux.planLoadFailed': 'Non è stato possibile caricare il piano. Riprova.',
  'ux.noCurrentWeek': 'Nessuna settimana di pratica è pianificata per oggi.',
  'materials.accountScope': 'File di questo account su questo dispositivo',
  'materials.legacy': 'I vecchi materiali senza proprietario sono conservati ma temporaneamente non disponibili.',
  'materials.capacity': 'Capacità di archiviazione del dispositivo: {quota}',
  'auth.rateLimited': 'Troppe richieste. Riprova tra {seconds} secondi.',
  'auth.unavailable': 'Recupero e registrazione temporaneamente non disponibili. Controlla la connessione e riprova più tardi.',
  'auth.recoveryFailed': 'Recupero non riuscito. Controlla il nome di accesso e la risposta.',
  'auth.invalidRequest': 'Controlla i dati dell’account e riprova.',
  'auth.signInFailed': 'Accesso non riuscito. Controlla nome, password e connessione.',
})
Object.assign(pageTranslations.fr, {
  'ux.planLoadFailed': 'Impossible de charger votre plan. Réessayez.',
  'ux.noCurrentWeek': 'Aucune semaine de pratique n’est planifiée pour aujourd’hui.',
  'materials.accountScope': 'Fichiers de ce compte sur cet appareil',
  'materials.legacy': 'Les anciens documents sans propriétaire sont conservés mais temporairement indisponibles.',
  'materials.capacity': 'Capacité de stockage de l’appareil : {quota}',
  'auth.rateLimited': 'Trop de demandes. Réessayez dans {seconds} secondes.',
  'auth.unavailable': 'Récupération et inscription temporairement indisponibles. Vérifiez la connexion et réessayez plus tard.',
  'auth.recoveryFailed': 'Échec de la récupération. Vérifiez votre identifiant et votre réponse.',
  'auth.invalidRequest': 'Vérifiez les informations du compte et réessayez.',
  'auth.signInFailed': 'Connexion impossible. Vérifiez identifiant, mot de passe et connexion.',
})

Object.assign(pageTranslations.en, {
  'Page unavailable': 'Page unavailable',
  'This page could not load. The app may have been updated.': 'This page could not load. The app may have been updated.',
  'Something went wrong. Please try again.': 'Something went wrong. Please try again.',
  'You are offline. Reconnect to retry.': 'You are offline. Reconnect to retry.',
  'Retry is available.': 'Retry is available.',
  'Retry': 'Retry',
})
Object.assign(pageTranslations.ru, {
  'Page unavailable': 'Страница недоступна',
  'This page could not load. The app may have been updated.': 'Не удалось загрузить страницу. Возможно, приложение обновилось.',
  'Something went wrong. Please try again.': 'Что-то пошло не так. Попробуйте ещё раз.',
  'You are offline. Reconnect to retry.': 'Нет подключения к интернету. Подключитесь и попробуйте ещё раз.',
  'Retry is available.': 'Можно попробовать ещё раз.',
  'Retry': 'Повторить',
})
Object.assign(pageTranslations.en, {
  'Play video': 'Play video', 'Pause video': 'Pause video', 'Jump': 'Jump', 'Loading video...': 'Loading video...', 'Video practice: {name}': 'Video practice: {name}',
  'Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.': 'Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.',
})
Object.assign(pageTranslations.ru, {
  'Play video': 'Воспроизвести видео', 'Pause video': 'Приостановить видео', 'Jump': 'Перейти', 'Loading video...': 'Загрузка видео...', 'Video practice: {name}': 'Практика с видео: {name}',
  'Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.': 'Клавиши видео: пробел — воспроизведение/пауза; влево/вправо — переход на 5 секунд; Shift+влево/вправо — на 15 секунд. Встроенные элементы видео используют свои клавиши.',
})
Object.assign(pageTranslations.it, {
  'Play video': 'Riproduci video', 'Pause video': 'Metti in pausa il video', 'Jump': 'Vai', 'Loading video...': 'Caricamento video...', 'Video practice: {name}': 'Pratica con video: {name}',
  'Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.': 'Scorciatoie video: spazio riproduci/pausa; sinistra/destra sposta di 5 secondi; Shift+sinistra/destra sposta di 15 secondi. I controlli video nativi mantengono le proprie scorciatoie.',
})
Object.assign(pageTranslations.fr, {
  'Play video': 'Lire la vidéo', 'Pause video': 'Mettre la vidéo en pause', 'Jump': 'Aller', 'Loading video...': 'Chargement vidéo...', 'Video practice: {name}': 'Pratique vidéo : {name}',
  'Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.': 'Raccourcis vidéo : espace lecture/pause ; gauche/droite déplace de 5 secondes ; Maj+gauche/droite déplace de 15 secondes. Les commandes vidéo natives conservent leurs propres raccourcis.',
})
Object.assign(pageTranslations.en, {
  'Use a PDF, image, text, audio, or video file.': 'Use a PDF, image, text, audio, or video file.',
  'This browser may not decode this audio format. MP3, AAC (M4A) or Ogg/Opus is usually the most compatible.': 'This browser may not decode this audio format. MP3, AAC (M4A) or Ogg/Opus is usually the most compatible.',
  'Play audio': 'Play audio', 'Pause audio': 'Pause audio', 'Loading audio...': 'Loading audio...', 'Audio practice: {name}': 'Audio practice: {name}', 'Audio loop': 'Audio loop', 'Whole track': 'Whole track',
  'Loop suspended: use 0 <= A < B <= audio duration.': 'Loop suspended: use 0 <= A < B <= audio duration.',
  'Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.': 'Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.',
})
Object.assign(pageTranslations.ru, {
  'This browser may not decode this audio format. MP3, AAC (M4A) or Ogg/Opus is usually the most compatible.': 'Браузер может не декодировать этот аудиоформат. Обычно лучше всего совместимы MP3, AAC (M4A) или Ogg/Opus.',
  'Play audio': 'Воспроизвести аудио', 'Pause audio': 'Приостановить аудио', 'Loading audio...': 'Загрузка аудио...', 'Audio practice: {name}': 'Практика с аудио: {name}', 'Audio loop': 'Повтор аудио', 'Whole track': 'Весь трек',
  'Loop suspended: use 0 <= A < B <= audio duration.': 'Повтор приостановлен: 0 <= A < B <= длительность аудио.',
  'Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.': 'Клавиши аудио: пробел — воспроизведение/пауза; влево/вправо — переход на 5 секунд; Shift+влево/вправо — на 15 секунд. Встроенные элементы аудио используют свои клавиши.',
})
Object.assign(pageTranslations.it, {
  'This browser may not decode this audio format. MP3, AAC (M4A) or Ogg/Opus is usually the most compatible.': 'Questo browser potrebbe non decodificare questo formato audio. MP3, AAC (M4A) o Ogg/Opus sono generalmente i più compatibili.',
  'Play audio': 'Riproduci audio', 'Pause audio': 'Metti in pausa l’audio', 'Loading audio...': 'Caricamento audio...', 'Audio practice: {name}': 'Pratica con audio: {name}', 'Audio loop': 'Ripetizione audio', 'Whole track': 'Traccia intera',
  'Loop suspended: use 0 <= A < B <= audio duration.': 'Ripetizione sospesa: 0 <= A < B <= durata dell’audio.',
  'Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.': 'Scorciatoie audio: spazio riproduci/pausa; sinistra/destra sposta di 5 secondi; Shift+sinistra/destra sposta di 15 secondi. I controlli audio nativi mantengono le proprie scorciatoie.',
})
Object.assign(pageTranslations.fr, {
  'This browser may not decode this audio format. MP3, AAC (M4A) or Ogg/Opus is usually the most compatible.': 'Ce navigateur ne pourra peut-être pas décoder ce format audio. MP3, AAC (M4A) ou Ogg/Opus sont généralement les plus compatibles.',
  'Play audio': 'Lire l’audio', 'Pause audio': 'Mettre l’audio en pause', 'Loading audio...': 'Chargement audio...', 'Audio practice: {name}': 'Pratique audio : {name}', 'Audio loop': 'Boucle audio', 'Whole track': 'Piste entière',
  'Loop suspended: use 0 <= A < B <= audio duration.': 'Boucle suspendue : 0 <= A < B <= durée de l’audio.',
  'Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.': 'Raccourcis audio : espace lecture/pause ; gauche/droite déplace de 5 secondes ; Maj+gauche/droite déplace de 15 secondes. Les commandes audio natives conservent leurs propres raccourcis.',
})
Object.assign(pageTranslations.it, {
  'Page unavailable': 'Pagina non disponibile',
  'This page could not load. The app may have been updated.': 'Impossibile caricare la pagina. L’app potrebbe essere stata aggiornata.',
  'Something went wrong. Please try again.': 'Si è verificato un problema. Riprova.',
  'You are offline. Reconnect to retry.': 'Sei offline. Riconnettiti per riprovare.',
  'Retry is available.': 'Puoi riprovare.',
  'Retry': 'Riprova',
})
Object.assign(pageTranslations.fr, {
  'Page unavailable': 'Page indisponible',
  'This page could not load. The app may have been updated.': 'Impossible de charger cette page. L’application a peut-être été mise à jour.',
  'Something went wrong. Please try again.': 'Un problème est survenu. Veuillez réessayer.',
  'You are offline. Reconnect to retry.': 'Vous êtes hors connexion. Reconnectez-vous pour réessayer.',
  'Retry is available.': 'Vous pouvez réessayer.',
  'Retry': 'Réessayer',
})

Object.assign(pageTranslations.en, {
  'Rename': 'Rename', 'Rename {name}': 'Rename {name}', 'Material name': 'Material name', 'Save name': 'Save name', 'Enter a material name.': 'Enter a material name.', 'Could not save material changes.': 'Could not save material changes.',
  'Video loop': 'Video loop', 'Loop off': 'Off', 'Whole video': 'Whole video', 'Playback speed': 'Playback speed', 'Speed unavailable': 'Unavailable', '{rate}x': '{rate}x', 'A (seconds)': 'A (seconds)', 'B (seconds)': 'B (seconds)', 'Now': 'Now', 'Set A to current position': 'Set A to current position', 'Set B to current position': 'Set B to current position', 'Position (seconds)': 'Position (seconds)', 'Jump and play': 'Jump and play', 'Remove bookmark at {time}': 'Remove bookmark at {time}',
  'Loop suspended: use 0 <= A < B <= video duration.': 'Loop suspended: use 0 <= A < B <= video duration.', 'Loading YouTube player...': 'Loading YouTube player...', 'Retry player': 'Retry player', 'YouTube is unavailable offline.': 'YouTube is unavailable offline.', 'YouTube requires a valid HTTP or HTTPS origin.': 'YouTube requires a valid HTTP or HTTPS origin.', 'YouTube could not load. Check your connection or open on YouTube.': 'YouTube could not load. Check your connection or open on YouTube.', 'YouTube could not verify this embed origin.': 'YouTube could not verify this embed origin.', 'This video is unavailable or cannot be embedded. Open on YouTube.': 'This video is unavailable or cannot be embedded. Open on YouTube.',
})
Object.assign(pageTranslations.ru, {
  'Rename': 'Переименовать', 'Rename {name}': 'Переименовать {name}', 'Material name': 'Название материала', 'Save name': 'Сохранить название', 'Enter a material name.': 'Введите название материала.', 'Could not save material changes.': 'Не удалось сохранить изменения материала.',
  'Video loop': 'Повтор видео', 'Loop off': 'Выкл.', 'Whole video': 'Всё видео', 'Playback speed': 'Скорость', 'Speed unavailable': 'Недоступна', '{rate}x': '{rate}x', 'A (seconds)': 'A (секунды)', 'B (seconds)': 'B (секунды)', 'Now': 'Сейчас', 'Set A to current position': 'Установить A в текущей позиции', 'Set B to current position': 'Установить B в текущей позиции', 'Position (seconds)': 'Позиция (секунды)', 'Jump and play': 'Перейти и играть', 'Remove bookmark at {time}': 'Удалить закладку {time}',
  'Loop suspended: use 0 <= A < B <= video duration.': 'Повтор приостановлен: 0 <= A < B <= длительность видео.', 'Loading YouTube player...': 'Загрузка проигрывателя YouTube...', 'Retry player': 'Повторить загрузку', 'YouTube is unavailable offline.': 'YouTube недоступен без интернета.', 'YouTube requires a valid HTTP or HTTPS origin.': 'Для YouTube нужен корректный источник HTTP или HTTPS.', 'YouTube could not load. Check your connection or open on YouTube.': 'YouTube не загрузился. Проверьте соединение или откройте на YouTube.', 'YouTube could not verify this embed origin.': 'YouTube не смог проверить источник встраивания.', 'This video is unavailable or cannot be embedded. Open on YouTube.': 'Видео недоступно или запрещено для встраивания. Откройте на YouTube.',
})
Object.assign(pageTranslations.it, {
  'Rename': 'Rinomina', 'Rename {name}': 'Rinomina {name}', 'Material name': 'Nome del materiale', 'Save name': 'Salva nome', 'Enter a material name.': 'Inserisci un nome per il materiale.', 'Could not save material changes.': 'Impossibile salvare le modifiche al materiale.',
  'Video loop': 'Ripetizione video', 'Loop off': 'Disattivata', 'Whole video': 'Video intero', 'Playback speed': 'Velocità', 'Speed unavailable': 'Non disponibile', '{rate}x': '{rate}x', 'A (seconds)': 'A (secondi)', 'B (seconds)': 'B (secondi)', 'Now': 'Ora', 'Set A to current position': 'Imposta A sulla posizione attuale', 'Set B to current position': 'Imposta B sulla posizione attuale', 'Position (seconds)': 'Posizione (secondi)', 'Jump and play': 'Vai e riproduci', 'Remove bookmark at {time}': 'Rimuovi segnalibro a {time}',
  'Loop suspended: use 0 <= A < B <= video duration.': 'Ripetizione sospesa: 0 <= A < B <= durata del video.', 'Loading YouTube player...': 'Caricamento del lettore YouTube...', 'Retry player': 'Riprova lettore', 'YouTube is unavailable offline.': 'YouTube non è disponibile offline.', 'YouTube requires a valid HTTP or HTTPS origin.': 'YouTube richiede un’origine HTTP o HTTPS valida.', 'YouTube could not load. Check your connection or open on YouTube.': 'Impossibile caricare YouTube. Controlla la connessione o apri su YouTube.', 'YouTube could not verify this embed origin.': 'YouTube non ha potuto verificare l’origine del video incorporato.', 'This video is unavailable or cannot be embedded. Open on YouTube.': 'Video non disponibile o non incorporabile. Apri su YouTube.',
})
Object.assign(pageTranslations.fr, {
  'Rename': 'Renommer', 'Rename {name}': 'Renommer {name}', 'Material name': 'Nom du document', 'Save name': 'Enregistrer le nom', 'Enter a material name.': 'Saisissez un nom pour le document.', 'Could not save material changes.': 'Impossible d’enregistrer les modifications du document.',
  'Video loop': 'Boucle vidéo', 'Loop off': 'Désactivée', 'Whole video': 'Vidéo entière', 'Playback speed': 'Vitesse', 'Speed unavailable': 'Indisponible', '{rate}x': '{rate}x', 'A (seconds)': 'A (secondes)', 'B (seconds)': 'B (secondes)', 'Now': 'Maintenant', 'Set A to current position': 'Placer A à la position actuelle', 'Set B to current position': 'Placer B à la position actuelle', 'Position (seconds)': 'Position (secondes)', 'Jump and play': 'Aller et lire', 'Remove bookmark at {time}': 'Supprimer le signet à {time}',
  'Loop suspended: use 0 <= A < B <= video duration.': 'Boucle suspendue : 0 <= A < B <= durée de la vidéo.', 'Loading YouTube player...': 'Chargement du lecteur YouTube...', 'Retry player': 'Réessayer le lecteur', 'YouTube is unavailable offline.': 'YouTube est indisponible hors connexion.', 'YouTube requires a valid HTTP or HTTPS origin.': 'YouTube nécessite une origine HTTP ou HTTPS valide.', 'YouTube could not load. Check your connection or open on YouTube.': 'Impossible de charger YouTube. Vérifiez la connexion ou ouvrez sur YouTube.', 'YouTube could not verify this embed origin.': 'YouTube n’a pas pu vérifier l’origine de cette vidéo intégrée.', 'This video is unavailable or cannot be embedded. Open on YouTube.': 'Vidéo indisponible ou non intégrable. Ouvrez sur YouTube.',
})

Object.assign(pageTranslations.ru, {
  'Practice plan': 'План практики', 'Week overview': 'Обзор недели', 'Practice weeks': 'Недели практики', 'Add week': 'Добавить неделю', 'Insert after selected': 'Вставить после выбранной', 'Start': 'Начало', 'End': 'Конец', 'Navigate weeks': 'Навигация по неделям', 'Remove week': 'Удалить неделю', 'Current week': 'Текущая неделя', 'Choose a covered week': 'Выберите охваченную неделю', 'Prev': 'Назад', 'Next': 'Вперёд', 'Today': 'Сегодня', 'Updated': 'Обновлено', 'Draft': 'Черновик', 'Selected week': 'Выбранная неделя', 'Focus': 'Фокус', 'Short title for the week': 'Краткое название недели', 'Week info': 'Информация о неделе', 'Program': 'Программа', 'Other': 'Другая', 'Program name': 'Название программы', 'Your program name': 'Название вашей программы', 'Dates': 'Даты', 'Tasks': 'Задачи', 'Describe the week plan': 'Опишите план недели', 'Topics': 'Темы', '+ Add topic': '+ Добавить тему', 'No topics yet for this week.': 'На этой неделе пока нет тем.', 'Topic name': 'Название темы', 'Remove': 'Удалить', 'Songs': 'Песни', 'Add one song per line': 'Добавляйте по одной песне в строке', 'Separate songs with line breaks or commas.': 'Разделяйте песни переносами строк или запятыми.', 'Save plan': 'Сохранить план', 'Saving…': 'Сохранение…', 'No plan_weeks row covers today\'s date.': 'Сегодняшняя дата не входит ни в одну строку plan_weeks.', 'This week is currently unscheduled.': 'Эта неделя сейчас не запланирована.', 'Week end date must be on or after the start date.': 'Дата окончания должна быть не раньше даты начала.', 'Enter a name for the other program.': 'Введите название другой программы.', 'Could not add the week.': 'Не удалось добавить неделю.', 'Could not remove the week.': 'Не удалось удалить неделю.', 'Could not create the program.': 'Не удалось создать программу.', 'Week added successfully.': 'Неделя добавлена.', 'Week removed successfully.': 'Неделя удалена.', 'Plan updated successfully.': 'План обновлён.', 'New practice week': 'Новая неделя практики',
  'Practice journey': 'Путь практики', 'A tree-style overview of where you are, what you have done, and what is coming next.': 'Древовидный обзор вашего пути, выполненного и предстоящего.', 'Loading practice journey…': 'Загрузка пути практики…', 'No scheduled practice weeks yet. Start a program from Plan.': 'Запланированных недель пока нет. Начните программу в разделе «План».', 'session': 'занятие', 'sessions': 'занятий', 'minutes': 'минут', 'week': 'неделя', 'weeks': 'недель', 'completed': 'завершено', 'current': 'текущая', 'upcoming': 'предстоит', 'missed': 'пропущено', 'Add week after week {week}': 'Добавить неделю после недели {week}', 'Add week after Week {week}': 'Добавить неделю после недели {week}', 'Week focus': 'Фокус недели', 'Cancel': 'Отмена',
  'Session {date}': 'Занятие {date}', 'Practice week navigator for the current cycle.': 'Навигатор недель практики текущего цикла.', 'Metronome': 'Метроном', 'Playing': 'Играет', 'Standby': 'Ожидание', 'Stop': 'Стоп', 'BPM': 'Ударов в минуту', 'Time': 'Размер', 'Custom': 'Другой', 'Beat': 'Доли', 'Measure': 'Такты', 'Tap': 'Тап', 'Tuner': 'Тюнер', 'Hide': 'Скрыть', 'Show': 'Показать', 'Guitar tuning': 'Строй гитары', 'Play {note} reference tone': 'Воспроизвести эталонный звук {note}', 'Stop tone': 'Остановить звук', 'Practice time': 'Время практики', 'Total across selected blocks': 'Итого по выбранным блокам', 'Jump to': 'Перейти к', 'No week selected': 'Неделя не выбрана', 'Week description': 'Описание недели', 'No description recorded for this week yet.': 'Описание этой недели пока не записано.', 'Days in selected week': 'Дни выбранной недели', 'Current day': 'Текущий день', 'Done': 'Готово', 'Selected day': 'Выбранный день', 'Add practice block': 'Добавить блок практики', 'Choose a block': 'Выберите блок', 'Add block': 'Добавить блок', 'No practice blocks selected for this day.': 'На этот день блоки практики не выбраны.', 'Target: {minutes} min': 'Цель: {minutes} мин', 'No description available for this practice block.': 'Описание этого блока практики недоступно.', 'Materials stay on this device': 'Материалы хранятся на этом устройстве', 'Storage estimate unavailable': 'Оценка хранилища недоступна', 'Saving locally…': 'Локальное сохранение…', 'Saved on this device': 'Сохранено на этом устройстве', 'Add URL': 'Добавить URL', 'Close': 'Закрыть', 'Open in browser': 'Открыть в браузере', 'Set A': 'Установить A', 'Set B': 'Установить B', 'Looping': 'Цикл', 'Loop A-B': 'Цикл A–B', 'Clear': 'Очистить', 'Audio track fallback': 'Резервная аудиодорожка', 'Pause': 'Пауза', 'Timer': 'Таймер', 'Remove block': 'Удалить блок', 'Notes': 'Заметки', 'What did you work on?': 'Что вы практиковали?', 'Save session': 'Сохранить занятие', 'Recent sessions': 'Недавние занятия', 'No sessions yet.': 'Занятий пока нет.', 'Loading…': 'Загрузка…', 'Not signed in.': 'Вы не вошли в систему.', 'Could not save the session.': 'Не удалось сохранить занятие.', 'Session saved successfully.': 'Занятие сохранено.', 'Could not load local materials.': 'Не удалось загрузить локальные материалы.', 'Use a PDF, image, text, audio, or video file.': 'Используйте PDF, изображение, текстовый файл, аудио или видео.', 'This file is larger than the browser storage currently available on this device.': 'Этот файл больше доступного хранилища браузера на устройстве.', 'This browser may not decode this video format. H.264/AAC MP4 or WebM/Opus is usually the most compatible.': 'Браузер может не декодировать этот видеоформат. Обычно лучше всего совместимы H.264/AAC MP4 или WebM/Opus.', 'The browser storage quota was reached. Remove local materials or use another device.': 'Достигнута квота хранилища браузера. Удалите локальные материалы или используйте другое устройство.', 'Could not save the local material.': 'Не удалось сохранить локальный материал.', 'Only HTTP and HTTPS URLs are supported.': 'Поддерживаются только URL HTTP и HTTPS.', 'Enter a valid web URL.': 'Введите действительный веб-адрес.', 'Error: {error}': 'Ошибка: {error}',
  'A simple overview of your practice history.': 'Краткий обзор истории практики.', 'Sessions logged': 'Записанные занятия', 'Current streak': 'Текущая серия', 'days': 'дней', 'min': 'мин', 'week of': 'неделя от', 'Week of {date}': 'Неделя от {date}', 'daily': 'по дням', 'weekly': 'по неделям', 'monthly': 'по месяцам', 'yearly': 'по годам', 'Selected period': 'Выбранный период', 'Last session': 'Последнее занятие', 'No sessions yet': 'Занятий пока нет', 'Cumulative practice time': 'Накопленное время практики', 'Cumulative practice timeline': 'График накопленного времени практики', 'Practice blocks': 'Блоки практики', 'Practice block distribution': 'Распределение блоков практики', 'No block data for this period.': 'За этот период нет данных о блоках.', 'Current Month': 'Текущий месяц', 'This year': 'Этот год', 'Custom range': 'Произвольный диапазон', 'Reset': 'Сбросить', 'From': 'С', 'To': 'По', 'Reset to full history': 'Сбросить до всей истории', 'Most continuous streak': 'Самая длинная серия', 'Log a session to start building momentum.': 'Запишите занятие, чтобы начать накапливать темп.', 'Longest practice': 'Самая длинная практика', 'Your best session will appear here.': 'Здесь появится ваше лучшее занятие.', 'Peak week': 'Лучшая неделя', 'This snapshot will highlight your strongest week.': 'Здесь будет показана самая сильная неделя.', 'Longest run of consecutive weeks with practice.': 'Самая длинная последовательность недель с практикой.', 'Your biggest single session in this range.': 'Самое продолжительное отдельное занятие в этом диапазоне.', 'No week yet': 'Недель пока нет', '{date} was your strongest week.': '{date} была вашей самой сильной неделей.', '{value} min total': 'Всего {value} мин', 'Standard · E A D G B E': 'Стандартный · E A D G B E', 'Drop D · D A D G B E': 'Drop D · D A D G B E', 'DADGAD · D A D G A D': 'DADGAD · D A D G A D', 'Half-step down · Eb Ab Db Gb Bb Eb': 'На полтона ниже · Eb Ab Db Gb Bb Eb', 'Low E': 'Низкая E', 'High E': 'Высокая E', 'Low D': 'Низкая D', 'High D': 'Высокая D', 'Practice': 'Практика', 'Progress': 'Прогресс', 'Plan': 'План', 'Stats': 'Статистика', 'Settings': 'Настройки', 'Language': 'Язык', 'App navigation': 'Навигация по приложению', 'Account created. You are now signed in.': 'Аккаунт создан. Вы вошли в систему.', 'Password reset. You can now sign in.': 'Пароль сброшен. Теперь можно войти.', 'Practice groups': 'Группы практики', 'Enable habit reminders': 'Включить напоминания о привычке', 'Use compact practice cards': 'Использовать компактные карточки практики', 'Show target practice time': 'Показывать целевое время практики', 'Show completed weeks in progress overview': 'Показывать завершённые недели в обзоре прогресса', 'Keep plan notes collapsed by default': 'Сворачивать заметки плана по умолчанию', 'Could not load practice progress.': 'Не удалось загрузить прогресс практики.'
})
Object.assign(pageTranslations.it, {
  'Practice plan': 'Piano di pratica', 'Week overview': 'Panoramica della settimana', 'Practice weeks': 'Settimane di pratica', 'Add week': 'Aggiungi settimana', 'Insert after selected': 'Inserisci dopo la selezionata', 'Start': 'Inizio', 'End': 'Fine', 'Navigate weeks': 'Naviga tra le settimane', 'Remove week': 'Rimuovi settimana', 'Current week': 'Settimana attuale', 'Choose a covered week': 'Scegli una settimana coperta', 'Prev': 'Precedente', 'Next': 'Successiva', 'Today': 'Oggi', 'Updated': 'Aggiornato', 'Draft': 'Bozza', 'Selected week': 'Settimana selezionata', 'Focus': 'Obiettivo', 'Short title for the week': 'Titolo breve della settimana', 'Week info': 'Informazioni sulla settimana', 'Program': 'Programma', 'Other': 'Altro', 'Program name': 'Nome del programma', 'Your program name': 'Nome del tuo programma', 'Dates': 'Date', 'Tasks': 'Attività', 'Describe the week plan': 'Descrivi il piano della settimana', 'Topics': 'Argomenti', '+ Add topic': '+ Aggiungi argomento', 'No topics yet for this week.': 'Nessun argomento per questa settimana.', 'Topic name': 'Nome dell’argomento', 'Remove': 'Rimuovi', 'Songs': 'Brani', 'Add one song per line': 'Aggiungi un brano per riga', 'Separate songs with line breaks or commas.': 'Separa i brani con a capo o virgole.', 'Save plan': 'Salva piano', 'Saving…': 'Salvataggio…', 'No plan_weeks row covers today\'s date.': 'Nessuna riga plan_weeks copre la data odierna.', 'This week is currently unscheduled.': 'Questa settimana non è pianificata.', 'Week end date must be on or after the start date.': 'La data di fine deve essere uguale o successiva a quella di inizio.', 'Enter a name for the other program.': 'Inserisci il nome dell’altro programma.', 'Could not add the week.': 'Impossibile aggiungere la settimana.', 'Could not remove the week.': 'Impossibile rimuovere la settimana.', 'Could not create the program.': 'Impossibile creare il programma.', 'Week added successfully.': 'Settimana aggiunta.', 'Week removed successfully.': 'Settimana rimossa.', 'Plan updated successfully.': 'Piano aggiornato.', 'New practice week': 'Nuova settimana di pratica',
  'Practice journey': 'Percorso di pratica', 'A tree-style overview of where you are, what you have done, and what is coming next.': 'Una panoramica ad albero del tuo percorso, di ciò che hai fatto e di ciò che viene dopo.', 'Loading practice journey…': 'Caricamento del percorso…', 'No scheduled practice weeks yet. Start a program from Plan.': 'Non ci sono ancora settimane pianificate. Inizia un programma da Piano.', 'session': 'sessione', 'sessions': 'sessioni', 'minutes': 'minuti', 'week': 'settimana', 'weeks': 'settimane', 'completed': 'completata', 'current': 'attuale', 'upcoming': 'prossima', 'missed': 'saltata', 'Add week after week {week}': 'Aggiungi settimana dopo la settimana {week}', 'Add week after Week {week}': 'Aggiungi settimana dopo la settimana {week}', 'Week focus': 'Obiettivo della settimana', 'Cancel': 'Annulla',
  'Session {date}': 'Sessione {date}', 'Practice week navigator for the current cycle.': 'Navigatore delle settimane di pratica del ciclo attuale.', 'Metronome': 'Metronomo', 'Playing': 'In riproduzione', 'Standby': 'In attesa', 'Stop': 'Stop', 'BPM': 'BPM', 'Time': 'Tempo', 'Custom': 'Personalizzato', 'Beat': 'Battiti', 'Measure': 'Misure', 'Tap': 'Tap', 'Tuner': 'Accordatore', 'Hide': 'Nascondi', 'Show': 'Mostra', 'Guitar tuning': 'Accordatura della chitarra', 'Play {note} reference tone': 'Riproduci il tono di riferimento {note}', 'Stop tone': 'Ferma tono', 'Practice time': 'Tempo di pratica', 'Total across selected blocks': 'Totale dei blocchi selezionati', 'Jump to': 'Vai a', 'No week selected': 'Nessuna settimana selezionata', 'Week description': 'Descrizione della settimana', 'No description recorded for this week yet.': 'Nessuna descrizione registrata per questa settimana.', 'Days in selected week': 'Giorni della settimana selezionata', 'Current day': 'Giorno attuale', 'Done': 'Fatto', 'Selected day': 'Giorno selezionato', 'Add practice block': 'Aggiungi blocco di pratica', 'Choose a block': 'Scegli un blocco', 'Add block': 'Aggiungi blocco', 'No practice blocks selected for this day.': 'Nessun blocco selezionato per oggi.', 'Target: {minutes} min': 'Obiettivo: {minutes} min', 'No description available for this practice block.': 'Nessuna descrizione disponibile per questo blocco.', 'Materials stay on this device': 'I materiali restano su questo dispositivo', 'Storage estimate unavailable': 'Stima dello spazio non disponibile', 'Saving locally…': 'Salvataggio locale…', 'Saved on this device': 'Salvato su questo dispositivo', 'Add URL': 'Aggiungi URL', 'Close': 'Chiudi', 'Open in browser': 'Apri nel browser', 'Set A': 'Imposta A', 'Set B': 'Imposta B', 'Looping': 'In ciclo', 'Loop A-B': 'Ciclo A-B', 'Clear': 'Cancella', 'Audio track fallback': 'Traccia audio alternativa', 'Pause': 'Pausa', 'Timer': 'Timer', 'Remove block': 'Rimuovi blocco', 'Notes': 'Note', 'What did you work on?': 'Su cosa hai lavorato?', 'Save session': 'Salva sessione', 'Recent sessions': 'Sessioni recenti', 'No sessions yet.': 'Nessuna sessione.', 'Loading…': 'Caricamento…', 'Not signed in.': 'Non hai effettuato l’accesso.', 'Could not save the session.': 'Impossibile salvare la sessione.', 'Session saved successfully.': 'Sessione salvata.', 'Could not load local materials.': 'Impossibile caricare i materiali locali.', 'Use a PDF, image, text, audio, or video file.': 'Usa un file PDF, immagine, testo, audio o video.', 'This file is larger than the browser storage currently available on this device.': 'Questo file è più grande dello spazio disponibile nel browser su questo dispositivo.', 'This browser may not decode this video format. H.264/AAC MP4 or WebM/Opus is usually the most compatible.': 'Questo browser potrebbe non decodificare questo formato video. H.264/AAC MP4 o WebM/Opus sono generalmente i più compatibili.', 'The browser storage quota was reached. Remove local materials or use another device.': 'La quota di spazio del browser è stata raggiunta. Rimuovi materiali locali o usa un altro dispositivo.', 'Could not save the local material.': 'Impossibile salvare il materiale locale.', 'Only HTTP and HTTPS URLs are supported.': 'Sono supportati solo URL HTTP e HTTPS.', 'Enter a valid web URL.': 'Inserisci un URL web valido.', 'Error: {error}': 'Errore: {error}',
  'A simple overview of your practice history.': 'Una panoramica della tua storia di pratica.', 'Sessions logged': 'Sessioni registrate', 'Current streak': 'Serie attuale', 'days': 'giorni', 'min': 'min', 'week of': 'settimana del', 'Week of {date}': 'Settimana del {date}', 'daily': 'giornaliero', 'weekly': 'settimanale', 'monthly': 'mensile', 'yearly': 'annuale', 'Selected period': 'Periodo selezionato', 'Last session': 'Ultima sessione', 'No sessions yet': 'Nessuna sessione', 'Cumulative practice time': 'Tempo di pratica cumulativo', 'Cumulative practice timeline': 'Cronologia del tempo di pratica cumulativo', 'Practice blocks': 'Blocchi di pratica', 'Practice block distribution': 'Distribuzione dei blocchi di pratica', 'No block data for this period.': 'Nessun dato sui blocchi per questo periodo.', 'Current Month': 'Mese attuale', 'This year': 'Quest’anno', 'Custom range': 'Intervallo personalizzato', 'Reset': 'Reimposta', 'From': 'Da', 'To': 'A', 'Reset to full history': 'Ripristina tutta la cronologia', 'Most continuous streak': 'Serie più continua', 'Log a session to start building momentum.': 'Registra una sessione per iniziare a creare continuità.', 'Longest practice': 'Pratica più lunga', 'Your best session will appear here.': 'Qui apparirà la tua sessione migliore.', 'Peak week': 'Settimana migliore', 'This snapshot will highlight your strongest week.': 'Qui verrà evidenziata la tua settimana più forte.', 'Longest run of consecutive weeks with practice.': 'La sequenza più lunga di settimane consecutive con pratica.', 'Your biggest single session in this range.': 'La tua sessione singola più lunga in questo intervallo.', 'No week yet': 'Nessuna settimana', '{date} was your strongest week.': '{date} è stata la tua settimana migliore.', '{value} min total': '{value} min totali', 'Standard · E A D G B E': 'Standard · E A D G B E', 'Drop D · D A D G B E': 'Drop D · D A D G B E', 'DADGAD · D A D G A D': 'DADGAD · D A D G A D', 'Half-step down · Eb Ab Db Gb Bb Eb': 'Un semitono sotto · Eb Ab Db Gb Bb Eb', 'Low E': 'E basso', 'High E': 'E alto', 'Low D': 'D basso', 'High D': 'D alto', 'Practice': 'Pratica', 'Progress': 'Progressi', 'Plan': 'Piano', 'Stats': 'Statistiche', 'Settings': 'Impostazioni', 'Language': 'Lingua', 'App navigation': 'Navigazione dell’app', 'Account created. You are now signed in.': 'Account creato. Hai effettuato l’accesso.', 'Password reset. You can now sign in.': 'Password reimpostata. Ora puoi accedere.', 'Enable habit reminders': 'Abilita promemoria delle abitudini', 'Use compact practice cards': 'Usa schede di pratica compatte', 'Show target practice time': 'Mostra il tempo di pratica previsto', 'Show completed weeks in progress overview': 'Mostra le settimane completate nel riepilogo dei progressi', 'Keep plan notes collapsed by default': 'Mantieni chiuse le note del piano per impostazione predefinita', 'Could not load practice progress.': 'Impossibile caricare i progressi della pratica.'
})
Object.assign(pageTranslations.fr, {
  'Practice plan': 'Plan de pratique', 'Week overview': 'Aperçu de la semaine', 'Practice weeks': 'Semaines de pratique', 'Add week': 'Ajouter une semaine', 'Insert after selected': 'Insérer après la sélection', 'Start': 'Début', 'End': 'Fin', 'Navigate weeks': 'Naviguer entre les semaines', 'Remove week': 'Supprimer la semaine', 'Current week': 'Semaine actuelle', 'Choose a covered week': 'Choisir une semaine couverte', 'Prev': 'Précédent', 'Next': 'Suivant', 'Today': 'Aujourd’hui', 'Updated': 'Mis à jour', 'Draft': 'Brouillon', 'Selected week': 'Semaine sélectionnée', 'Focus': 'Objectif', 'Short title for the week': 'Titre court de la semaine', 'Week info': 'Informations sur la semaine', 'Program': 'Programme', 'Other': 'Autre', 'Program name': 'Nom du programme', 'Your program name': 'Nom de votre programme', 'Dates': 'Dates', 'Tasks': 'Tâches', 'Describe the week plan': 'Décrivez le plan de la semaine', 'Topics': 'Thèmes', '+ Add topic': '+ Ajouter un thème', 'No topics yet for this week.': 'Aucun thème pour cette semaine.', 'Topic name': 'Nom du thème', 'Remove': 'Supprimer', 'Songs': 'Morceaux', 'Add one song per line': 'Ajoutez un morceau par ligne', 'Separate songs with line breaks or commas.': 'Séparez les morceaux par des retours à la ligne ou des virgules.', 'Save plan': 'Enregistrer le plan', 'Saving…': 'Enregistrement…', 'No plan_weeks row covers today\'s date.': 'Aucune ligne plan_weeks ne couvre la date du jour.', 'This week is currently unscheduled.': 'Cette semaine n’est pas planifiée.', 'Week end date must be on or after the start date.': 'La date de fin doit être postérieure ou égale à la date de début.', 'Enter a name for the other program.': 'Saisissez le nom de l’autre programme.', 'Could not add the week.': 'Impossible d’ajouter la semaine.', 'Could not remove the week.': 'Impossible de supprimer la semaine.', 'Could not create the program.': 'Impossible de créer le programme.', 'Week added successfully.': 'Semaine ajoutée.', 'Week removed successfully.': 'Semaine supprimée.', 'Plan updated successfully.': 'Plan mis à jour.', 'New practice week': 'Nouvelle semaine de pratique',
  'Practice journey': 'Parcours de pratique', 'A tree-style overview of where you are, what you have done, and what is coming next.': 'Une vue arborescente de votre parcours, de ce qui est fait et de la suite.', 'Loading practice journey…': 'Chargement du parcours…', 'No scheduled practice weeks yet. Start a program from Plan.': 'Aucune semaine planifiée. Commencez un programme depuis le Plan.', 'session': 'séance', 'sessions': 'séances', 'minutes': 'minutes', 'week': 'semaine', 'weeks': 'semaines', 'completed': 'terminée', 'current': 'actuelle', 'upcoming': 'à venir', 'missed': 'manquée', 'Add week after week {week}': 'Ajouter une semaine après la semaine {week}', 'Add week after Week {week}': 'Ajouter une semaine après la semaine {week}', 'Week focus': 'Objectif de la semaine', 'Cancel': 'Annuler',
  'Session {date}': 'Séance du {date}', 'Practice week navigator for the current cycle.': 'Navigateur des semaines de pratique du cycle actuel.', 'Metronome': 'Métronome', 'Playing': 'Lecture', 'Standby': 'En attente', 'Stop': 'Arrêter', 'BPM': 'BPM', 'Time': 'Mesure', 'Custom': 'Personnalisé', 'Beat': 'Temps', 'Measure': 'Mesures', 'Tap': 'Tap', 'Tuner': 'Accordeur', 'Hide': 'Masquer', 'Show': 'Afficher', 'Guitar tuning': 'Accordage de la guitare', 'Play {note} reference tone': 'Jouer le son de référence {note}', 'Stop tone': 'Arrêter le son', 'Practice time': 'Temps de pratique', 'Total across selected blocks': 'Total des blocs sélectionnés', 'Jump to': 'Aller à', 'No week selected': 'Aucune semaine sélectionnée', 'Week description': 'Description de la semaine', 'No description recorded for this week yet.': 'Aucune description enregistrée pour cette semaine.', 'Days in selected week': 'Jours de la semaine sélectionnée', 'Current day': 'Jour actuel', 'Done': 'Terminé', 'Selected day': 'Jour sélectionné', 'Add practice block': 'Ajouter un bloc de pratique', 'Choose a block': 'Choisir un bloc', 'Add block': 'Ajouter un bloc', 'No practice blocks selected for this day.': 'Aucun bloc sélectionné pour ce jour.', 'Target: {minutes} min': 'Objectif : {minutes} min', 'No description available for this practice block.': 'Aucune description disponible pour ce bloc.', 'Materials stay on this device': 'Les supports restent sur cet appareil', 'Storage estimate unavailable': 'Estimation du stockage indisponible', 'Saving locally…': 'Enregistrement local…', 'Saved on this device': 'Enregistré sur cet appareil', 'Add URL': 'Ajouter une URL', 'Close': 'Fermer', 'Open in browser': 'Ouvrir dans le navigateur', 'Set A': 'Définir A', 'Set B': 'Définir B', 'Looping': 'Boucle', 'Loop A-B': 'Boucle A-B', 'Clear': 'Effacer', 'Audio track fallback': 'Piste audio de secours', 'Pause': 'Pause', 'Timer': 'Minuteur', 'Remove block': 'Supprimer le bloc', 'Notes': 'Notes', 'What did you work on?': 'Sur quoi avez-vous travaillé ?', 'Save session': 'Enregistrer la séance', 'Recent sessions': 'Séances récentes', 'No sessions yet.': 'Aucune séance.', 'Loading…': 'Chargement…', 'Not signed in.': 'Vous n’êtes pas connecté.', 'Could not save the session.': 'Impossible d’enregistrer la séance.', 'Session saved successfully.': 'Séance enregistrée.', 'Could not load local materials.': 'Impossible de charger les supports locaux.', 'Use a PDF, image, text, audio, or video file.': 'Utilisez un fichier PDF, image, texte, audio ou vidéo.', 'This file is larger than the browser storage currently available on this device.': 'Ce fichier dépasse le stockage actuellement disponible dans le navigateur sur cet appareil.', 'This browser may not decode this video format. H.264/AAC MP4 or WebM/Opus is usually the most compatible.': 'Ce navigateur ne pourra peut-être pas décoder ce format vidéo. H.264/AAC MP4 ou WebM/Opus sont généralement les plus compatibles.', 'The browser storage quota was reached. Remove local materials or use another device.': 'Le quota de stockage du navigateur est atteint. Supprimez des supports locaux ou utilisez un autre appareil.', 'Could not save the local material.': 'Impossible d’enregistrer le support local.', 'Only HTTP and HTTPS URLs are supported.': 'Seules les URL HTTP et HTTPS sont prises en charge.', 'Enter a valid web URL.': 'Saisissez une URL web valide.', 'Error: {error}': 'Erreur : {error}',
  'A simple overview of your practice history.': 'Un aperçu simple de votre historique de pratique.', 'Sessions logged': 'Séances enregistrées', 'Current streak': 'Série actuelle', 'days': 'jours', 'min': 'min', 'week of': 'semaine du', 'Week of {date}': 'Semaine du {date}', 'daily': 'quotidien', 'weekly': 'hebdomadaire', 'monthly': 'mensuel', 'yearly': 'annuel', 'Selected period': 'Période sélectionnée', 'Last session': 'Dernière séance', 'No sessions yet': 'Aucune séance', 'Cumulative practice time': 'Temps de pratique cumulé', 'Cumulative practice timeline': 'Évolution du temps de pratique cumulé', 'Practice blocks': 'Blocs de pratique', 'Practice block distribution': 'Répartition des blocs de pratique', 'No block data for this period.': 'Aucune donnée de bloc pour cette période.', 'Current Month': 'Mois actuel', 'This year': 'Cette année', 'Custom range': 'Période personnalisée', 'Reset': 'Réinitialiser', 'From': 'Du', 'To': 'Au', 'Reset to full history': 'Réinitialiser sur tout l’historique', 'Most continuous streak': 'Série la plus longue', 'Log a session to start building momentum.': 'Enregistrez une séance pour commencer à progresser.', 'Longest practice': 'Pratique la plus longue', 'Your best session will appear here.': 'Votre meilleure séance apparaîtra ici.', 'Peak week': 'Semaine record', 'This snapshot will highlight your strongest week.': 'Cet aperçu mettra en avant votre meilleure semaine.', 'Longest run of consecutive weeks with practice.': 'Plus longue série de semaines consécutives avec pratique.', 'Your biggest single session in this range.': 'Votre plus longue séance individuelle sur cette période.', 'No week yet': 'Aucune semaine', '{date} was your strongest week.': '{date} a été votre meilleure semaine.', '{value} min total': '{value} min au total', 'Standard · E A D G B E': 'Standard · E A D G B E', 'Drop D · D A D G B E': 'Drop D · D A D G B E', 'DADGAD · D A D G A D': 'DADGAD · D A D G A D', 'Half-step down · Eb Ab Db Gb Bb Eb': 'Un demi-ton plus bas · Eb Ab Db Gb Bb Eb', 'Low E': 'E grave', 'High E': 'E aigu', 'Low D': 'D grave', 'High D': 'D aigu', 'Practice': 'Pratique', 'Progress': 'Progrès', 'Plan': 'Plan', 'Stats': 'Statistiques', 'Settings': 'Paramètres', 'Language': 'Langue', 'App navigation': 'Navigation de l’application', 'Account created. You are now signed in.': 'Compte créé. Vous êtes maintenant connecté.', 'Password reset. You can now sign in.': 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.', 'Enable habit reminders': 'Activer les rappels d’habitude', 'Use compact practice cards': 'Utiliser des cartes de pratique compactes', 'Show target practice time': 'Afficher le temps de pratique cible', 'Show completed weeks in progress overview': 'Afficher les semaines terminées dans l’aperçu des progrès', 'Keep plan notes collapsed by default': 'Garder les notes du plan réduites par défaut', 'Could not load practice progress.': 'Impossible de charger les progrès de pratique.'
})

Object.assign(pageTranslations.en, {
  'App navigation': 'App navigation', 'Material URL': 'https://example.com/material', 'Local storage: {used} used': 'Local storage: {used} used', 'of {quota}': 'of {quota}', 'This web page does not provide an embeddable media format, or it blocks inline viewing.': 'This web page does not provide an embeddable media format, or it blocks inline viewing.', 'This video codec or container is not fully supported by this browser.': 'This video codec or container is not fully supported by this browser.', 'The audio codec is not supported by this browser.': 'The audio codec is not supported by this browser.', 'Playback trouble? Open on YouTube': 'Playback trouble? Open on YouTube', 'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun', 'Account created. You are now signed in.': 'Account created. You are now signed in.', 'Password reset. You can now sign in.': 'Password reset. You can now sign in.', 'Could not load practice progress.': 'Could not load practice progress.'
})
Object.assign(pageTranslations.ru, {
  'App navigation': 'Навигация по приложению', 'Material URL': 'https://example.com/material', 'Local storage: {used} used': 'Локальное хранилище: занято {used}', 'of {quota}': 'из {quota}', 'This web page does not provide an embeddable media format, or it blocks inline viewing.': 'Эта веб-страница не предоставляет встраиваемый меди формат или блокирует просмотр внутри приложения.', 'This video codec or container is not fully supported by this browser.': 'Этот видеокодек или контейнер не полностью поддерживается браузером.', 'The audio codec is not supported by this browser.': 'Аудиокодек не поддерживается браузером.', 'Playback trouble? Open on YouTube': 'Проблемы с воспроизведением? Открыть на YouTube', 'Mon': 'Пн', 'Tue': 'Вт', 'Wed': 'Ср', 'Thu': 'Чт', 'Fri': 'Пт', 'Sat': 'Сб', 'Sun': 'Вс', 'Account created. You are now signed in.': 'Аккаунт создан. Вы вошли в систему.', 'Password reset. You can now sign in.': 'Пароль сброшен. Теперь можно войти.', 'Could not load practice progress.': 'Не удалось загрузить прогресс практики.'
})
Object.assign(pageTranslations.it, {
  'App navigation': 'Navigazione dell’app', 'Material URL': 'https://example.com/material', 'Local storage: {used} used': 'Spazio locale: {used} utilizzati', 'of {quota}': 'su {quota}', 'This web page does not provide an embeddable media format, or it blocks inline viewing.': 'Questa pagina web non offre un formato multimediale incorporabile oppure blocca la visualizzazione incorporata.', 'This video codec or container is not fully supported by this browser.': 'Questo codec o contenitore video non è completamente supportato dal browser.', 'The audio codec is not supported by this browser.': 'Il codec audio non è supportato dal browser.', 'Playback trouble? Open on YouTube': 'Problemi di riproduzione? Apri su YouTube', 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mer', 'Thu': 'Gio', 'Fri': 'Ven', 'Sat': 'Sab', 'Sun': 'Dom', 'Account created. You are now signed in.': 'Account creato. Hai effettuato l’accesso.', 'Password reset. You can now sign in.': 'Password reimpostata. Ora puoi accedere.', 'Could not load practice progress.': 'Impossibile caricare i progressi della pratica.'
})
Object.assign(pageTranslations.fr, {
  'App navigation': 'Navigation de l’application', 'Material URL': 'https://example.com/material', 'Local storage: {used} used': 'Stockage local : {used} utilisés', 'of {quota}': 'sur {quota}', 'This web page does not provide an embeddable media format, or it blocks inline viewing.': 'Cette page web ne fournit pas de format multimédia intégrable ou bloque la lecture intégrée.', 'This video codec or container is not fully supported by this browser.': 'Ce codec ou conteneur vidéo n’est pas entièrement pris en charge par ce navigateur.', 'The audio codec is not supported by this browser.': 'Le codec audio n’est pas pris en charge par ce navigateur.', 'Playback trouble? Open on YouTube': 'Problème de lecture ? Ouvrir sur YouTube', 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mer', 'Thu': 'Jeu', 'Fri': 'Ven', 'Sat': 'Sam', 'Sun': 'Dim', 'Account created. You are now signed in.': 'Compte créé. Vous êtes maintenant connecté.', 'Password reset. You can now sign in.': 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.', 'Could not load practice progress.': 'Impossible de charger les progrès de pratique.'
})

Object.assign(pageTranslations.en, { 'Low Eb': 'Low Eb', 'High Eb': 'High Eb', 'Could not save the song list.': 'Could not save the song list.' })
Object.assign(pageTranslations.ru, { 'Low Eb': 'Низкая Eb', 'High Eb': 'Высокая Eb', 'Could not save the song list.': 'Не удалось сохранить список песен.' })
Object.assign(pageTranslations.it, { 'Low Eb': 'Eb basso', 'High Eb': 'Eb alto', 'Could not save the song list.': 'Impossibile salvare l’elenco dei brani.' })
Object.assign(pageTranslations.fr, { 'Low Eb': 'Eb grave', 'High Eb': 'Eb aigu', 'Could not save the song list.': 'Impossible d’enregistrer la liste des morceaux.' })

Object.assign(pageTranslations.en, { 'ToDo': 'ToDo', '+ Add ToDo': '+ Add ToDo', 'No ToDo items yet for this week.': 'No ToDo items yet for this week.', 'ToDo name': 'ToDo name' })
Object.assign(pageTranslations.ru, { 'ToDo': 'Задачи', '+ Add ToDo': '+ Добавить задачу', 'No ToDo items yet for this week.': 'На этой неделе пока нет задач.', 'ToDo name': 'Название задачи' })
Object.assign(pageTranslations.it, { 'ToDo': 'Attività', '+ Add ToDo': '+ Aggiungi attività', 'No ToDo items yet for this week.': 'Nessuna attività per questa settimana.', 'ToDo name': 'Nome dell’attività' })
Object.assign(pageTranslations.fr, { 'ToDo': 'À faire', '+ Add ToDo': '+ Ajouter une tâche', 'No ToDo items yet for this week.': 'Aucune tâche pour cette semaine.', 'ToDo name': 'Nom de la tâche' })
Object.assign(pageTranslations.en, {
  'No blocks yet': 'No blocks yet', 'Choose what to practice first.': 'Choose what to practice first.', 'No practice was logged for this day.': 'No practice was logged for this day.',
  'Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.': 'Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.',
  'Empty session deleted successfully.': 'Empty session deleted successfully.',
  'Could not delete the empty session. Your changes have been kept.': 'Could not delete the empty session. Your changes have been kept.',
  'Add a block': 'Add a block', 'Add another block': 'Add another block', '{minutes} min': '{minutes} min', 'Add a block to save a session.': 'Add a block to save a session.',
  'Save changes': 'Save changes', 'Block removed': 'Block removed', 'Undo': 'Undo', '{label} added': '{label} added',
  'Discard changes?': 'Discard changes?', 'Unsaved changes will be lost.': 'Unsaved changes will be lost.', 'Discard': 'Discard', 'Keep editing': 'Keep editing',
  'Select a day, then choose your first block.': 'Select a day, then choose your first block.',
})
Object.assign(pageTranslations.ru, {
  'No blocks yet': 'Блоков пока нет', 'Choose what to practice first.': 'Выберите, с чего начать практику.', 'No practice was logged for this day.': 'В этот день практика не записана.',
  'Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.': 'Нельзя сохранить занятие: оно содержит неподдерживаемые устаревшие блоки. Все записанные блоки и заметки сохранены без изменений.',
  'Empty session deleted successfully.': 'Пустое занятие удалено.',
  'Could not delete the empty session. Your changes have been kept.': 'Не удалось удалить пустое занятие. Ваши изменения сохранены в редакторе.',
  'Add a block': 'Добавить блок', 'Add another block': 'Добавить ещё блок', '{minutes} min': '{minutes} мин', 'Add a block to save a session.': 'Добавьте блок, чтобы сохранить занятие.',
  'Save changes': 'Сохранить изменения', 'Block removed': 'Блок удалён', 'Undo': 'Отменить', '{label} added': 'Добавлен блок: {label}',
  'Discard changes?': 'Отменить изменения?', 'Unsaved changes will be lost.': 'Несохранённые изменения будут потеряны.', 'Discard': 'Отменить', 'Keep editing': 'Продолжить редактирование',
  'Select a day, then choose your first block.': 'Выберите день, затем первый блок.',
})
Object.assign(pageTranslations.it, {
  'No blocks yet': 'Ancora nessun blocco', 'Choose what to practice first.': 'Scegli da cosa iniziare.', 'No practice was logged for this day.': 'Nessuna pratica registrata per questo giorno.',
  'Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.': 'Impossibile salvare questa sessione perché contiene blocchi legacy non supportati. Tutti i blocchi e le note salvati sono stati preservati.',
  'Empty session deleted successfully.': 'Sessione vuota eliminata.',
  'Could not delete the empty session. Your changes have been kept.': 'Impossibile eliminare la sessione vuota. Le modifiche restano nell’editor.',
  'Add a block': 'Aggiungi un blocco', 'Add another block': 'Aggiungi un altro blocco', '{minutes} min': '{minutes} min', 'Add a block to save a session.': 'Aggiungi un blocco per salvare la sessione.',
  'Save changes': 'Salva modifiche', 'Block removed': 'Blocco rimosso', 'Undo': 'Annulla', '{label} added': '{label} aggiunto',
  'Discard changes?': 'Scartare le modifiche?', 'Unsaved changes will be lost.': 'Le modifiche non salvate andranno perse.', 'Discard': 'Scarta', 'Keep editing': 'Continua a modificare',
  'Select a day, then choose your first block.': 'Seleziona un giorno, poi scegli il primo blocco.',
})
Object.assign(pageTranslations.fr, {
  'No blocks yet': 'Aucun bloc pour l’instant', 'Choose what to practice first.': 'Choisissez par quoi commencer.', 'No practice was logged for this day.': 'Aucune pratique enregistrée pour ce jour.',
  'Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.': 'Impossible d’enregistrer cette séance car elle contient des blocs anciens non pris en charge. Tous les blocs et notes enregistrés ont été conservés.',
  'Empty session deleted successfully.': 'Séance vide supprimée.',
  'Could not delete the empty session. Your changes have been kept.': 'Impossible de supprimer la séance vide. Vos modifications restent dans l’éditeur.',
  'Add a block': 'Ajouter un bloc', 'Add another block': 'Ajouter un autre bloc', '{minutes} min': '{minutes} min', 'Add a block to save a session.': 'Ajoutez un bloc pour enregistrer une séance.',
  'Save changes': 'Enregistrer les modifications', 'Block removed': 'Bloc supprimé', 'Undo': 'Annuler', '{label} added': '{label} ajouté',
  'Discard changes?': 'Abandonner les modifications ?', 'Unsaved changes will be lost.': 'Les modifications non enregistrées seront perdues.', 'Discard': 'Abandonner', 'Keep editing': 'Continuer à modifier',
  'Select a day, then choose your first block.': 'Sélectionnez un jour, puis choisissez votre premier bloc.',
})
Object.assign(pageTranslations.en, { 'ToDo checklist': 'ToDo checklist', 'No ToDo items for this week.': 'No ToDo items for this week.' })
Object.assign(pageTranslations.ru, { 'ToDo checklist': 'Список задач', 'No ToDo items for this week.': 'На этой неделе нет задач.' })
Object.assign(pageTranslations.it, { 'ToDo checklist': 'Elenco attività', 'No ToDo items for this week.': 'Nessuna attività per questa settimana.' })
Object.assign(pageTranslations.fr, { 'ToDo checklist': 'Liste des tâches', 'No ToDo items for this week.': 'Aucune tâche pour cette semaine.' })
Object.assign(pageTranslations.en, { 'Add a ToDo': 'Add a ToDo', 'Add': 'Add', 'Could not add the ToDo.': 'Could not add the ToDo.' })
Object.assign(pageTranslations.ru, { 'Add a ToDo': 'Добавить задачу', 'Add': 'Добавить', 'Could not add the ToDo.': 'Не удалось добавить задачу.' })
Object.assign(pageTranslations.it, { 'Add a ToDo': 'Aggiungi un’attività', 'Add': 'Aggiungi', 'Could not add the ToDo.': 'Impossibile aggiungere l’attività.' })
Object.assign(pageTranslations.fr, { 'Add a ToDo': 'Ajouter une tâche', 'Add': 'Ajouter', 'Could not add the ToDo.': 'Impossible d’ajouter la tâche.' })
Object.assign(pageTranslations.en, { 'Could not save the ToDo.': 'Could not save the ToDo.' })
Object.assign(pageTranslations.ru, { 'Could not save the ToDo.': 'Не удалось сохранить задачу.' })
Object.assign(pageTranslations.it, { 'Could not save the ToDo.': 'Impossibile salvare l’attività.' })
Object.assign(pageTranslations.fr, { 'Could not save the ToDo.': 'Impossible d’enregistrer la tâche.' })
Object.assign(pageTranslations.en, { 'Imported': 'Imported', 'App': 'App', 'Metronome settings': 'Metronome settings' })
Object.assign(pageTranslations.ru, { 'Imported': 'Импорт', 'App': 'Приложение', 'Metronome settings': 'Настройки метронома' })
Object.assign(pageTranslations.it, { 'Imported': 'Importata', 'App': 'App', 'Metronome settings': 'Impostazioni del metronomo' })
Object.assign(pageTranslations.fr, { 'Imported': 'Importée', 'App': 'App', 'Metronome settings': 'Réglages du métronome' })
Object.assign(pageTranslations.en, { 'Default references': 'Default references' })
Object.assign(pageTranslations.ru, { 'Default references': 'Материалы по умолчанию' })
Object.assign(pageTranslations.it, { 'Default references': 'Riferimenti predefiniti' })
Object.assign(pageTranslations.fr, { 'Default references': 'Références par défaut' })
Object.assign(pageTranslations.en, { 'Details': 'Details' })
Object.assign(pageTranslations.ru, { 'Details': 'Подробнее' })
Object.assign(pageTranslations.it, { 'Details': 'Dettagli' })
Object.assign(pageTranslations.fr, { 'Details': 'Détails' })
Object.assign(pageTranslations.en, { 'Bookmarks': 'Bookmarks', 'Save position': 'Save position', 'Remove bookmark': 'Remove bookmark', 'No bookmarks yet': 'No bookmarks yet' })
Object.assign(pageTranslations.ru, { 'Bookmarks': 'Закладки', 'Save position': 'Сохранить позицию', 'Remove bookmark': 'Удалить закладку', 'No bookmarks yet': 'Закладок пока нет' })
Object.assign(pageTranslations.it, { 'Bookmarks': 'Segnalibri', 'Save position': 'Salva posizione', 'Remove bookmark': 'Rimuovi segnalibro', 'No bookmarks yet': 'Nessun segnalibro' })
Object.assign(pageTranslations.fr, { 'Bookmarks': 'Signets', 'Save position': 'Enregistrer la position', 'Remove bookmark': 'Supprimer le signet', 'No bookmarks yet': 'Aucun signet' })
Object.assign(pageTranslations.en, { 'Choose file': 'Choose file' })
Object.assign(pageTranslations.ru, { 'Choose file': 'Выбрать файл' })
Object.assign(pageTranslations.it, { 'Choose file': 'Scegli file' })
Object.assign(pageTranslations.fr, { 'Choose file': 'Choisir un fichier' })
Object.assign(pageTranslations.en, { 'Open PDF': 'Open PDF' })
Object.assign(pageTranslations.ru, { 'Open PDF': 'Открыть PDF' })
Object.assign(pageTranslations.it, { 'Open PDF': 'Apri PDF' })
Object.assign(pageTranslations.fr, { 'Open PDF': 'Ouvrir le PDF' })
Object.assign(pageTranslations.en, { 'Default exercise': 'Default exercise' })
Object.assign(pageTranslations.ru, { 'Default exercise': 'Стандартное упражнение' })
Object.assign(pageTranslations.it, { 'Default exercise': 'Esercizio predefinito' })
Object.assign(pageTranslations.fr, { 'Default exercise': 'Exercice par défaut' })
Object.assign(pageTranslations.en, { 'Open in new tab': 'Open in new tab', 'If the PDF does not appear, your browser cannot show it inline.': 'If the PDF does not appear, your browser cannot show it inline.' })
Object.assign(pageTranslations.ru, { 'Open in new tab': 'Открыть в новой вкладке', 'If the PDF does not appear, your browser cannot show it inline.': 'Если PDF не отображается, ваш браузер не может показать его на странице.' })
Object.assign(pageTranslations.it, { 'Open in new tab': 'Apri in una nuova scheda', 'If the PDF does not appear, your browser cannot show it inline.': 'Se il PDF non appare, il browser non può mostrarlo nella pagina.' })
Object.assign(pageTranslations.fr, { 'Open in new tab': 'Ouvrir dans un nouvel onglet', 'If the PDF does not appear, your browser cannot show it inline.': 'Si le PDF n’apparaît pas, votre navigateur ne peut pas l’afficher dans la page.' })
Object.assign(pageTranslations.en, { 'Could not load the local material.': 'Could not load the local material.' })
Object.assign(pageTranslations.ru, { 'Could not load the local material.': 'Не удалось загрузить локальный материал.' })
Object.assign(pageTranslations.it, { 'Could not load the local material.': 'Impossibile caricare il materiale locale.' })
Object.assign(pageTranslations.fr, { 'Could not load the local material.': 'Impossible de charger le matériel local.' })
Object.assign(pageTranslations.en, { 'This YouTube link is not valid.': 'This YouTube link is not valid.', 'Could not remove the local material.': 'Could not remove the local material.' })
Object.assign(pageTranslations.ru, { 'This YouTube link is not valid.': 'Эта ссылка YouTube недействительна.', 'Could not remove the local material.': 'Не удалось удалить локальный материал.' })
Object.assign(pageTranslations.it, { 'This YouTube link is not valid.': 'Questo link YouTube non è valido.', 'Could not remove the local material.': 'Impossibile rimuovere il materiale locale.' })
Object.assign(pageTranslations.fr, { 'This YouTube link is not valid.': 'Ce lien YouTube n’est pas valide.', 'Could not remove the local material.': 'Impossible de supprimer le matériel local.' })
Object.assign(pageTranslations.en, { 'Include default exercises': 'Include default exercises' })
Object.assign(pageTranslations.ru, { 'Include default exercises': 'Включать стандартные упражнения' })
Object.assign(pageTranslations.it, { 'Include default exercises': 'Includi esercizi predefiniti' })
Object.assign(pageTranslations.fr, { 'Include default exercises': 'Inclure les exercices par défaut' })
Object.assign(pageTranslations.en, { '{block} timer minutes': '{block} timer minutes', '{block} timer seconds': '{block} timer seconds', 'Timeline': 'Timeline' })
Object.assign(pageTranslations.ru, { '{block} timer minutes': '{block}: минуты таймера', '{block} timer seconds': '{block}: секунды таймера', 'Timeline': 'Хронология' })
Object.assign(pageTranslations.it, { '{block} timer minutes': '{block}: minuti del timer', '{block} timer seconds': '{block}: secondi del timer', 'Timeline': 'Cronologia' })
Object.assign(pageTranslations.fr, { '{block} timer minutes': '{block} : minutes du minuteur', '{block} timer seconds': '{block} : secondes du minuteur', 'Timeline': 'Chronologie' })
Object.assign(pageTranslations.en, { 'Your navigation menu': 'Your navigation menu', 'Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.': 'Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.', 'Track your progress': 'Track your progress', 'Review completed practice, upcoming weeks, and your progress timeline here.': 'Review completed practice, upcoming weeks, and your progress timeline here.', 'Plan your week': 'Plan your week', 'Open the current week to edit focus, tasks, ToDos, and songs.': 'Open the current week to edit focus, tasks, ToDos, and songs.', 'Practice and log work': 'Practice and log work', 'Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.': 'Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.', 'Skip': 'Skip', 'Back': 'Back', 'Tour next': 'Next', 'Tour done': 'Done' })
Object.assign(pageTranslations.ru, { 'Your navigation menu': 'Меню навигации', 'Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.': 'Открывайте это меню для перехода между главной, прогрессом, планом, практикой, статистикой и настройками.', 'Track your progress': 'Отслеживайте прогресс', 'Review completed practice, upcoming weeks, and your progress timeline here.': 'Здесь можно посмотреть завершённую практику, будущие недели и временную шкалу прогресса.', 'Plan your week': 'Планируйте неделю', 'Open the current week to edit focus, tasks, ToDos, and songs.': 'Откройте текущую неделю, чтобы изменить фокус, задачи, список «Задачи» и песни.', 'Practice and log work': 'Практикуйтесь и записывайте работу', 'Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.': 'В разделе практики доступны таймеры, блоки, «Задачи», метроном, тюнер и материалы.', 'Skip': 'Пропустить', 'Back': 'Назад', 'Tour next': 'Далее', 'Tour done': 'Готово' })
Object.assign(pageTranslations.it, { 'Your navigation menu': 'Menu di navigazione', 'Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.': 'Apri questo menu per passare tra Home, Progressi, Piano, Pratica, Statistiche e Impostazioni.', 'Track your progress': 'Segui i tuoi progressi', 'Review completed practice, upcoming weeks, and your progress timeline here.': 'Qui puoi rivedere la pratica completata, le prossime settimane e la timeline dei progressi.', 'Plan your week': 'Pianifica la settimana', 'Open the current week to edit focus, tasks, ToDos, and songs.': 'Apri la settimana attuale per modificare obiettivo, attività, elenco «Attività» e brani.', 'Practice and log work': 'Pratica e registra il lavoro', 'Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.': 'In Pratica trovi timer, blocchi, «Attività», metronomo, accordatore e materiali.', 'Skip': 'Salta', 'Back': 'Indietro', 'Tour next': 'Avanti', 'Tour done': 'Fine' })
Object.assign(pageTranslations.fr, { 'Your navigation menu': 'Menu de navigation', 'Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.': 'Ouvrez ce menu pour passer entre Accueil, Progrès, Plan, Pratique, Statistiques et Paramètres.', 'Track your progress': 'Suivez vos progrès', 'Review completed practice, upcoming weeks, and your progress timeline here.': 'Consultez ici votre pratique terminée, les semaines à venir et votre parcours de progrès.', 'Plan your week': 'Planifiez votre semaine', 'Open the current week to edit focus, tasks, ToDos, and songs.': 'Ouvrez la semaine actuelle pour modifier l’objectif, les tâches, la liste « À faire » et les morceaux.', 'Practice and log work': 'Pratiquez et notez votre travail', 'Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.': 'La pratique regroupe les minuteurs, blocs, « À faire », métronome, accordeur et supports.', 'Skip': 'Passer', 'Back': 'Retour', 'Tour next': 'Suivant', 'Tour done': 'Terminé' })

Object.assign(pageTranslations.en, {
  'Help': 'Help', 'Guided tour': 'Guided tour',
  'Add or open a week on the Plan screen to use this plan. Once a week covers today, its tour will appear here.': 'Add or open a week on the Plan screen to use this plan. Once a week covers today, its tour will appear here.',
  'This screen has nothing to point at yet. Open Help again once its content has loaded.': 'This screen has nothing to point at yet. Open Help again once its content has loaded.',
  'Your timeline': 'Your timeline', 'See every program and week as a journey: what you finished, where you are now, and what comes next.': 'See every program and week as a journey: what you finished, where you are now, and what comes next.',
  'Stats shortcut': 'Stats shortcut', 'Jump from here to Stats for your totals, streaks, and practice charts.': 'Jump from here to Stats for your totals, streaks, and practice charts.',
  'This week\'s plan': 'This week\'s plan', 'Pick a week, set its focus and tasks, then press Save plan to keep your changes.': 'Pick a week, set its focus and tasks, then press Save plan to keep your changes.',
  'Songs and ToDos': 'Songs and ToDos', 'Keep a ToDo list for the week and add the songs you are learning, one per line.': 'Keep a ToDo list for the week and add the songs you are learning, one per line.',
  'Choose a day and blocks': 'Choose a day and blocks',
  'Timer, metronome and tuner': 'Timer, metronome and tuner', 'Keep time with the metronome, tune your guitar, and time each block while you play.': 'Keep time with the metronome, tune your guitar, and time each block while you play.',
  'Save your session': 'Save your session', 'Add a few notes and save the session so it counts toward your progress and stats.': 'Add a few notes and save the session so it counts toward your progress and stats.',
  'Filter your stats': 'Filter your stats', 'Switch between the current week, month, year, a custom range, or your full history.': 'Switch between the current week, month, year, a custom range, or your full history.',
  'Your totals': 'Your totals', 'Practice time, sessions logged, your current streak, and the selected period at a glance.': 'Practice time, sessions logged, your current streak, and the selected period at a glance.',
  'Choose the language of the app. It is saved to your account and used on every device.': 'Choose the language of the app. It is saved to your account and used on every device.',
  'Turn practice options on or off, such as default exercises and target practice time.': 'Turn practice options on or off, such as default exercises and target practice time.',
})
Object.assign(pageTranslations.ru, {
  'Help': 'Помощь', 'Guided tour': 'Обзор приложения',
  'Add or open a week on the Plan screen to use this plan. Once a week covers today, its tour will appear here.': 'Добавьте или откройте неделю на экране «План», чтобы пользоваться планом. Когда неделя охватит сегодняшний день, обзор появится здесь.',
  'This screen has nothing to point at yet. Open Help again once its content has loaded.': 'Здесь пока нечего показывать. Нажмите «Помощь» ещё раз, когда содержимое загрузится.',
  'Your timeline': 'Ваш путь', 'See every program and week as a journey: what you finished, where you are now, and what comes next.': 'Все программы и недели как единый путь: что уже завершено, где вы сейчас и что впереди.',
  'Stats shortcut': 'Быстрый переход к статистике', 'Jump from here to Stats for your totals, streaks, and practice charts.': 'Отсюда можно перейти в «Статистику»: итоги, серии и графики практики.',
  'This week\'s plan': 'План этой недели', 'Pick a week, set its focus and tasks, then press Save plan to keep your changes.': 'Выберите неделю, задайте фокус и задачи, затем нажмите «Сохранить план», чтобы сохранить изменения.',
  'Songs and ToDos': 'Песни и задачи', 'Keep a ToDo list for the week and add the songs you are learning, one per line.': 'Ведите список «Задачи» на неделю и добавляйте песни, которые разучиваете, по одной в строке.',
  'Choose a day and blocks': 'Выберите день и блоки',
  'Timer, metronome and tuner': 'Таймер, метроном и тюнер', 'Keep time with the metronome, tune your guitar, and time each block while you play.': 'Играйте под метроном, настраивайте гитару и засекайте время каждого блока.',
  'Save your session': 'Сохраните занятие', 'Add a few notes and save the session so it counts toward your progress and stats.': 'Добавьте заметки и сохраните занятие, чтобы оно учитывалось в прогрессе и статистике.',
  'Filter your stats': 'Фильтры статистики', 'Switch between the current week, month, year, a custom range, or your full history.': 'Переключайтесь между текущей неделей, месяцем, годом, своим диапазоном или всей историей.',
  'Your totals': 'Ваши итоги', 'Practice time, sessions logged, your current streak, and the selected period at a glance.': 'Время практики, число занятий, текущая серия и выбранный период — всё в одном месте.',
  'Choose the language of the app. It is saved to your account and used on every device.': 'Выберите язык приложения. Он сохраняется в вашем аккаунте и действует на всех устройствах.',
  'Turn practice options on or off, such as default exercises and target practice time.': 'Включайте и отключайте параметры практики, например упражнения по умолчанию и целевое время практики.',
})
Object.assign(pageTranslations.it, {
  'Help': 'Aiuto', 'Guided tour': 'Tour guidato',
  'Add or open a week on the Plan screen to use this plan. Once a week covers today, its tour will appear here.': 'Aggiungi o apri una settimana nella schermata Piano per usare questo piano. Quando una settimana copre oggi, qui apparirà il tour.',
  'This screen has nothing to point at yet. Open Help again once its content has loaded.': 'Qui non c’è ancora nulla da mostrare. Premi di nuovo Aiuto quando il contenuto è caricato.',
  'Your timeline': 'La tua cronologia', 'See every program and week as a journey: what you finished, where you are now, and what comes next.': 'Vedi ogni programma e settimana come un percorso: cosa hai completato, dove sei ora e cosa viene dopo.',
  'Stats shortcut': 'Scorciatoia alle statistiche', 'Jump from here to Stats for your totals, streaks, and practice charts.': 'Da qui puoi passare a Statistiche per totali, serie e grafici della pratica.',
  'This week\'s plan': 'Il piano di questa settimana', 'Pick a week, set its focus and tasks, then press Save plan to keep your changes.': 'Scegli una settimana, imposta obiettivo e attività, poi premi Salva piano per conservare le modifiche.',
  'Songs and ToDos': 'Brani e attività', 'Keep a ToDo list for the week and add the songs you are learning, one per line.': 'Tieni un elenco «Attività» per la settimana e aggiungi i brani che stai imparando, uno per riga.',
  'Choose a day and blocks': 'Scegli un giorno e i blocchi',
  'Timer, metronome and tuner': 'Timer, metronomo e accordatore', 'Keep time with the metronome, tune your guitar, and time each block while you play.': 'Suona a tempo con il metronomo, accorda la chitarra e cronometra ogni blocco mentre studi.',
  'Save your session': 'Salva la sessione', 'Add a few notes and save the session so it counts toward your progress and stats.': 'Aggiungi qualche nota e salva la sessione: verrà contata nei progressi e nelle statistiche.',
  'Filter your stats': 'Filtra le statistiche', 'Switch between the current week, month, year, a custom range, or your full history.': 'Passa tra settimana, mese e anno attuali, un intervallo personalizzato o tutta la cronologia.',
  'Your totals': 'I tuoi totali', 'Practice time, sessions logged, your current streak, and the selected period at a glance.': 'Tempo di pratica, sessioni registrate, serie attuale e periodo selezionato a colpo d’occhio.',
  'Choose the language of the app. It is saved to your account and used on every device.': 'Scegli la lingua dell’app. Viene salvata nel tuo account e usata su ogni dispositivo.',
  'Turn practice options on or off, such as default exercises and target practice time.': 'Attiva o disattiva le opzioni di pratica, come gli esercizi predefiniti e il tempo di pratica obiettivo.',
})
Object.assign(pageTranslations.fr, {
  'Help': 'Aide', 'Guided tour': 'Visite guidée',
  'Add or open a week on the Plan screen to use this plan. Once a week covers today, its tour will appear here.': 'Ajoutez ou ouvrez une semaine dans l’écran Plan pour utiliser ce plan. Dès qu’une semaine couvre aujourd’hui, la visite apparaîtra ici.',
  'This screen has nothing to point at yet. Open Help again once its content has loaded.': 'Il n’y a encore rien à montrer ici. Appuyez de nouveau sur Aide une fois le contenu chargé.',
  'Your timeline': 'Votre parcours', 'See every program and week as a journey: what you finished, where you are now, and what comes next.': 'Visualisez chaque programme et chaque semaine comme un parcours : ce que vous avez terminé, où vous en êtes et la suite.',
  'Stats shortcut': 'Raccourci vers les statistiques', 'Jump from here to Stats for your totals, streaks, and practice charts.': 'Passez d’ici aux Statistiques pour vos totaux, séries et graphiques de pratique.',
  'This week\'s plan': 'Le plan de cette semaine', 'Pick a week, set its focus and tasks, then press Save plan to keep your changes.': 'Choisissez une semaine, définissez son objectif et ses tâches, puis appuyez sur Enregistrer le plan pour conserver vos modifications.',
  'Songs and ToDos': 'Morceaux et à faire', 'Keep a ToDo list for the week and add the songs you are learning, one per line.': 'Tenez une liste « À faire » pour la semaine et ajoutez les morceaux que vous apprenez, un par ligne.',
  'Choose a day and blocks': 'Choisissez un jour et des blocs',
  'Timer, metronome and tuner': 'Minuteur, métronome et accordeur', 'Keep time with the metronome, tune your guitar, and time each block while you play.': 'Jouez en rythme avec le métronome, accordez votre guitare et chronométrez chaque bloc.',
  'Save your session': 'Enregistrez votre séance', 'Add a few notes and save the session so it counts toward your progress and stats.': 'Ajoutez quelques notes et enregistrez la séance pour qu’elle compte dans vos progrès et statistiques.',
  'Filter your stats': 'Filtrez vos statistiques', 'Switch between the current week, month, year, a custom range, or your full history.': 'Passez de la semaine, du mois ou de l’année en cours à une période personnalisée ou à tout l’historique.',
  'Your totals': 'Vos totaux', 'Practice time, sessions logged, your current streak, and the selected period at a glance.': 'Temps de pratique, séances enregistrées, série actuelle et période sélectionnée en un coup d’œil.',
  'Choose the language of the app. It is saved to your account and used on every device.': 'Choisissez la langue de l’application. Elle est enregistrée dans votre compte et utilisée sur tous vos appareils.',
  'Turn practice options on or off, such as default exercises and target practice time.': 'Activez ou désactivez les options de pratique, comme les exercices par défaut et le temps de pratique cible.',
})

Object.assign(pageTranslations.en, {
  'Menu and Help': 'Menu and Help',
  'Switch screens here. Tap Help at the bottom of any screen to replay its tour.': 'Switch screens here. Tap Help at the bottom of any screen to replay its tour.',
  "Start here: see this week's focus, tasks and ToDos, and edit them.": "Start here: see this week's focus, tasks and ToDos, and edit them.",
  'Practice and log': 'Practice and log',
  'Pick blocks, use the timer, metronome and tuner, then save the session.': 'Pick blocks, use the timer, metronome and tuner, then save the session.',
  'Track progress': 'Track progress',
  'See finished and upcoming weeks. Your first session shows up here.': 'See finished and upcoming weeks. Your first session shows up here.',
  'Your weeks': 'Your weeks',
  'Each row is a practice week. Select one to edit it. Today marks this week.': 'Each row is a practice week. Select one to edit it. Today marks this week.',
  'Set the focus, program and dates for the week you picked.': 'Set the focus, program and dates for the week you picked.',
  'Weekly tasks': 'Weekly tasks',
  'Write what to work on. Practice shows it as the week description.': 'Write what to work on. Practice shows it as the week description.',
  'ToDo list': 'ToDo list',
  'Small goals for the week. Tick them off here or on the Practice screen.': 'Small goals for the week. Tick them off here or on the Practice screen.',
  'Save your plan': 'Save your plan',
  "Save stores the week's focus, program, dates, tasks, ToDos and songs.": "Save stores the week's focus, program, dates, tasks, ToDos and songs.",
  'Pick a day': 'Pick a day',
  'Choose the day to log. Today is marked; days with a session show a check.': 'Choose the day to log. Today is marked; days with a session show a check.',
  'Blocks are what you practice, like warm-up or technique. Add at least one.': 'Blocks are what you practice, like warm-up or technique. Add at least one.',
  'Metronome and tuner': 'Metronome and tuner',
  'Tap play/stop; hold or right-click for settings. The tuner is beside it.': 'Tap play/stop; hold or right-click for settings. The tuner is beside it.',
  'Save logs your blocks and notes. Add a block to unlock a new session; saved days can save changes.': 'Save logs your blocks and notes. Add a block to unlock a new session; saved days can save changes.',
  'Tap a program to open its weeks. Tap a week to open it in Plan; Practice starts that week.': 'Tap a program to open its weeks. Tap a week to open it in Plan; Practice starts that week.',
  'Open week {week} in Plan': 'Open week {week} in Plan', 'Practice week {week}': 'Practice week {week}',
  'Open Stats for totals, streaks and charts.': 'Open Stats for totals, streaks and charts.',
  'Choose a period': 'Choose a period',
  'Switch between week, month, year, a custom range or all time.': 'Switch between week, month, year, a custom range or all time.',
  'Time, sessions and streak for the chosen period. Charts are below.': 'Time, sessions and streak for the chosen period. Charts are below.',
  '{current} of {total}': '{current} of {total}', 'Skip tour': 'Skip tour',
})
Object.assign(pageTranslations.ru, {
  'Menu and Help': 'Меню и помощь',
  'Switch screens here. Tap Help at the bottom of any screen to replay its tour.': 'Переключайте экраны здесь. Нажмите «Помощь» внизу любого экрана, чтобы повторить его обзор.',
  "Start here: see this week's focus, tasks and ToDos, and edit them.": 'Начните здесь: просмотрите и измените фокус, план работы и задачи этой недели.',
  'Practice and log': 'Практика и запись',
  'Pick blocks, use the timer, metronome and tuner, then save the session.': 'Выберите блоки, используйте таймер, метроном и тюнер, затем сохраните занятие.',
  'Track progress': 'Следите за прогрессом',
  'See finished and upcoming weeks. Your first session shows up here.': 'Просматривайте завершённые и предстоящие недели. Ваше первое занятие появится здесь.',
  'Your weeks': 'Ваши недели',
  'Each row is a practice week. Select one to edit it. Today marks this week.': 'Каждая строка — неделя практики. Выберите её для редактирования. «Сегодня» отмечает текущую неделю.',
  'Set the focus, program and dates for the week you picked.': 'Задайте фокус, программу и даты выбранной недели.',
  'Weekly tasks': 'План работы на неделю',
  'Write what to work on. Practice shows it as the week description.': 'Напишите, над чем работать. В «Практике» это показано как описание недели.',
  'ToDo list': 'Список задач',
  'Small goals for the week. Tick them off here or on the Practice screen.': 'Небольшие цели на неделю. Отмечайте их здесь или на экране «Практика».',
  'Save your plan': 'Сохраните план',
  "Save stores the week's focus, program, dates, tasks, ToDos and songs.": 'Сохранение записывает фокус, программу, даты, план работы, задачи и песни недели.',
  'Pick a day': 'Выберите день',
  'Choose the day to log. Today is marked; days with a session show a check.': 'Выберите день для записи. Сегодня отмечено; дни с занятием показаны с галочкой.',
  'Blocks are what you practice, like warm-up or technique. Add at least one.': 'Блоки — то, что вы практикуете, например разминка или техника. Добавьте хотя бы один.',
  'Metronome and tuner': 'Метроном и тюнер',
  'Tap play/stop; hold or right-click for settings. The tuner is beside it.': 'Нажмите для пуска/стопа; удерживайте или нажмите правой кнопкой для настроек. Тюнер рядом.',
  'Save logs your blocks and notes. Add a block to unlock a new session; saved days can save changes.': 'Сохранение записывает блоки и заметки. Для нового занятия добавьте блок; сохранённые дни допускают изменения.',
  'Tap a program to open its weeks. Tap a week to open it in Plan; Practice starts that week.': 'Нажмите на программу, чтобы раскрыть недели. Нажмите на неделю, чтобы открыть её в «Плане»; «Практика» запускает эту неделю.',
  'Open week {week} in Plan': 'Открыть неделю {week} в «Плане»', 'Practice week {week}': 'Практика: неделя {week}',
  'Open Stats for totals, streaks and charts.': 'Откройте «Статистику» для итогов, серий и графиков.',
  'Choose a period': 'Выберите период',
  'Switch between week, month, year, a custom range or all time.': 'Выберите неделю, месяц, год, произвольный диапазон или всё время.',
  'Time, sessions and streak for the chosen period. Charts are below.': 'Время, занятия и серия за выбранный период. Графики ниже.',
  '{current} of {total}': '{current} из {total}', 'Skip tour': 'Пропустить обзор',
})
Object.assign(pageTranslations.it, {
  'Menu and Help': 'Menu e Aiuto',
  'Switch screens here. Tap Help at the bottom of any screen to replay its tour.': 'Cambia schermata qui. Tocca Aiuto in fondo a ogni schermata per ripetere il suo tour.',
  "Start here: see this week's focus, tasks and ToDos, and edit them.": 'Inizia qui: visualizza e modifica obiettivo, piano di lavoro e attività della settimana.',
  'Practice and log': 'Pratica e registra',
  'Pick blocks, use the timer, metronome and tuner, then save the session.': 'Scegli i blocchi, usa timer, metronomo e accordatore, poi salva la sessione.',
  'Track progress': 'Segui i progressi',
  'See finished and upcoming weeks. Your first session shows up here.': 'Vedi le settimane completate e quelle future. La tua prima sessione apparirà qui.',
  'Your weeks': 'Le tue settimane',
  'Each row is a practice week. Select one to edit it. Today marks this week.': 'Ogni riga è una settimana di pratica. Selezionala per modificarla. Oggi indica la settimana attuale.',
  'Set the focus, program and dates for the week you picked.': 'Imposta obiettivo, programma e date della settimana scelta.',
  'Weekly tasks': 'Piano di lavoro settimanale',
  'Write what to work on. Practice shows it as the week description.': 'Scrivi su cosa lavorare. Pratica lo mostra come descrizione della settimana.',
  'ToDo list': 'Elenco attività',
  'Small goals for the week. Tick them off here or on the Practice screen.': 'Piccoli obiettivi per la settimana. Spuntali qui o nella schermata Pratica.',
  'Save your plan': 'Salva il tuo piano',
  "Save stores the week's focus, program, dates, tasks, ToDos and songs.": 'Salva registra obiettivo, programma, date, piano di lavoro, attività e brani della settimana.',
  'Pick a day': 'Scegli un giorno',
  'Choose the day to log. Today is marked; days with a session show a check.': 'Scegli il giorno da registrare. Oggi è indicato; i giorni con una sessione mostrano una spunta.',
  'Blocks are what you practice, like warm-up or technique. Add at least one.': 'I blocchi sono ciò che pratichi, come riscaldamento o tecnica. Aggiungine almeno uno.',
  'Metronome and tuner': 'Metronomo e accordatore',
  'Tap play/stop; hold or right-click for settings. The tuner is beside it.': 'Tocca per avvio/stop; tieni premuto o fai clic destro per le impostazioni. Accordatore accanto.',
  'Save logs your blocks and notes. Add a block to unlock a new session; saved days can save changes.': 'Salva registra blocchi e note. Aggiungi un blocco per una nuova sessione; i giorni salvati accettano modifiche.',
  'Tap a program to open its weeks. Tap a week to open it in Plan; Practice starts that week.': 'Tocca un programma per aprire le sue settimane. Tocca una settimana per aprirla in Piano; Pratica avvia quella settimana.',
  'Open week {week} in Plan': 'Apri la settimana {week} in Piano', 'Practice week {week}': 'Pratica: settimana {week}',
  'Open Stats for totals, streaks and charts.': 'Apri Statistiche per totali, serie e grafici.',
  'Choose a period': 'Scegli un periodo',
  'Switch between week, month, year, a custom range or all time.': 'Scegli settimana, mese, anno, intervallo personalizzato o tutto il periodo.',
  'Time, sessions and streak for the chosen period. Charts are below.': 'Tempo, sessioni e serie per il periodo scelto. I grafici sono sotto.',
  '{current} of {total}': '{current} di {total}', 'Skip tour': 'Salta il tour',
})
Object.assign(pageTranslations.fr, {
  'Menu and Help': 'Menu et Aide',
  'Switch screens here. Tap Help at the bottom of any screen to replay its tour.': 'Changez d’écran ici. Appuyez sur Aide en bas de chaque écran pour revoir sa visite.',
  "Start here: see this week's focus, tasks and ToDos, and edit them.": 'Commencez ici : consultez et modifiez l’objectif, le travail prévu et les tâches de la semaine.',
  'Practice and log': 'Pratiquez et enregistrez',
  'Pick blocks, use the timer, metronome and tuner, then save the session.': 'Choisissez des blocs, utilisez le minuteur, le métronome et l’accordeur, puis enregistrez la séance.',
  'Track progress': 'Suivez vos progrès',
  'See finished and upcoming weeks. Your first session shows up here.': 'Consultez les semaines terminées et à venir. Votre première séance apparaîtra ici.',
  'Your weeks': 'Vos semaines',
  'Each row is a practice week. Select one to edit it. Today marks this week.': 'Chaque ligne est une semaine de pratique. Sélectionnez-la pour la modifier. Aujourd’hui indique la semaine actuelle.',
  'Set the focus, program and dates for the week you picked.': 'Définissez l’objectif, le programme et les dates de la semaine choisie.',
  'Weekly tasks': 'Travail de la semaine',
  'Write what to work on. Practice shows it as the week description.': 'Écrivez ce qu’il faut travailler. Pratique l’affiche comme description de la semaine.',
  'ToDo list': 'Liste des tâches',
  'Small goals for the week. Tick them off here or on the Practice screen.': 'De petits objectifs pour la semaine. Cochez-les ici ou sur l’écran Pratique.',
  'Save your plan': 'Enregistrez votre plan',
  "Save stores the week's focus, program, dates, tasks, ToDos and songs.": 'Enregistrer conserve l’objectif, le programme, les dates, le travail prévu, les tâches et les morceaux de la semaine.',
  'Pick a day': 'Choisissez un jour',
  'Choose the day to log. Today is marked; days with a session show a check.': 'Choisissez le jour à enregistrer. Aujourd’hui est indiqué ; les jours avec une séance ont une coche.',
  'Blocks are what you practice, like warm-up or technique. Add at least one.': 'Les blocs sont ce que vous pratiquez, comme l’échauffement ou la technique. Ajoutez-en au moins un.',
  'Metronome and tuner': 'Métronome et accordeur',
  'Tap play/stop; hold or right-click for settings. The tuner is beside it.': 'Appuyez pour lecture/arrêt ; appui long ou clic droit pour les réglages. Accordeur à côté.',
  'Save logs your blocks and notes. Add a block to unlock a new session; saved days can save changes.': 'Enregistrer conserve blocs et notes. Ajoutez un bloc pour une nouvelle séance ; les jours enregistrés restent modifiables.',
  'Tap a program to open its weeks. Tap a week to open it in Plan; Practice starts that week.': 'Appuyez sur un programme pour ouvrir ses semaines. Appuyez sur une semaine pour l’ouvrir dans Plan ; Pratique lance cette semaine.',
  'Open week {week} in Plan': 'Ouvrir la semaine {week} dans Plan', 'Practice week {week}': 'Pratique : semaine {week}',
  'Open Stats for totals, streaks and charts.': 'Ouvrez Statistiques pour les totaux, séries et graphiques.',
  'Choose a period': 'Choisissez une période',
  'Switch between week, month, year, a custom range or all time.': 'Choisissez semaine, mois, année, période personnalisée ou toute la période.',
  'Time, sessions and streak for the chosen period. Charts are below.': 'Temps, séances et série pour la période choisie. Les graphiques sont en dessous.',
  '{current} of {total}': '{current} sur {total}', 'Skip tour': 'Passer la visite',
})

  Object.assign(pageTranslations.en, {
    'Technique and Warm-Ups': 'Technique and Warm-Ups', 'Chords and Rhythm': 'Chords and Rhythm', 'Scales and Fretboard Geography': 'Scales and Fretboard Geography', 'Ear Training': 'Ear Training', 'Repertoire and Songwork': 'Repertoire and Songwork', 'Improvisation and Composition': 'Improvisation and Composition',
    'Replace block': 'Replace block',
    'Initial week blocks': 'Initial week blocks', 'No scheduled weeks for this program.': 'No scheduled weeks for this program.',
    'Block categories': 'Block categories', 'Blocks in category': 'Blocks in category', 'No blocks in this category.': 'No blocks in this category.', 'Loading blocks…': 'Loading blocks…', '{category}: {count} blocks': '{category}: {count} blocks', '{label} selected': '{label} selected', 'Selected': 'Selected', 'Created {label}. Choose it to add.': 'Created {label}. Choose it to add.', 'Could not create the block.': 'Could not create the block.', 'Custom block name': 'Custom block name', 'Create a custom block': 'Create a custom block', 'Creating…': 'Creating…', 'Create block': 'Create block',
    'Chromatic': 'Chromatic', '2 notes per string': '2 notes per string', 'Technique': 'Technique', 'Alternate picking': 'Alternate picking', 'Legato': 'Legato', 'Rhythm': 'Rhythm', 'Chord changes': 'Chord changes', 'Barre chords': 'Barre chords', 'Strumming patterns': 'Strumming patterns', 'Major scales': 'Major scales', 'Minor scales': 'Minor scales', 'Pentatonic scales': 'Pentatonic scales', 'Notes on the fretboard': 'Notes on the fretboard', 'Notes': 'Notes', 'Intervals': 'Intervals', 'Chords': 'Chords', 'Repertoire': 'Repertoire', 'Learn a new song': 'Learn a new song', 'Evening Practice': 'Evening Practice', 'Harm./Improv.': 'Harm./Improv.', 'Jam to track': 'Jam to track', 'Songwriting': 'Songwriting', 'Learning': 'Learning',
    'Block composition': 'Block composition', 'Same every week': 'Same every week', 'Varies by week': 'Varies by week', 'Not configured': 'Not configured', 'Program blocks': 'Program blocks', 'Week blocks': 'Week blocks', 'Configure program blocks': 'Configure program blocks', 'This program has no configured block set. Choose a mode and select blocks.': 'This program has no configured block set. Choose a mode and select blocks.', 'Catalog composition is unavailable until the database is updated.': 'Catalog composition is unavailable until the database is updated.', 'Choose blocks for this varying week.': 'Choose blocks for this varying week.', 'This program varies by week.': 'This program varies by week.', 'Select at least one block.': 'Select at least one block.', 'Save composition': 'Save composition', 'Saving composition…': 'Saving composition…', 'Could not load block composition.': 'Could not load block composition.', 'Could not save block composition.': 'Could not save block composition.', 'Program mode updated.': 'Program mode updated.', 'Block composition saved.': 'Block composition saved.', 'Retry catalog': 'Retry catalog', 'Choose this week’s blocks': 'Choose this week’s blocks', 'Configure same-every-week blocks': 'Configure same-every-week blocks', 'Configure varying weeks': 'Configure varying weeks', 'Could not load the block catalog.': 'Could not load the block catalog.', 'Could not create the block catalog item.': 'Could not create the block catalog item.',
  })
  Object.assign(pageTranslations.ru, {
    'Technique and Warm-Ups': 'Техника и разминка', 'Chords and Rhythm': 'Аккорды и ритм', 'Scales and Fretboard Geography': 'Гаммы и ориентирование на грифе', 'Ear Training': 'Развитие слуха', 'Repertoire and Songwork': 'Репертуар и работа над песнями', 'Improvisation and Composition': 'Импровизация и сочинение',
    'Replace block': 'Заменить блок',
    'Initial week blocks': 'Начальные блоки недель', 'No scheduled weeks for this program.': 'Для этой программы нет запланированных недель.',
    'Block categories': 'Категории блоков', 'Blocks in category': 'Блоки в категории', 'No blocks in this category.': 'В этой категории пока нет блоков.', 'Loading blocks…': 'Загрузка блоков…', '{category}: {count} blocks': '{category}: блоков — {count}', '{label} selected': 'Выбран блок «{label}»', 'Selected': 'Выбрано', 'Created {label}. Choose it to add.': 'Создан блок «{label}». Выберите его, чтобы добавить.', 'Could not create the block.': 'Не удалось создать блок.', 'Custom block name': 'Название своего блока', 'Create a custom block': 'Создать свой блок', 'Creating…': 'Создание…', 'Create block': 'Создать блок',
    'Chromatic': 'Хроматика', '2 notes per string': '2 ноты на струну', 'Technique': 'Техника', 'Alternate picking': 'Переменный штрих', 'Legato': 'Легато', 'Rhythm': 'Ритм', 'Chord changes': 'Смена аккордов', 'Barre chords': 'Баррэ', 'Strumming patterns': 'Ритмические рисунки', 'Major scales': 'Мажорные гаммы', 'Minor scales': 'Минорные гаммы', 'Pentatonic scales': 'Пентатоники', 'Notes on the fretboard': 'Ноты на грифе', 'Notes': 'Ноты', 'Intervals': 'Интервалы', 'Chords': 'Аккорды', 'Repertoire': 'Репертуар', 'Learn a new song': 'Разучить новую песню', 'Evening Practice': 'Вечерняя практика', 'Harm./Improv.': 'Гармония/импровизация', 'Jam to track': 'Джем под трек', 'Songwriting': 'Сочинение песен', 'Learning': 'Обучение',
    'Block composition': 'Состав блоков', 'Same every week': 'Одинаковый каждую неделю', 'Varies by week': 'Разный по неделям', 'Not configured': 'Не настроено', 'Program blocks': 'Блоки программы', 'Week blocks': 'Блоки недели', 'Configure program blocks': 'Настроить блоки программы', 'This program has no configured block set. Choose a mode and select blocks.': 'Для этой программы не настроены блоки. Выберите режим и блоки.', 'Catalog composition is unavailable until the database is updated.': 'Настройка состава блоков недоступна до обновления базы данных.', 'Choose blocks for this varying week.': 'Выберите блоки для этой недели.', 'This program varies by week.': 'Набор блоков программы меняется по неделям.', 'Select at least one block.': 'Выберите хотя бы один блок.', 'Save composition': 'Сохранить состав', 'Saving composition…': 'Сохранение состава…', 'Could not load block composition.': 'Не удалось загрузить состав блоков.', 'Could not save block composition.': 'Не удалось сохранить состав блоков.', 'Program mode updated.': 'Режим программы обновлён.', 'Block composition saved.': 'Состав блоков сохранён.', 'Retry catalog': 'Повторить загрузку каталога', 'Choose this week’s blocks': 'Выбрать блоки этой недели', 'Configure same-every-week blocks': 'Настроить одинаковые блоки на каждую неделю', 'Configure varying weeks': 'Настроить разные недели', 'Could not load the block catalog.': 'Не удалось загрузить каталог блоков.', 'Could not create the block catalog item.': 'Не удалось создать блок каталога.',
  })
  Object.assign(pageTranslations.it, {
    'Technique and Warm-Ups': 'Tecnica e riscaldamento', 'Chords and Rhythm': 'Accordi e ritmo', 'Scales and Fretboard Geography': 'Scale e orientamento sulla tastiera', 'Ear Training': 'Educazione dell’orecchio', 'Repertoire and Songwork': 'Repertorio e studio dei brani', 'Improvisation and Composition': 'Improvvisazione e composizione',
    'Replace block': 'Sostituisci blocco',
    'Initial week blocks': 'Blocchi iniziali delle settimane', 'No scheduled weeks for this program.': 'Nessuna settimana pianificata per questo programma.',
    'Block categories': 'Categorie dei blocchi', 'Blocks in category': 'Blocchi nella categoria', 'No blocks in this category.': 'Nessun blocco in questa categoria.', 'Loading blocks…': 'Caricamento dei blocchi…', '{category}: {count} blocks': '{category}: {count} blocchi', '{label} selected': '{label} selezionato', 'Selected': 'Selezionato', 'Created {label}. Choose it to add.': 'Creato {label}. Selezionalo per aggiungerlo.', 'Could not create the block.': 'Impossibile creare il blocco.', 'Custom block name': 'Nome del blocco personalizzato', 'Create a custom block': 'Crea un blocco personalizzato', 'Creating…': 'Creazione…', 'Create block': 'Crea blocco',
    'Chromatic': 'Cromatica', '2 notes per string': '2 note per corda', 'Technique': 'Tecnica', 'Alternate picking': 'Pennata alternata', 'Legato': 'Legato', 'Rhythm': 'Ritmo', 'Chord changes': 'Cambi di accordo', 'Barre chords': 'Accordi barré', 'Strumming patterns': 'Pattern ritmici', 'Major scales': 'Scale maggiori', 'Minor scales': 'Scale minori', 'Pentatonic scales': 'Scale pentatoniche', 'Notes on the fretboard': 'Note sulla tastiera', 'Notes': 'Note', 'Intervals': 'Intervalli', 'Chords': 'Accordi', 'Repertoire': 'Repertorio', 'Learn a new song': 'Impara un nuovo brano', 'Evening Practice': 'Pratica serale', 'Harm./Improv.': 'Armonia/Improv.', 'Jam to track': 'Suona su una traccia', 'Songwriting': 'Composizione', 'Learning': 'Apprendimento',
    'Block composition': 'Composizione dei blocchi', 'Same every week': 'Uguale ogni settimana', 'Varies by week': 'Diversa ogni settimana', 'Not configured': 'Non configurato', 'Program blocks': 'Blocchi del programma', 'Week blocks': 'Blocchi della settimana', 'Configure program blocks': 'Configura i blocchi del programma', 'This program has no configured block set. Choose a mode and select blocks.': 'Questo programma non ha blocchi configurati. Scegli una modalità e seleziona i blocchi.', 'Catalog composition is unavailable until the database is updated.': 'La composizione del catalogo non è disponibile finché il database non viene aggiornato.', 'Choose blocks for this varying week.': 'Scegli i blocchi per questa settimana variabile.', 'This program varies by week.': 'I blocchi del programma variano ogni settimana.', 'Select at least one block.': 'Seleziona almeno un blocco.', 'Save composition': 'Salva composizione', 'Saving composition…': 'Salvataggio della composizione…', 'Could not load block composition.': 'Impossibile caricare la composizione dei blocchi.', 'Could not save block composition.': 'Impossibile salvare la composizione dei blocchi.', 'Program mode updated.': 'Modalità del programma aggiornata.', 'Block composition saved.': 'Composizione dei blocchi salvata.', 'Retry catalog': 'Riprova a caricare il catalogo', 'Choose this week’s blocks': 'Scegli i blocchi di questa settimana', 'Configure same-every-week blocks': 'Configura gli stessi blocchi ogni settimana', 'Configure varying weeks': 'Configura settimane diverse', 'Could not load the block catalog.': 'Impossibile caricare il catalogo dei blocchi.', 'Could not create the block catalog item.': 'Impossibile creare la voce del catalogo.',
  })
  Object.assign(pageTranslations.fr, {
    'Technique and Warm-Ups': 'Technique et échauffements', 'Chords and Rhythm': 'Accords et rythme', 'Scales and Fretboard Geography': 'Gammes et repérage sur le manche', 'Ear Training': 'Formation de l’oreille', 'Repertoire and Songwork': 'Répertoire et travail des morceaux', 'Improvisation and Composition': 'Improvisation et composition',
    'Replace block': 'Remplacer le bloc',
    'Initial week blocks': 'Blocs initiaux des semaines', 'No scheduled weeks for this program.': 'Aucune semaine planifiée pour ce programme.',
    'Block categories': 'Catégories de blocs', 'Blocks in category': 'Blocs de la catégorie', 'No blocks in this category.': 'Aucun bloc dans cette catégorie.', 'Loading blocks…': 'Chargement des blocs…', '{category}: {count} blocks': '{category} : {count} blocs', '{label} selected': '{label} sélectionné', 'Selected': 'Sélectionné', 'Created {label}. Choose it to add.': '{label} a été créé. Sélectionnez-le pour l’ajouter.', 'Could not create the block.': 'Impossible de créer le bloc.', 'Custom block name': 'Nom du bloc personnalisé', 'Create a custom block': 'Créer un bloc personnalisé', 'Creating…': 'Création…', 'Create block': 'Créer le bloc',
    'Chromatic': 'Chromatique', '2 notes per string': '2 notes par corde', 'Technique': 'Technique', 'Alternate picking': 'Aller-retour', 'Legato': 'Legato', 'Rhythm': 'Rythme', 'Chord changes': 'Changements d’accords', 'Barre chords': 'Accords barrés', 'Strumming patterns': 'Motifs de rythmiques', 'Major scales': 'Gammes majeures', 'Minor scales': 'Gammes mineures', 'Pentatonic scales': 'Gammes pentatoniques', 'Notes on the fretboard': 'Notes sur le manche', 'Notes': 'Notes', 'Intervals': 'Intervalles', 'Chords': 'Accords', 'Repertoire': 'Répertoire', 'Learn a new song': 'Apprendre un nouveau morceau', 'Evening Practice': 'Pratique du soir', 'Harm./Improv.': 'Harmonie/Improv.', 'Jam to track': 'Jouer sur une piste', 'Songwriting': 'Écriture de chansons', 'Learning': 'Apprentissage',
    'Block composition': 'Composition des blocs', 'Same every week': 'Identique chaque semaine', 'Varies by week': 'Variable selon la semaine', 'Not configured': 'Non configuré', 'Program blocks': 'Blocs du programme', 'Week blocks': 'Blocs de la semaine', 'Configure program blocks': 'Configurer les blocs du programme', 'This program has no configured block set. Choose a mode and select blocks.': 'Ce programme n’a pas de blocs configurés. Choisissez un mode et sélectionnez des blocs.', 'Catalog composition is unavailable until the database is updated.': 'La composition du catalogue est indisponible tant que la base de données n’est pas mise à jour.', 'Choose blocks for this varying week.': 'Choisissez les blocs de cette semaine variable.', 'This program varies by week.': 'Les blocs du programme varient selon la semaine.', 'Select at least one block.': 'Sélectionnez au moins un bloc.', 'Save composition': 'Enregistrer la composition', 'Saving composition…': 'Enregistrement de la composition…', 'Could not load block composition.': 'Impossible de charger la composition des blocs.', 'Could not save block composition.': 'Impossible d’enregistrer la composition des blocs.', 'Program mode updated.': 'Mode du programme mis à jour.', 'Block composition saved.': 'Composition des blocs enregistrée.', 'Retry catalog': 'Réessayer le chargement du catalogue', 'Choose this week’s blocks': 'Choisir les blocs de cette semaine', 'Configure same-every-week blocks': 'Configurer les mêmes blocs chaque semaine', 'Configure varying weeks': 'Configurer des semaines variables', 'Could not load the block catalog.': 'Impossible de charger le catalogue de blocs.', 'Could not create the block catalog item.': 'Impossible de créer l’élément du catalogue.',
  })

  const translations: Record<Language, Record<string, string>> = {
  en: {
    ...pageTranslations.en,
    'Language': 'Language', 'EN': 'EN', 'RU': 'RU', 'IT': 'IT', 'FR': 'FR',
    'Pro100Practice': 'Pro100Practice', 'Sign in to continue.': 'Sign in to continue.', 'Create a practice account.': 'Create a practice account.', 'Reset your password.': 'Reset your password.',
    'Login name or email': 'Login name or email', 'Security question': 'Security question', 'Security answer': 'Security answer', 'Password': 'Password', 'New password': 'New password',
    'Password requirements': 'Password requirements', 'At least 8 characters': 'At least 8 characters', 'At least one uppercase letter': 'At least one uppercase letter', 'At least one lowercase letter': 'At least one lowercase letter', 'At least one number': 'At least one number',
    'Choose a password that meets every requirement.': 'Choose a password that meets every requirement.', 'Loading question…': 'Loading question…', 'Show security question': 'Show security question', 'Working…': 'Working…', 'Create account': 'Create account', 'Reset password': 'Reset password', 'Sign in': 'Sign in', 'Account created. You are now signed in.': 'Account created. You are now signed in.', 'Password reset. You can now sign in.': 'Password reset. You can now sign in.',
    'Home': 'Home', 'Progress': 'Progress', 'Plan': 'Plan', 'Practice': 'Practice', 'Stats': 'Stats', 'Settings': 'Settings', 'Current screen': 'Current screen', 'Open navigation menu': 'Open navigation menu', 'Go back': 'Go back', 'Sign out': 'Sign out', 'Navigation': 'Navigation', 'Week {week}': 'Week {week}',
    'My Progress': 'My Progress', 'Current Week': 'Current Week', 'Practice!': 'Practice!', 'Loading current week…': 'Loading current week…', 'Current week plan': 'Current week plan', 'No current week plan yet': 'No current week plan yet', 'Featured guitar': 'Featured guitar', 'Frankenstrat': 'Frankenstrat', 'Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.': 'Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.', 'Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.': 'Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.',
    'Preferences': 'Preferences', 'Preferences are saved to your account.': 'Preferences are saved to your account.', 'Interface language': 'Interface language', 'Show completed weeks in progress overview': 'Show completed weeks in progress overview', 'Enable habit reminders': 'Enable habit reminders', 'Use compact practice cards': 'Use compact practice cards', 'Show target practice time': 'Show target practice time', 'Keep plan notes collapsed by default': 'Keep plan notes collapsed by default', 'Loading preferences…': 'Loading preferences…',
  },
  ru: {
    ...pageTranslations.ru,
    'Language': 'Язык', 'EN': 'АНГ', 'RU': 'РУС', 'IT': 'ИТА', 'FR': 'ФРА',
    'Pro100Practice': 'Pro100Practice', 'Sign in to continue.': 'Войдите, чтобы продолжить.', 'Create a practice account.': 'Создайте аккаунт для практики.', 'Reset your password.': 'Сбросьте пароль.',
    'Login name or email': 'Имя пользователя или эл. почта', 'Security question': 'Секретный вопрос', 'Security answer': 'Ответ на секретный вопрос', 'Password': 'Пароль', 'New password': 'Новый пароль',
    'Password requirements': 'Требования к паролю', 'At least 8 characters': 'Не менее 8 символов', 'At least one uppercase letter': 'Хотя бы одна заглавная буква', 'At least one lowercase letter': 'Хотя бы одна строчная буква', 'At least one number': 'Хотя бы одна цифра',
    'Choose a password that meets every requirement.': 'Выберите пароль, соответствующий всем требованиям.', 'Loading question…': 'Загрузка вопроса…', 'Show security question': 'Показать секретный вопрос', 'Working…': 'Выполняется…', 'Create account': 'Создать аккаунт', 'Reset password': 'Сбросить пароль', 'Sign in': 'Войти', 'Account created. You are now signed in.': 'Аккаунт создан. Вы вошли в систему.', 'Password reset. You can now sign in.': 'Пароль сброшен. Теперь можно войти.',
    'Home': 'Главная', 'Progress': 'Прогресс', 'Plan': 'План', 'Practice': 'Практика', 'Stats': 'Статистика', 'Settings': 'Настройки', 'Current screen': 'Текущий экран', 'Open navigation menu': 'Открыть меню навигации', 'Go back': 'Назад', 'Sign out': 'Выйти', 'Navigation': 'Навигация', 'Week {week}': 'Неделя {week}',
    'My Progress': 'Мой прогресс', 'Current Week': 'Текущая неделя', 'Practice!': 'Практика!', 'Loading current week…': 'Загрузка текущей недели…', 'Current week plan': 'План текущей недели', 'No current week plan yet': 'Плана текущей недели пока нет', 'Featured guitar': 'Избранная гитара', 'Frankenstrat': 'Frankenstrat', 'Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.': 'Frankenstrat прославилась благодаря Эдди Ван Халену, который популяризировал технику тэппинга двумя руками и превратил знакомую гитару в новый голос рока.', 'Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.': 'Её значение сочетало практичность и бунтарство: самодельный корпус, изменённые звукосниматели и тонкий быстрый гриф дали атаку, сустейн и яркий выразительный звук, сформировавший хард-рок 80-х.',
    'Preferences': 'Параметры', 'Preferences are saved to your account.': 'Параметры сохраняются в вашем аккаунте.', 'Interface language': 'Язык интерфейса', 'Show completed weeks in progress overview': 'Показывать завершённые недели в обзоре прогресса', 'Enable habit reminders': 'Включить напоминания о привычке', 'Use compact practice cards': 'Использовать компактные карточки практики', 'Show target practice time': 'Показывать целевое время практики', 'Keep plan notes collapsed by default': 'Сворачивать заметки плана по умолчанию', 'Loading preferences…': 'Загрузка параметров…',
  },
  it: {
    ...pageTranslations.it,
    'Language': 'Lingua', 'EN': 'EN', 'RU': 'RU', 'IT': 'IT', 'FR': 'FR',
    'Pro100Practice': 'Pro100Practice', 'Sign in to continue.': 'Accedi per continuare.', 'Create a practice account.': 'Crea un account di pratica.', 'Reset your password.': 'Reimposta la password.',
    'Login name or email': 'Nome utente o email', 'Security question': 'Domanda di sicurezza', 'Security answer': 'Risposta di sicurezza', 'Password': 'Password', 'New password': 'Nuova password',
    'Password requirements': 'Requisiti della password', 'At least 8 characters': 'Almeno 8 caratteri', 'At least one uppercase letter': 'Almeno una lettera maiuscola', 'At least one lowercase letter': 'Almeno una lettera minuscola', 'At least one number': 'Almeno un numero',
    'Choose a password that meets every requirement.': 'Scegli una password che soddisfi tutti i requisiti.', 'Loading question…': 'Caricamento della domanda…', 'Show security question': 'Mostra domanda di sicurezza', 'Working…': 'Elaborazione…', 'Create account': 'Crea account', 'Reset password': 'Reimposta password', 'Sign in': 'Accedi', 'Account created. You are now signed in.': 'Account creato. Hai effettuato l’accesso.', 'Password reset. You can now sign in.': 'Password reimpostata. Ora puoi accedere.',
    'Home': 'Home', 'Progress': 'Progressi', 'Plan': 'Piano', 'Practice': 'Pratica', 'Stats': 'Statistiche', 'Settings': 'Impostazioni', 'Current screen': 'Schermata attuale', 'Open navigation menu': 'Apri menu di navigazione', 'Go back': 'Indietro', 'Sign out': 'Esci', 'Navigation': 'Navigazione', 'Week {week}': 'Settimana {week}',
    'My Progress': 'I miei progressi', 'Current Week': 'Settimana attuale', 'Practice!': 'Pratica!', 'Loading current week…': 'Caricamento della settimana attuale…', 'Current week plan': 'Piano della settimana attuale', 'No current week plan yet': 'Nessun piano per la settimana attuale', 'Featured guitar': 'Chitarra in evidenza', 'Frankenstrat': 'Frankenstrat', 'Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.': 'La Frankenstrat è diventata famosa perché Eddie Van Halen l’ha usata per rendere popolare il tapping a due mani, trasformando una chitarra familiare in una nuova voce del rock.', 'Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.': 'La sua importanza univa praticità e ribellione: corpo fatto in casa, pickup modificati e manico sottile e veloce offrivano attacco deciso, sustain e un tono brillante ed espressivo che ha definito l’hard rock degli anni ’80.',
    'Preferences': 'Preferenze', 'Preferences are saved to your account.': 'Le preferenze vengono salvate nel tuo account.', 'Interface language': 'Lingua dell’interfaccia', 'Show completed weeks in progress overview': 'Mostra le settimane completate nel riepilogo dei progressi', 'Enable habit reminders': 'Abilita promemoria delle abitudini', 'Use compact practice cards': 'Usa schede di pratica compatte', 'Show target practice time': 'Mostra il tempo di pratica previsto', 'Keep plan notes collapsed by default': 'Mantieni chiuse le note del piano per impostazione predefinita', 'Loading preferences…': 'Caricamento delle preferenze…',
  },
  fr: {
    ...pageTranslations.fr,
    'Language': 'Langue', 'EN': 'EN', 'RU': 'RU', 'IT': 'IT', 'FR': 'FR',
    'Pro100Practice': 'Pro100Practice', 'Sign in to continue.': 'Connectez-vous pour continuer.', 'Create a practice account.': 'Créer un compte de pratique.', 'Reset your password.': 'Réinitialiser votre mot de passe.',
    'Login name or email': 'Nom d’utilisateur ou e-mail', 'Security question': 'Question de sécurité', 'Security answer': 'Réponse de sécurité', 'Password': 'Mot de passe', 'New password': 'Nouveau mot de passe',
    'Password requirements': 'Exigences du mot de passe', 'At least 8 characters': 'Au moins 8 caractères', 'At least one uppercase letter': 'Au moins une lettre majuscule', 'At least one lowercase letter': 'Au moins une lettre minuscule', 'At least one number': 'Au moins un chiffre',
    'Choose a password that meets every requirement.': 'Choisissez un mot de passe qui respecte toutes les exigences.', 'Loading question…': 'Chargement de la question…', 'Show security question': 'Afficher la question de sécurité', 'Working…': 'Traitement…', 'Create account': 'Créer le compte', 'Reset password': 'Réinitialiser le mot de passe', 'Sign in': 'Se connecter', 'Account created. You are now signed in.': 'Compte créé. Vous êtes maintenant connecté.', 'Password reset. You can now sign in.': 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
    'Home': 'Accueil', 'Progress': 'Progrès', 'Plan': 'Plan', 'Practice': 'Pratique', 'Stats': 'Statistiques', 'Settings': 'Paramètres', 'Current screen': 'Écran actuel', 'Open navigation menu': 'Ouvrir le menu de navigation', 'Go back': 'Retour', 'Sign out': 'Se déconnecter', 'Navigation': 'Navigation', 'Week {week}': 'Semaine {week}',
    'My Progress': 'Mes progrès', 'Current Week': 'Semaine actuelle', 'Practice!': 'Pratique !', 'Loading current week…': 'Chargement de la semaine actuelle…', 'Current week plan': 'Plan de la semaine actuelle', 'No current week plan yet': 'Aucun plan pour la semaine actuelle', 'Featured guitar': 'Guitare à l’honneur', 'Frankenstrat': 'Frankenstrat', 'Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.': 'La Frankenstrat est devenue célèbre parce qu’Eddie Van Halen l’a utilisée pour populariser le tapping à deux mains, transformant une guitare familière en une nouvelle voix du rock.', 'Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.': 'Son importance tient à la fois à sa praticité et à son esprit rebelle : un corps fait maison, des micros modifiés et un manche fin et rapide lui donnaient une attaque franche, du sustain et un son brillant et expressif qui ont marqué le hard rock des années 80.',
    'Preferences': 'Préférences', 'Preferences are saved to your account.': 'Les préférences sont enregistrées dans votre compte.', 'Interface language': 'Langue de l’interface', 'Show completed weeks in progress overview': 'Afficher les semaines terminées dans l’aperçu des progrès', 'Enable habit reminders': 'Activer les rappels d’habitude', 'Use compact practice cards': 'Utiliser des cartes de pratique compactes', 'Show target practice time': 'Afficher le temps de pratique cible', 'Keep plan notes collapsed by default': 'Garder les notes du plan réduites par défaut', 'Loading preferences…': 'Chargement des préférences…',
  },
}

Object.assign(pageTranslations.en, {
  'Song selection is unavailable until the database is updated.': 'Song selection is unavailable until the database is updated.',
  'Loading songs…': 'Loading songs…', 'Loading week repertoire…': 'Loading week repertoire…',
  'Could not create the song.': 'Could not create the song.', 'Songs for this week': 'Songs for this week', 'No songs in your repertoire yet.': 'No songs in your repertoire yet.',
  'Song name': 'Song name', 'Create song': 'Create song', 'Could not save repertoire songs.': 'Could not save repertoire songs.',
  'Could not load this week’s repertoire.': 'Could not load this week’s repertoire.', 'Week repertoire': 'Week repertoire', 'No songs assigned to this week.': 'No songs assigned to this week.',
  'Song materials stay on this device.': 'Song materials stay on this device.', 'Material URL for {song}': 'Material URL for {song}',
  'Legacy repertoire': 'Legacy repertoire', 'This week has songs but no Repertoire practice block. They remain visible here without changing the session.': 'This week has songs but no Repertoire practice block. They remain visible here without changing the session.',
})
Object.assign(pageTranslations.ru, {
  'Song selection is unavailable until the database is updated.': 'Выбор песен недоступен до обновления базы данных.',
  'Loading songs…': 'Загрузка песен…', 'Loading week repertoire…': 'Загрузка репертуара недели…',
  'Could not create the song.': 'Не удалось создать песню.', 'Songs for this week': 'Песни на эту неделю', 'No songs in your repertoire yet.': 'В вашем репертуаре пока нет песен.',
  'Song name': 'Название песни', 'Create song': 'Создать песню', 'Could not save repertoire songs.': 'Не удалось сохранить песни репертуара.',
  'Could not load this week’s repertoire.': 'Не удалось загрузить репертуар этой недели.', 'Week repertoire': 'Репертуар недели', 'No songs assigned to this week.': 'На эту неделю песни не назначены.',
  'Song materials stay on this device.': 'Материалы песни хранятся на этом устройстве.', 'Material URL for {song}': 'Ссылка на материал для песни «{song}»',
  'Legacy repertoire': 'Прежний репертуар', 'This week has songs but no Repertoire practice block. They remain visible here without changing the session.': 'На этой неделе есть песни, но нет блока «Репертуар». Они показаны здесь, не меняя занятие.',
})
Object.assign(pageTranslations.it, {
  'Song selection is unavailable until the database is updated.': 'La selezione dei brani non è disponibile finché il database non viene aggiornato.',
  'Loading songs…': 'Caricamento dei brani…', 'Loading week repertoire…': 'Caricamento del repertorio della settimana…',
  'Could not create the song.': 'Impossibile creare il brano.', 'Songs for this week': 'Brani per questa settimana', 'No songs in your repertoire yet.': 'Non ci sono ancora brani nel tuo repertorio.',
  'Song name': 'Nome del brano', 'Create song': 'Crea brano', 'Could not save repertoire songs.': 'Impossibile salvare i brani del repertorio.',
  'Could not load this week’s repertoire.': 'Impossibile caricare il repertorio di questa settimana.', 'Week repertoire': 'Repertorio della settimana', 'No songs assigned to this week.': 'Nessun brano assegnato a questa settimana.',
  'Song materials stay on this device.': 'I materiali del brano restano su questo dispositivo.', 'Material URL for {song}': 'URL del materiale per {song}',
  'Legacy repertoire': 'Repertorio precedente', 'This week has songs but no Repertoire practice block. They remain visible here without changing the session.': 'Questa settimana contiene brani ma non il blocco Repertorio. Restano visibili qui senza modificare la sessione.',
})
Object.assign(pageTranslations.fr, {
  'Song selection is unavailable until the database is updated.': 'La sélection des morceaux est indisponible tant que la base de données n’est pas à jour.',
  'Loading songs…': 'Chargement des morceaux…', 'Loading week repertoire…': 'Chargement du répertoire de la semaine…',
  'Could not create the song.': 'Impossible de créer le morceau.', 'Songs for this week': 'Morceaux de cette semaine', 'No songs in your repertoire yet.': 'Votre répertoire ne contient pas encore de morceaux.',
  'Song name': 'Nom du morceau', 'Create song': 'Créer un morceau', 'Could not save repertoire songs.': 'Impossible d’enregistrer les morceaux du répertoire.',
  'Could not load this week’s repertoire.': 'Impossible de charger le répertoire de cette semaine.', 'Week repertoire': 'Répertoire de la semaine', 'No songs assigned to this week.': 'Aucun morceau associé à cette semaine.',
  'Song materials stay on this device.': 'Les documents du morceau restent sur cet appareil.', 'Material URL for {song}': 'URL du document pour {song}',
  'Legacy repertoire': 'Ancien répertoire', 'This week has songs but no Repertoire practice block. They remain visible here without changing the session.': 'Cette semaine contient des morceaux mais aucun bloc Répertoire. Ils restent visibles ici sans modifier la séance.',
})

Object.assign(pageTranslations.en, { 'Musical notes': 'Notes' })
Object.assign(pageTranslations.ru, { 'Notes': 'Заметки', 'Musical notes': 'Ноты' })
Object.assign(pageTranslations.it, { 'Musical notes': 'Note' })
Object.assign(pageTranslations.fr, { 'Musical notes': 'Notes' })

Object.assign(pageTranslations.en, {
  'Remove this week?': 'Remove this week?',
  'Later weeks will be renumbered and their dates moved back by this week’s duration.': 'Later weeks will be renumbered and their dates moved back by this week’s duration.',
  'Open the Frankenstrat note to read about the guitar shown here.': 'Open the Frankenstrat note to read about the guitar shown here.',
  'After closing this tour, use Help to replay this screen’s cards anytime.': 'After closing this tour, use Help to replay this screen’s cards anytime.',
  'Choose songs for this week in Repertoire. Save plan stores their selection.': 'Choose songs for this week in Repertoire. Save plan stores their selection.',
  'Open Practice for the selected week. Unsaved edits ask for your decision first.': 'Open Practice for the selected week. Unsaved edits ask for your decision first.',
  'Block details': 'Block details', 'Learning materials': 'Learning materials',
  'Open Details for this block’s timer, optional built-in references and your local materials.': 'Open Details for this block’s timer, optional built-in references and your local materials.',
  'Use this information button for supported files, links and device-local storage limits.': 'Use this information button for supported files, links and device-local storage limits.',
  'materials.builtIn': 'Some blocks offer optional built-in guidance and PDFs when Default exercises is enabled in Settings.',
  'materials.formats': 'Add PDF, image, plain-text (.txt), audio or video files, or save YouTube and other HTTP(S) links.',
  'materials.local': 'Your added files, saved links and playback bookmarks belong to the current account in this browser on this device. They are not uploaded or synced. Older unassigned materials are preserved but temporarily unavailable. Browser data is not encrypted by the app: account isolation does not protect against OS access, DevTools or malicious scripts. Clearing or eviction of browser data, or changing the site address, can make files unavailable.',
  'materials.network': 'Saving a link does not download its content. Remote links, YouTube and built-in PDFs need a connection; automatic downloads and remote offline access are not provided.',
  'materials.browser': 'Audio and video playback depends on browser and codec support. PDFs open inline where supported, with an Open in new tab fallback.',
  'materials.bookmarks': 'Playback bookmarks mark times in audio, video and YouTube, not PDF pages. Guitar Pro files are not supported.',
})
Object.assign(pageTranslations.ru, {
  'Remove this week?': 'Удалить эту неделю?',
  'Later weeks will be renumbered and their dates moved back by this week’s duration.': 'Последующие недели будут перенумерованы, а их даты сдвинуты раньше на длительность этой недели.',
  'Open the Frankenstrat note to read about the guitar shown here.': 'Откройте заметку о Frankenstrat, чтобы узнать об этой гитаре.',
  'After closing this tour, use Help to replay this screen’s cards anytime.': 'Закрыв тур, нажмите «Помощь», чтобы снова посмотреть карточки этого экрана.',
  'Choose songs for this week in Repertoire. Save plan stores their selection.': 'Выберите песни на неделю в «Репертуаре». Кнопка «Сохранить план» сохранит выбор.',
  'Open Practice for the selected week. Unsaved edits ask for your decision first.': 'Откройте практику для выбранной недели. При несохранённых изменениях сначала появится запрос.',
  'Block details': 'Подробности блока', 'Learning materials': 'Учебные материалы',
  'Open Details for this block’s timer, optional built-in references and your local materials.': 'Откройте «Подробнее»: здесь таймер блока, необязательные встроенные материалы и ваши локальные файлы.',
  'Use this information button for supported files, links and device-local storage limits.': 'Эта кнопка расскажет о поддерживаемых файлах, ссылках и ограничениях локального хранения.',
  'materials.builtIn': 'В некоторых блоках есть необязательные встроенные подсказки и PDF. Они видны, если в настройках включены упражнения по умолчанию.',
  'materials.formats': 'Добавляйте PDF, изображения, обычный текст (.txt), аудио и видео или сохраняйте ссылки YouTube и другие HTTP(S)-ссылки.',
  'materials.local': 'Добавленные файлы, ссылки и закладки принадлежат текущему аккаунту в этом браузере на этом устройстве. Они не загружаются на сервер и не синхронизируются. Старые материалы без владельца сохранены, но временно недоступны. Приложение не шифрует данные браузера: разделение аккаунтов не защищает от доступа через ОС, DevTools или вредоносные скрипты. Очистка или автоматическое удаление данных браузера и смена адреса сайта могут сделать файлы недоступными.',
  'materials.network': 'Сохранение ссылки не скачивает её содержимое. Для внешних ссылок, YouTube и встроенных PDF нужно подключение. Автоматического скачивания и офлайн-доступа к удалённым материалам нет.',
  'materials.browser': 'Воспроизведение аудио и видео зависит от браузера и кодеков. Если браузер не показывает PDF внутри страницы, используйте «Открыть в новой вкладке».',
  'materials.bookmarks': 'Закладки отмечают время в аудио, видео и YouTube, а не страницы PDF. Файлы Guitar Pro не поддерживаются.',
})
Object.assign(pageTranslations.it, {
  'Remove this week?': 'Rimuovere questa settimana?',
  'Later weeks will be renumbered and their dates moved back by this week’s duration.': 'Le settimane successive saranno rinumerate e le loro date anticipate della durata di questa settimana.',
  'Open the Frankenstrat note to read about the guitar shown here.': 'Apri la nota sulla Frankenstrat per conoscere la chitarra mostrata qui.',
  'After closing this tour, use Help to replay this screen’s cards anytime.': 'Dopo aver chiuso il tour, usa Aiuto per rivedere le schede di questa schermata.',
  'Choose songs for this week in Repertoire. Save plan stores their selection.': 'Scegli i brani della settimana in Repertorio. Salva piano memorizza la selezione.',
  'Open Practice for the selected week. Unsaved edits ask for your decision first.': 'Apri Pratica per la settimana selezionata. Prima ti verrà chiesto come gestire le modifiche non salvate.',
  'Block details': 'Dettagli del blocco', 'Learning materials': 'Materiali didattici',
  'Open Details for this block’s timer, optional built-in references and your local materials.': 'Apri Dettagli per il timer del blocco, i riferimenti integrati facoltativi e i tuoi materiali locali.',
  'Use this information button for supported files, links and device-local storage limits.': 'Questo pulsante informa sui file e link supportati e sui limiti della memoria locale.',
  'materials.builtIn': 'Alcuni blocchi offrono indicazioni e PDF integrati facoltativi quando gli esercizi predefiniti sono abilitati nelle Impostazioni.',
  'materials.formats': 'Aggiungi PDF, immagini, testo semplice (.txt), file audio o video, oppure salva link YouTube e altri link HTTP(S).',
  'materials.local': 'File, link e segnalibri appartengono all’account corrente in questo browser su questo dispositivo. Non vengono caricati né sincronizzati. I vecchi materiali senza proprietario sono conservati ma temporaneamente non disponibili. L’app non cifra i dati del browser: la separazione degli account non protegge dall’accesso tramite sistema operativo, DevTools o script dannosi. La cancellazione o rimozione automatica dei dati del browser e il cambio di indirizzo del sito possono rendere i file inaccessibili.',
  'materials.network': 'Salvare un link non ne scarica il contenuto. Link remoti, YouTube e PDF integrati richiedono una connessione; non sono previsti download automatici né accesso offline ai contenuti remoti.',
  'materials.browser': 'La riproduzione audio e video dipende dal browser e dai codec. I PDF si aprono nella pagina se supportati, altrimenti usa Apri in una nuova scheda.',
  'materials.bookmarks': 'I segnalibri indicano tempi in audio, video e YouTube, non pagine PDF. I file Guitar Pro non sono supportati.',
})
Object.assign(pageTranslations.fr, {
  'Remove this week?': 'Supprimer cette semaine ?',
  'Later weeks will be renumbered and their dates moved back by this week’s duration.': 'Les semaines suivantes seront renumérotées et leurs dates avancées de la durée de cette semaine.',
  'Open the Frankenstrat note to read about the guitar shown here.': 'Ouvrez la note sur la Frankenstrat pour découvrir la guitare présentée ici.',
  'After closing this tour, use Help to replay this screen’s cards anytime.': 'Après avoir fermé cette visite, utilisez Aide pour revoir les fiches de cet écran.',
  'Choose songs for this week in Repertoire. Save plan stores their selection.': 'Choisissez les morceaux de la semaine dans Répertoire. Enregistrer le plan mémorise la sélection.',
  'Open Practice for the selected week. Unsaved edits ask for your decision first.': 'Ouvrez Pratique pour la semaine sélectionnée. Une confirmation précède tout abandon des modifications.',
  'Block details': 'Détails du bloc', 'Learning materials': 'Supports pédagogiques',
  'Open Details for this block’s timer, optional built-in references and your local materials.': 'Ouvrez Détails pour le minuteur, les références intégrées facultatives et vos documents locaux.',
  'Use this information button for supported files, links and device-local storage limits.': 'Ce bouton présente les fichiers et liens acceptés et les limites du stockage local.',
  'materials.builtIn': 'Certains blocs proposent des conseils et PDF intégrés facultatifs lorsque les exercices par défaut sont activés dans les Paramètres.',
  'materials.formats': 'Ajoutez des PDF, images, textes bruts (.txt), fichiers audio ou vidéo, ou enregistrez des liens YouTube et autres liens HTTP(S).',
  'materials.local': 'Fichiers, liens et signets appartiennent au compte actuel dans ce navigateur sur cet appareil. Ils ne sont ni envoyés ni synchronisés. Les anciens documents sans propriétaire sont conservés mais temporairement indisponibles. L’application ne chiffre pas les données du navigateur : la séparation des comptes ne protège pas contre l’accès par le système, DevTools ou des scripts malveillants. L’effacement ou l’éviction des données du navigateur et un changement d’adresse du site peuvent rendre les fichiers indisponibles.',
  'materials.network': 'Enregistrer un lien ne télécharge pas son contenu. Les liens distants, YouTube et PDF intégrés nécessitent une connexion ; aucun téléchargement automatique ni accès hors ligne aux contenus distants n’est proposé.',
  'materials.browser': 'La lecture audio et vidéo dépend du navigateur et des codecs. Les PDF s’affichent dans la page si possible ; sinon, utilisez Ouvrir dans un nouvel onglet.',
  'materials.bookmarks': 'Les signets repèrent des instants dans les fichiers audio, vidéo et YouTube, pas des pages PDF. Les fichiers Guitar Pro ne sont pas pris en charge.',
})

Object.assign(pageTranslations.en, { 'Nothing was saved. Log practice time or mark a block done first.': 'Nothing was saved. Log practice time or mark a block done first.' })
Object.assign(pageTranslations.ru, { 'Nothing was saved. Log practice time or mark a block done first.': 'Ничего не сохранено. Сначала запишите время практики или отметьте блок выполненным.' })
Object.assign(pageTranslations.it, { 'Nothing was saved. Log practice time or mark a block done first.': 'Non è stato salvato nulla. Registra prima il tempo di pratica o segna un blocco come completato.' })
Object.assign(pageTranslations.fr, { 'Nothing was saved. Log practice time or mark a block done first.': 'Rien n’a été enregistré. Notez d’abord un temps de pratique ou marquez un bloc comme terminé.' })
Object.assign(pageTranslations.en, { 'Bookmark name at {time}': 'Bookmark name at {time}', 'Rename bookmark {name}': 'Rename bookmark {name}', 'Leave the name empty to show the time.': 'Leave the name empty to show the time.' })
Object.assign(pageTranslations.ru, { 'Bookmark name at {time}': 'Название закладки {time}', 'Rename bookmark {name}': 'Переименовать закладку {name}', 'Leave the name empty to show the time.': 'Оставьте название пустым, чтобы показывать время.' })
Object.assign(pageTranslations.it, { 'Bookmark name at {time}': 'Nome del segnalibro a {time}', 'Rename bookmark {name}': 'Rinomina segnalibro {name}', 'Leave the name empty to show the time.': 'Lascia il nome vuoto per mostrare il tempo.' })
Object.assign(pageTranslations.fr, { 'Bookmark name at {time}': 'Nom du signet à {time}', 'Rename bookmark {name}': 'Renommer le signet {name}', 'Leave the name empty to show the time.': 'Laissez le nom vide pour afficher le temps.' })

Object.assign(pageTranslations.en, {
  'stats.chartEmpty': 'No practice time in this period.',
  'stats.chartKeyboardHint': 'Use the left and right arrow keys to read each point.',
  'stats.chartData': 'Show chart values',
  'stats.chartPeriod': 'Period',
  'stats.chartPeriodMinutes': 'Practice time',
  'stats.chartCumulative': 'Cumulative total',
  'stats.categoriesTitle': 'Practice categories',
  'stats.categoriesChart': 'Practice time by category',
  'stats.categoriesError': 'Could not load practice categories.',
  'stats.categoryOther': 'Other',
  'stats.calendarTitle': 'Practice calendar',
  'stats.calendarThisMonth': 'This month',
  'stats.calendarPrevious': 'Previous month',
  'stats.calendarNext': 'Next month',
  'stats.calendarMonth': 'Month',
  'stats.calendarYear': 'Year',
  'stats.calendarLoading': 'Loading practice days…',
  'stats.calendarError': 'Could not load practice days.',
  'stats.calendarNoHistory': 'No practice days recorded yet.',
  'stats.calendarEmptyMonth': 'No practice days this month.',
  'stats.calendarMonthCount': 'Practice days this month: {count}',
  'stats.calendarPracticed': 'Practiced',
  'stats.calendarNotPracticed': 'No practice',
})
Object.assign(pageTranslations.ru, {
  'stats.chartEmpty': 'За этот период практики нет.',
  'stats.chartKeyboardHint': 'Используйте стрелки влево и вправо, чтобы прочитать каждую точку.',
  'stats.chartData': 'Показать значения графика',
  'stats.chartPeriod': 'Период',
  'stats.chartPeriodMinutes': 'Время практики',
  'stats.chartCumulative': 'Накопленный итог',
  'stats.categoriesTitle': 'Категории практики',
  'stats.categoriesChart': 'Время практики по категориям',
  'stats.categoriesError': 'Не удалось загрузить категории практики.',
  'stats.categoryOther': 'Другое',
  'stats.calendarTitle': 'Календарь практики',
  'stats.calendarThisMonth': 'Текущий месяц',
  'stats.calendarPrevious': 'Предыдущий месяц',
  'stats.calendarNext': 'Следующий месяц',
  'stats.calendarMonth': 'Месяц',
  'stats.calendarYear': 'Год',
  'stats.calendarLoading': 'Загрузка дней практики…',
  'stats.calendarError': 'Не удалось загрузить дни практики.',
  'stats.calendarNoHistory': 'Дней практики пока нет.',
  'stats.calendarEmptyMonth': 'В этом месяце практики не было.',
  'stats.calendarMonthCount': 'Дней с практикой в этом месяце: {count}',
  'stats.calendarPracticed': 'Была практика',
  'stats.calendarNotPracticed': 'Без практики',
})
Object.assign(pageTranslations.it, {
  'stats.chartEmpty': 'Nessun tempo di pratica in questo periodo.',
  'stats.chartKeyboardHint': 'Usa le frecce sinistra e destra per leggere ogni punto.',
  'stats.chartData': 'Mostra i valori del grafico',
  'stats.chartPeriod': 'Periodo',
  'stats.chartPeriodMinutes': 'Tempo di pratica',
  'stats.chartCumulative': 'Totale cumulativo',
  'stats.categoriesTitle': 'Categorie di pratica',
  'stats.categoriesChart': 'Tempo di pratica per categoria',
  'stats.categoriesError': 'Impossibile caricare le categorie di pratica.',
  'stats.categoryOther': 'Altro',
  'stats.calendarTitle': 'Calendario della pratica',
  'stats.calendarThisMonth': 'Questo mese',
  'stats.calendarPrevious': 'Mese precedente',
  'stats.calendarNext': 'Mese successivo',
  'stats.calendarMonth': 'Mese',
  'stats.calendarYear': 'Anno',
  'stats.calendarLoading': 'Caricamento dei giorni di pratica…',
  'stats.calendarError': 'Impossibile caricare i giorni di pratica.',
  'stats.calendarNoHistory': 'Nessun giorno di pratica registrato.',
  'stats.calendarEmptyMonth': 'Nessun giorno di pratica in questo mese.',
  'stats.calendarMonthCount': 'Giorni di pratica in questo mese: {count}',
  'stats.calendarPracticed': 'Pratica svolta',
  'stats.calendarNotPracticed': 'Nessuna pratica',
})
Object.assign(pageTranslations.fr, {
  'stats.chartEmpty': 'Aucun temps de pratique sur cette période.',
  'stats.chartKeyboardHint': 'Utilisez les flèches gauche et droite pour lire chaque point.',
  'stats.chartData': 'Afficher les valeurs du graphique',
  'stats.chartPeriod': 'Période',
  'stats.chartPeriodMinutes': 'Temps de pratique',
  'stats.chartCumulative': 'Total cumulé',
  'stats.categoriesTitle': 'Catégories de pratique',
  'stats.categoriesChart': 'Temps de pratique par catégorie',
  'stats.categoriesError': 'Impossible de charger les catégories de pratique.',
  'stats.categoryOther': 'Autre',
  'stats.calendarTitle': 'Calendrier de pratique',
  'stats.calendarThisMonth': 'Ce mois-ci',
  'stats.calendarPrevious': 'Mois précédent',
  'stats.calendarNext': 'Mois suivant',
  'stats.calendarMonth': 'Mois',
  'stats.calendarYear': 'Année',
  'stats.calendarLoading': 'Chargement des jours de pratique…',
  'stats.calendarError': 'Impossible de charger les jours de pratique.',
  'stats.calendarNoHistory': 'Aucun jour de pratique enregistré.',
  'stats.calendarEmptyMonth': 'Aucun jour de pratique ce mois-ci.',
  'stats.calendarMonthCount': 'Jours de pratique ce mois-ci : {count}',
  'stats.calendarPracticed': 'Pratique effectuée',
  'stats.calendarNotPracticed': 'Pas de pratique',
})

Object.assign(pageTranslations.en, {
  'Arpeggios': 'Arpeggios',
  'plan.duplicateWeek': 'Duplicate week',
  'plan.weekDuplicated': 'Week duplicated successfully.',
  'plan.duplicateFailed': 'Could not duplicate the week.',
  'plan.duplicateNotFound': 'This week could not be found. Reload the plan and try again.',
  'plan.duplicateUnscheduled': 'Only scheduled weeks can be duplicated.',
  'plan.duplicateSignedOut': 'Your session has expired. Sign in again to duplicate this week.',
  'plan.duplicateUnavailable': 'Duplicating weeks is unavailable until the database is updated.',
  'plan.removeSongFromWeek': 'Remove from this week',
  'plan.removeSongFromWeekLabel': 'Remove from this week: {song}',
  'plan.removeSongHint': 'Removing a song only unlinks it from this week; it stays in your song library. Changes to this list are saved immediately.',
  'plan.songsSavedToWeek': 'Saved to this week.',
  'plan.songSaveFailed': 'Could not update the songs for this week. Your selection was restored.',
  'plan.songCreatedNotLinked': 'The song was created but could not be added to this week. Select it to try again.',
})
Object.assign(pageTranslations.ru, {
  'Arpeggios': 'Арпеджио',
  'plan.duplicateWeek': 'Дублировать неделю',
  'plan.weekDuplicated': 'Неделя продублирована.',
  'plan.duplicateFailed': 'Не удалось продублировать неделю.',
  'plan.duplicateNotFound': 'Неделя не найдена. Обновите план и попробуйте снова.',
  'plan.duplicateUnscheduled': 'Дублировать можно только запланированные недели.',
  'plan.duplicateSignedOut': 'Сеанс истёк. Войдите снова, чтобы продублировать неделю.',
  'plan.duplicateUnavailable': 'Дублирование недель недоступно до обновления базы данных.',
  'plan.removeSongFromWeek': 'Убрать из этой недели',
  'plan.removeSongFromWeekLabel': 'Убрать из этой недели: {song}',
  'plan.removeSongHint': 'Песня только отвязывается от этой недели и остаётся в вашей библиотеке. Изменения в этом списке сохраняются сразу.',
  'plan.songsSavedToWeek': 'Сохранено для этой недели.',
  'plan.songSaveFailed': 'Не удалось обновить песни этой недели. Прежний выбор восстановлен.',
  'plan.songCreatedNotLinked': 'Песня создана, но не добавлена в эту неделю. Отметьте её, чтобы попробовать снова.',
})
Object.assign(pageTranslations.it, {
  'Arpeggios': 'Arpeggi',
  'plan.duplicateWeek': 'Duplica settimana',
  'plan.weekDuplicated': 'Settimana duplicata.',
  'plan.duplicateFailed': 'Impossibile duplicare la settimana.',
  'plan.duplicateNotFound': 'Settimana non trovata. Ricarica il piano e riprova.',
  'plan.duplicateUnscheduled': 'Si possono duplicare solo le settimane pianificate.',
  'plan.duplicateSignedOut': 'La sessione è scaduta. Accedi di nuovo per duplicare la settimana.',
  'plan.duplicateUnavailable': 'La duplicazione delle settimane non è disponibile finché il database non viene aggiornato.',
  'plan.removeSongFromWeek': 'Rimuovi da questa settimana',
  'plan.removeSongFromWeekLabel': 'Rimuovi da questa settimana: {song}',
  'plan.removeSongHint': 'Il brano viene solo scollegato da questa settimana e resta nella tua libreria. Le modifiche a questo elenco vengono salvate subito.',
  'plan.songsSavedToWeek': 'Salvato per questa settimana.',
  'plan.songSaveFailed': 'Impossibile aggiornare i brani di questa settimana. La selezione precedente è stata ripristinata.',
  'plan.songCreatedNotLinked': 'Il brano è stato creato ma non è stato aggiunto a questa settimana. Selezionalo per riprovare.',
})
Object.assign(pageTranslations.fr, {
  'Arpeggios': 'Arpèges',
  'plan.duplicateWeek': 'Dupliquer la semaine',
  'plan.weekDuplicated': 'Semaine dupliquée.',
  'plan.duplicateFailed': 'Impossible de dupliquer la semaine.',
  'plan.duplicateNotFound': 'Semaine introuvable. Rechargez le plan et réessayez.',
  'plan.duplicateUnscheduled': 'Seules les semaines planifiées peuvent être dupliquées.',
  'plan.duplicateSignedOut': 'Votre session a expiré. Reconnectez-vous pour dupliquer cette semaine.',
  'plan.duplicateUnavailable': 'La duplication des semaines est indisponible tant que la base de données n’est pas mise à jour.',
  'plan.removeSongFromWeek': 'Retirer de cette semaine',
  'plan.removeSongFromWeekLabel': 'Retirer de cette semaine : {song}',
  'plan.removeSongHint': 'Le morceau est seulement retiré de cette semaine et reste dans votre bibliothèque. Les modifications de cette liste sont enregistrées immédiatement.',
  'plan.songsSavedToWeek': 'Enregistré pour cette semaine.',
  'plan.songSaveFailed': 'Impossible de mettre à jour les morceaux de cette semaine. Votre sélection a été restaurée.',
  'plan.songCreatedNotLinked': 'Le morceau a été créé mais n’a pas pu être ajouté à cette semaine. Cochez-le pour réessayer.',
})

Object.assign(pageTranslations.en, {
  'practice.keyMajor': 'Key: {key} major',
  'practice.keyMinor': 'Key: {key} minor',
  'practice.rerollKey': 'Re-roll',
  'practice.rerollKeyLabel': 'Suggest another key for {block}',
  'practice.previousWeek': 'Previous week',
  'practice.nextWeek': 'Next week',
  'practice.previousWeekLabel': 'Previous week: Week {week}',
  'practice.nextWeekLabel': 'Next week: Week {week}',
})
Object.assign(pageTranslations.ru, {
  'practice.keyMajor': 'Тональность: {key} мажор',
  'practice.keyMinor': 'Тональность: {key} минор',
  'practice.rerollKey': 'Другая',
  'practice.rerollKeyLabel': 'Предложить другую тональность для блока «{block}»',
  'practice.previousWeek': 'Предыдущая неделя',
  'practice.nextWeek': 'Следующая неделя',
  'practice.previousWeekLabel': 'Предыдущая неделя: неделя {week}',
  'practice.nextWeekLabel': 'Следующая неделя: неделя {week}',
})
Object.assign(pageTranslations.it, {
  'practice.keyMajor': 'Tonalità: {key} maggiore',
  'practice.keyMinor': 'Tonalità: {key} minore',
  'practice.rerollKey': 'Cambia',
  'practice.rerollKeyLabel': 'Suggerisci un’altra tonalità per {block}',
  'practice.previousWeek': 'Settimana precedente',
  'practice.nextWeek': 'Settimana successiva',
  'practice.previousWeekLabel': 'Settimana precedente: settimana {week}',
  'practice.nextWeekLabel': 'Settimana successiva: settimana {week}',
})
Object.assign(pageTranslations.fr, {
  'practice.keyMajor': 'Tonalité : {key} majeur',
  'practice.keyMinor': 'Tonalité : {key} mineur',
  'practice.rerollKey': 'Changer',
  'practice.rerollKeyLabel': 'Proposer une autre tonalité pour {block}',
  'practice.previousWeek': 'Semaine précédente',
  'practice.nextWeek': 'Semaine suivante',
  'practice.previousWeekLabel': 'Semaine précédente : semaine {week}',
  'practice.nextWeekLabel': 'Semaine suivante : semaine {week}',
})

Object.assign(pageTranslations.en, {
  'materials.saveTimedOut': 'Saving this file took too long and was stopped. Nothing was added. Try again or use a smaller file.',
  'materials.saveCancelled': 'Saving was cancelled. Nothing was added.',
  'materials.cleanupPending': 'The material was removed, but its stored file could not be cleared yet. Cleanup will be retried.',
  'materials.cancelSave': 'Cancel saving',
  'materials.retrySave': 'Retry saving',
  'materials.cleanupPendingNote': 'Some removed files are still taking up storage on this device. Cleanup is retried when you reopen Practice.',
  'metronome.volume': 'Volume',
  'metronome.volumeValue': '{value}%',
})
Object.assign(pageTranslations.ru, {
  'materials.saveTimedOut': 'Сохранение файла заняло слишком много времени и было остановлено. Ничего не добавлено. Повторите попытку или выберите файл меньше.',
  'materials.saveCancelled': 'Сохранение отменено. Ничего не добавлено.',
  'materials.cleanupPending': 'Материал удалён, но его файл пока не удалось стереть из хранилища. Очистка будет повторена.',
  'materials.cancelSave': 'Отменить сохранение',
  'materials.retrySave': 'Повторить сохранение',
  'materials.cleanupPendingNote': 'Некоторые удалённые файлы всё ещё занимают место на этом устройстве. Очистка повторится при следующем открытии практики.',
  'metronome.volume': 'Громкость',
  'metronome.volumeValue': '{value} %',
})
Object.assign(pageTranslations.it, {
  'materials.saveTimedOut': 'Il salvataggio del file ha richiesto troppo tempo ed è stato interrotto. Non è stato aggiunto nulla. Riprova o usa un file più piccolo.',
  'materials.saveCancelled': 'Salvataggio annullato. Non è stato aggiunto nulla.',
  'materials.cleanupPending': 'Il materiale è stato rimosso, ma il file archiviato non è ancora stato cancellato. La pulizia verrà ritentata.',
  'materials.cancelSave': 'Annulla salvataggio',
  'materials.retrySave': 'Riprova a salvare',
  'materials.cleanupPendingNote': 'Alcuni file rimossi occupano ancora spazio su questo dispositivo. La pulizia viene ritentata alla prossima apertura di Pratica.',
  'metronome.volume': 'Volume',
  'metronome.volumeValue': '{value}%',
})
Object.assign(pageTranslations.fr, {
  'materials.saveTimedOut': 'L’enregistrement du fichier a pris trop de temps et a été interrompu. Rien n’a été ajouté. Réessayez ou utilisez un fichier plus petit.',
  'materials.saveCancelled': 'Enregistrement annulé. Rien n’a été ajouté.',
  'materials.cleanupPending': 'Le document a été supprimé, mais son fichier stocké n’a pas encore pu être effacé. Le nettoyage sera réessayé.',
  'materials.cancelSave': 'Annuler l’enregistrement',
  'materials.retrySave': 'Réessayer l’enregistrement',
  'materials.cleanupPendingNote': 'Certains fichiers supprimés occupent encore de l’espace sur cet appareil. Le nettoyage est réessayé à la prochaine ouverture de la pratique.',
  'metronome.volume': 'Volume',
  'metronome.volumeValue': '{value} %',
})

Object.assign(pageTranslations.en, {
  'materials.addLearning': 'Add learning materials',
  'materials.pasteYouTube': 'Paste YouTube link',
  'materials.youTubeLink': 'YouTube link',
  'materials.addYouTube': 'Add video',
  'materials.youtubeRequired': 'Copy a valid YouTube link and try again.',
  'materials.pasteManually': 'Clipboard access is unavailable. Paste your YouTube link below.',
})
Object.assign(pageTranslations.ru, {
  'materials.addLearning': 'Добавить учебные материалы',
  'materials.pasteYouTube': 'Вставить ссылку YouTube',
  'materials.youTubeLink': 'Ссылка YouTube',
  'materials.addYouTube': 'Добавить видео',
  'materials.youtubeRequired': 'Скопируйте корректную ссылку YouTube и повторите попытку.',
  'materials.pasteManually': 'Нет доступа к буферу обмена. Вставьте ссылку YouTube ниже.',
})
Object.assign(pageTranslations.it, {
  'materials.addLearning': 'Aggiungi materiali di studio',
  'materials.pasteYouTube': 'Incolla link YouTube',
  'materials.youTubeLink': 'Link YouTube',
  'materials.addYouTube': 'Aggiungi video',
  'materials.youtubeRequired': 'Copia un link YouTube valido e riprova.',
  'materials.pasteManually': 'Appunti non accessibili. Incolla il link YouTube qui sotto.',
})
Object.assign(pageTranslations.fr, {
  'materials.addLearning': 'Ajouter des supports',
  'materials.pasteYouTube': 'Coller un lien YouTube',
  'materials.youTubeLink': 'Lien YouTube',
  'materials.addYouTube': 'Ajouter la vidéo',
  'materials.youtubeRequired': 'Copiez un lien YouTube valide et réessayez.',
  'materials.pasteManually': 'Presse-papiers inaccessible. Collez votre lien YouTube ci-dessous.',
})

Object.assign(pageTranslations.en, { 'ux.showPassword': 'Show password' })
Object.assign(pageTranslations.ru, { 'ux.showPassword': 'Показать пароль' })
Object.assign(pageTranslations.it, { 'ux.showPassword': 'Mostra password' })
Object.assign(pageTranslations.fr, { 'ux.showPassword': 'Afficher le mot de passe' })

Object.assign(pageTranslations.en, {
  'songTools.materials': 'Song materials', 'songTools.video': 'Video materials', 'songTools.pdf': 'PDF materials', 'songTools.tab': 'Tabs', 'songTools.notes': 'Song notes', 'songTools.notesPresent': 'Song notes (saved notes available)', 'songTools.showAll': 'Show all materials',
  'songTools.saveNotes': 'Save notes', 'songTools.saveBeforeRemove': 'Save or cancel the note draft before removing this song.',
  'songTools.tabRoadmap': 'Tab support is on the roadmap and is being worked on.', 'songTools.notesFor': 'Notes for {song}', 'songTools.notesSaved': 'Song notes saved.', 'songTools.notesError': 'Could not save these notes. Your draft is still here. Try again.', 'songTools.removeFromDay': 'Remove {song} from this day',
  'release.title': 'What’s new in Pro100Practice', 'release.version': 'Version {version}', 'release.changelog': 'Read the full changelog', 'release.dismiss': 'Got it',
  'release.0120.updates': 'PWA updates are checked on launch and resume, and wait while you have unsaved work or an open dialog.',
  'release.0120.monitoring': 'Optional privacy-filtered error reports help diagnose app failures; reporting stays off unless a Sentry project is configured.',
  'release.0120.summary': 'Tap the version on Home to reopen this release summary.',
  'release.0100.calendar': 'Schedule one-off, recurring or multi-date practice reminders, at a chosen time or for the whole day.',
  'release.0110.repertoire': 'Songs assigned in Plan now appear in Repertoire on every day of that week.',
  'release.0110.autosave': 'Done or Pause saves practice time to the selected day. Starting another block pauses the previous timer.',
  'release.0110.metronome': 'The metronome now respects the note value: 8/8 clicks twice as fast as 4/4 at the same BPM.',
  'release.0100.connection': 'Connect Google Calendar in Settings and keep it linked between visits, or import reminder files into Apple/device calendars.',
  'release.0100.notices': 'Update notices are acknowledged only when you close them, with offline confirmations synced later.',
  'release.081.brand': 'Our new name is Pro100Practice.', 'release.081.login': 'The sign-in page now matches Home, with a clearer Show password option.', 'release.081.practice': 'Practice blocks have play/pause icons and fewer generic reference tips.',
  'release.090.songs': 'Open song materials from Songs, filter videos and PDFs, and keep notes with each song.', 'release.090.practice': 'Jump back to the current practice week and open the selected week’s Plan from its description.', 'release.090.stats': 'Stats has a tighter layout, with the category chart before the calendar on mobile.',
})
Object.assign(pageTranslations.ru, {
  'songTools.materials': 'Материалы песни', 'songTools.video': 'Видеоматериалы', 'songTools.pdf': 'Материалы PDF', 'songTools.tab': 'Табулатуры', 'songTools.notes': 'Заметки к песне', 'songTools.notesPresent': 'Заметки к песне (есть сохранённые заметки)', 'songTools.showAll': 'Показать все материалы',
  'songTools.saveNotes': 'Сохранить заметки', 'songTools.saveBeforeRemove': 'Сохраните или отмените черновик заметок перед удалением песни из списка.',
  'songTools.tabRoadmap': 'Поддержка табулатур запланирована и находится в работе.', 'songTools.notesFor': 'Заметки к песне «{song}»', 'songTools.notesSaved': 'Заметки к песне сохранены.', 'songTools.notesError': 'Не удалось сохранить заметки. Черновик остался здесь. Повторите попытку.', 'songTools.removeFromDay': 'Убрать «{song}» из этого дня',
  'release.title': 'Что нового в Pro100Practice', 'release.version': 'Версия {version}', 'release.changelog': 'Полный список изменений', 'release.dismiss': 'Понятно',
  'release.0120.updates': 'Приложение проверяет обновления при запуске и возвращении; установка ждёт, пока у вас есть несохранённая работа или открытый диалог.',
  'release.0120.monitoring': 'Необязательные отчёты об ошибках с очисткой личных данных помогают находить сбои; отправка выключена, пока не настроен проект Sentry.',
  'release.0120.summary': 'Нажмите на версию на главном экране, чтобы снова открыть это описание.',
  'release.0100.calendar': 'Планируйте разовые, повторяющиеся напоминания о практике или выбирайте несколько дат — на определённое время или весь день.',
  'release.0110.repertoire': 'Песни, выбранные в плане, теперь появляются в репертуаре каждого дня этой недели.',
  'release.0110.autosave': 'Отметка «Готово» или пауза сохраняет время практики за выбранный день. Запуск другого блока приостанавливает предыдущий таймер.',
  'release.0110.metronome': 'Метроном учитывает длительность ноты: при одинаковом BPM в размере 8/8 щелчки звучат вдвое чаще, чем в 4/4.',
  'release.0100.connection': 'Подключите Google Календарь в настройках с сохранением подключения между посещениями или импортируйте файл напоминаний в календарь Apple или устройства.',
  'release.0100.notices': 'Уведомления об обновлениях считаются просмотренными только после закрытия; подтверждения без сети синхронизируются позже.',
  'release.081.brand': 'Наше новое название — Pro100Practice.', 'release.081.login': 'Страница входа теперь оформлена как главный экран, а переключатель показа пароля стал понятнее.', 'release.081.practice': 'В блоках практики появились значки запуска и паузы, а общих подсказок стало меньше.',
  'release.090.songs': 'Открывайте материалы из списка песен, выбирайте видео или PDF и сохраняйте заметки к каждой песне.', 'release.090.practice': 'Возвращайтесь к текущей неделе практики и открывайте план выбранной недели через её описание.', 'release.090.stats': 'Статистика стала компактнее: на телефоне диаграмма категорий теперь находится перед календарём.',
})
Object.assign(pageTranslations.it, {
  'songTools.materials': 'Materiali del brano', 'songTools.video': 'Materiali video', 'songTools.pdf': 'Materiali PDF', 'songTools.tab': 'Tablature', 'songTools.notes': 'Note del brano', 'songTools.notesPresent': 'Note del brano (sono presenti note salvate)', 'songTools.showAll': 'Mostra tutti i materiali',
  'songTools.saveNotes': 'Salva note', 'songTools.saveBeforeRemove': 'Salva o annulla la bozza delle note prima di rimuovere questo brano.',
  'songTools.tabRoadmap': 'Il supporto alle tablature è previsto ed è in lavorazione.', 'songTools.notesFor': 'Note per {song}', 'songTools.notesSaved': 'Note del brano salvate.', 'songTools.notesError': 'Impossibile salvare le note. La bozza è ancora qui. Riprova.', 'songTools.removeFromDay': 'Rimuovi {song} da questo giorno',
  'release.title': 'Novità di Pro100Practice', 'release.version': 'Versione {version}', 'release.changelog': 'Leggi tutte le modifiche', 'release.dismiss': 'Ho capito',
  'release.0120.updates': 'Gli aggiornamenti PWA vengono controllati all’avvio e alla ripresa e attendono se hai modifiche non salvate o una finestra di dialogo aperta.',
  'release.0120.monitoring': 'Le segnalazioni facoltative e filtrate per la privacy aiutano a diagnosticare gli errori; l’invio resta disattivato finché non viene configurato un progetto Sentry.',
  'release.0120.summary': 'Tocca la versione nella Home per riaprire questo riepilogo.',
  'release.0100.calendar': 'Programma promemoria di pratica singoli, ricorrenti o per più date, a un orario scelto o per tutto il giorno.',
  'release.0110.repertoire': 'I brani assegnati nel piano ora compaiono nel repertorio di ogni giorno della settimana.',
  'release.0110.autosave': 'Completato o Pausa salva il tempo di pratica nel giorno selezionato. Avviare un altro blocco mette in pausa il timer precedente.',
  'release.0110.metronome': 'Il metronomo rispetta il valore della nota: a parità di BPM, in 8/8 i clic sono due volte più rapidi rispetto a 4/4.',
  'release.0100.connection': 'Collega Google Calendar nelle impostazioni e mantieni il collegamento tra le visite, oppure importa i file dei promemoria nei calendari Apple o del dispositivo.',
  'release.0100.notices': 'Le novità sono confermate solo quando le chiudi; le conferme offline vengono sincronizzate in seguito.',
  'release.081.brand': 'Il nostro nuovo nome è Pro100Practice.', 'release.081.login': 'La pagina di accesso riprende lo stile della Home, con un’opzione Mostra password più chiara.', 'release.081.practice': 'I blocchi di pratica hanno icone di avvio e pausa e meno suggerimenti generici.',
  'release.090.songs': 'Apri i materiali dall’elenco brani, filtra video e PDF e salva note per ogni brano.', 'release.090.practice': 'Torna alla settimana di pratica attuale e apri il piano della settimana selezionata dalla sua descrizione.', 'release.090.stats': 'Statistiche più compatte: sui telefoni il grafico delle categorie precede il calendario.',
})
Object.assign(pageTranslations.fr, {
  'songTools.materials': 'Supports du morceau', 'songTools.video': 'Supports vidéo', 'songTools.pdf': 'Supports PDF', 'songTools.tab': 'Tablatures', 'songTools.notes': 'Notes du morceau', 'songTools.notesPresent': 'Notes du morceau (des notes sont enregistrées)', 'songTools.showAll': 'Afficher tous les supports',
  'songTools.saveNotes': 'Enregistrer les notes', 'songTools.saveBeforeRemove': 'Enregistrez ou annulez le brouillon des notes avant de retirer ce morceau.',
  'songTools.tabRoadmap': 'La prise en charge des tablatures est prévue et en cours de préparation.', 'songTools.notesFor': 'Notes pour {song}', 'songTools.notesSaved': 'Notes du morceau enregistrées.', 'songTools.notesError': 'Impossible d’enregistrer les notes. Votre brouillon est toujours ici. Réessayez.', 'songTools.removeFromDay': 'Retirer {song} de cette journée',
  'release.title': 'Les nouveautés de Pro100Practice', 'release.version': 'Version {version}', 'release.changelog': 'Lire toutes les modifications', 'release.dismiss': 'Compris',
  'release.0120.updates': 'Les mises à jour PWA sont vérifiées au lancement et à la reprise, et attendent si votre travail n’est pas enregistré ou si une fenêtre de dialogue est ouverte.',
  'release.0120.monitoring': 'Les rapports d’erreur facultatifs et filtrés pour protéger la vie privée aident à diagnostiquer les problèmes ; l’envoi reste désactivé tant qu’un projet Sentry n’est pas configuré.',
  'release.0120.summary': 'Touchez la version sur l’accueil pour rouvrir ce résumé.',
  'release.0100.calendar': 'Planifiez des rappels de pratique ponctuels, récurrents ou à plusieurs dates, à une heure choisie ou pour toute la journée.',
  'release.0110.repertoire': 'Les morceaux choisis dans le plan apparaissent désormais dans le répertoire de chaque jour de la semaine.',
  'release.0110.autosave': 'Terminé ou Pause enregistre le temps de pratique pour le jour sélectionné. Démarrer un autre bloc met le minuteur précédent en pause.',
  'release.0110.metronome': 'Le métronome respecte la valeur de la note : au même BPM, les clics en 8/8 sont deux fois plus rapides qu’en 4/4.',
  'release.0100.connection': 'Connectez Google Agenda dans les paramètres et conservez la connexion entre les visites, ou importez les fichiers de rappels dans les calendriers Apple ou de l’appareil.',
  'release.0100.notices': 'Les nouveautés sont confirmées uniquement à leur fermeture ; les confirmations hors ligne sont synchronisées plus tard.',
  'release.081.brand': 'Notre nouveau nom est Pro100Practice.', 'release.081.login': 'La page de connexion reprend le style de l’accueil, avec une option d’affichage du mot de passe plus claire.', 'release.081.practice': 'Les blocs de pratique ont des icônes de lecture et de pause et moins de conseils génériques.',
  'release.090.songs': 'Ouvrez les supports depuis la liste des morceaux, filtrez les vidéos et PDF et gardez des notes pour chaque morceau.', 'release.090.practice': 'Revenez à la semaine de pratique actuelle et ouvrez le plan de la semaine choisie depuis sa description.', 'release.090.stats': 'Les statistiques sont plus compactes : sur téléphone, le graphique des catégories précède le calendrier.',
})

Object.assign(pageTranslations.en, {
  'practice.progressSaved': 'Practice progress saved.',
  'practice.autosaveFailed': 'Could not save practice progress. Your changes are kept; use Save session to retry.',
  'practice.precisionUnavailable': 'Practice saving needs a database update. Your changes are kept; please retry after the update.',
})
Object.assign(pageTranslations.ru, {
  'practice.progressSaved': 'Практика сохранена.',
  'practice.autosaveFailed': 'Не удалось сохранить практику. Изменения сохранены в форме; нажмите «Сохранить сессию», чтобы повторить.',
  'practice.precisionUnavailable': 'Для сохранения практики нужно обновление базы данных. Изменения остались в форме; повторите после обновления.',
})
Object.assign(pageTranslations.it, {
  'practice.progressSaved': 'Progressi di pratica salvati.',
  'practice.autosaveFailed': 'Impossibile salvare i progressi. Le modifiche restano nel modulo; usa Salva sessione per riprovare.',
  'practice.precisionUnavailable': 'Il salvataggio richiede un aggiornamento del database. Le modifiche restano nel modulo; riprova dopo l’aggiornamento.',
})
Object.assign(pageTranslations.fr, {
  'practice.progressSaved': 'Pratique enregistrée.',
  'practice.autosaveFailed': 'Impossible d’enregistrer la pratique. Les modifications restent dans le formulaire ; utilisez Enregistrer la séance pour réessayer.',
  'practice.precisionUnavailable': 'L’enregistrement nécessite une mise à jour de la base de données. Les modifications restent dans le formulaire ; réessayez après la mise à jour.',
})
Object.assign(pageTranslations.en, {
  'pwa.updateReady': 'Update ready',
  'pwa.applying': 'Applying the update…',
  'pwa.checkingTabs': 'Checking that every open tab is safe to update…',
  'pwa.safeAutomatic': 'The update will apply when it is safe for every open tab.',
  'pwa.offline': 'Reconnect to check and apply this update.',
  'pwa.safetyBlocked': 'Finish or save your current work, close dialogs, and try again.',
  'pwa.coordinationUnavailable': 'Safe update coordination is unavailable. Keep using this version and try again.',
  'pwa.tabNotResponding': 'Another open tab did not confirm it is safe. Keep it open and try again.',
  'pwa.workerFailed': 'The update could not be applied. Reconnect if needed, then try again.',
  'pwa.later': 'Later',
  'pwa.updateNow': 'Update now',
})
Object.assign(pageTranslations.ru, {
  'pwa.updateReady': 'Доступно обновление',
  'pwa.applying': 'Установка обновления…',
  'pwa.checkingTabs': 'Проверяем, безопасно ли обновлять все открытые вкладки…',
  'pwa.safeAutomatic': 'Обновление установится, когда это будет безопасно для всех открытых вкладок.',
  'pwa.offline': 'Подключитесь к сети, чтобы проверить и установить обновление.',
  'pwa.safetyBlocked': 'Завершите или сохраните текущую работу, закройте диалоги и повторите попытку.',
  'pwa.coordinationUnavailable': 'Не удалось безопасно согласовать обновление. Продолжайте работу и попробуйте позже.',
  'pwa.tabNotResponding': 'Другая открытая вкладка не подтвердила безопасность обновления. Оставьте её открытой и повторите попытку.',
  'pwa.workerFailed': 'Не удалось установить обновление. При необходимости подключитесь к сети и повторите попытку.',
  'pwa.later': 'Позже',
  'pwa.updateNow': 'Обновить сейчас',
})
Object.assign(pageTranslations.it, {
  'pwa.updateReady': 'Aggiornamento disponibile',
  'pwa.applying': 'Applicazione dell’aggiornamento…',
  'pwa.checkingTabs': 'Verifica che ogni scheda aperta possa essere aggiornata in sicurezza…',
  'pwa.safeAutomatic': 'L’aggiornamento verrà applicato quando sarà sicuro per tutte le schede aperte.',
  'pwa.offline': 'Riconnettiti per controllare e applicare questo aggiornamento.',
  'pwa.safetyBlocked': 'Completa o salva il lavoro in corso, chiudi le finestre di dialogo e riprova.',
  'pwa.coordinationUnavailable': 'Il coordinamento sicuro dell’aggiornamento non è disponibile. Continua a usare questa versione e riprova.',
  'pwa.tabNotResponding': 'Un’altra scheda aperta non ha confermato che l’aggiornamento è sicuro. Lasciala aperta e riprova.',
  'pwa.workerFailed': 'Impossibile applicare l’aggiornamento. Se necessario, riconnettiti e riprova.',
  'pwa.later': 'Più tardi',
  'pwa.updateNow': 'Aggiorna ora',
})
Object.assign(pageTranslations.fr, {
  'pwa.updateReady': 'Mise à jour disponible',
  'pwa.applying': 'Installation de la mise à jour…',
  'pwa.checkingTabs': 'Vérification que chaque onglet ouvert peut être mis à jour en toute sécurité…',
  'pwa.safeAutomatic': 'La mise à jour sera appliquée lorsqu’elle sera sûre pour tous les onglets ouverts.',
  'pwa.offline': 'Reconnectez-vous pour vérifier et appliquer cette mise à jour.',
  'pwa.safetyBlocked': 'Terminez ou enregistrez votre travail, fermez les fenêtres de dialogue et réessayez.',
  'pwa.coordinationUnavailable': 'La coordination sécurisée de la mise à jour est indisponible. Continuez à utiliser cette version et réessayez.',
  'pwa.tabNotResponding': 'Un autre onglet ouvert n’a pas confirmé que la mise à jour était sûre. Laissez-le ouvert et réessayez.',
  'pwa.workerFailed': 'Impossible d’appliquer la mise à jour. Reconnectez-vous si nécessaire, puis réessayez.',
  'pwa.later': 'Plus tard',
  'pwa.updateNow': 'Mettre à jour',
})
Object.assign(translations.en, pageTranslations.en)
Object.assign(translations.ru, pageTranslations.ru)
Object.assign(translations.it, pageTranslations.it)
Object.assign(translations.fr, pageTranslations.fr)

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(defaultLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    let mounted = true
    const loadLanguage = () => {
      let access
      try { access = captureLocalMaterialAccess() } catch { setLanguage(defaultLanguage); return }
      void Promise.resolve(supabase.from('app_settings').select('language').maybeSingle()).then(({ data }) => {
        if (mounted && isLocalMaterialAccessCurrent(access) && isLanguage(data?.language)) setLanguage(data.language)
      }).catch(() => {})
    }
    const unsubscribe = onLocalMaterialInvalidation(loadLanguage)
    loadLanguage()
    return () => { mounted = false; unsubscribe() }
  }, [])

  function t(key: string, values?: TranslationValues) {
    let result = translations[language][key] ?? (language === 'en' ? translations.en[key] ?? key : `[${language}:${key}]`)
    for (const [name, value] of Object.entries(values ?? {})) result = result.replaceAll(`{${name}}`, String(value))
    return result
  }

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
