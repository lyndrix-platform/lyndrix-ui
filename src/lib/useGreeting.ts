import { useTranslation } from 'react-i18next'

export function useGreeting(): { greeting: string } {
  const { t } = useTranslation('ui')
  const hour = new Date().getHours()

  let key: string
  if (hour >= 5 && hour < 12) {
    key = 'dashboard.greeting_morning'
  } else if (hour >= 12 && hour < 18) {
    key = 'dashboard.greeting_day'
  } else if (hour >= 18 && hour < 22) {
    key = 'dashboard.greeting_evening'
  } else {
    key = 'dashboard.greeting_night'
  }

  return { greeting: t(key) }
}
