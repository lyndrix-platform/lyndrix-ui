export function useGreeting(): { greeting: string } {
  const hour = new Date().getHours()

  let greeting: string
  if (hour >= 5 && hour < 12) {
    greeting = 'Guten Morgen'
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Guten Tag'
  } else if (hour >= 18 && hour < 22) {
    greeting = 'Guten Abend'
  } else {
    greeting = 'Gute Nacht'
  }

  return { greeting }
}
