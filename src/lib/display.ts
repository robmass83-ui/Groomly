export function formatCompactDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  if (whole < 60) return `${whole}m`
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h${String(rest).padStart(2, '0')}`
}

export function ageText(birthYear: number | undefined, categoryLabel: string, now: Date): string {
  if (birthYear == null) return categoryLabel
  const years = now.getFullYear() - birthYear
  return years === 1 ? '1 anno' : `${years} anni`
}

export function shortOwner(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== '')
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0].charAt(0).toLocaleUpperCase('it-IT')}. ${parts[parts.length - 1]}`
}

export function splitCritical(note: string): { title: string; rest: string } {
  const index = note.indexOf('. ')
  if (index === -1) return { title: note, rest: '' }
  return { title: note.slice(0, index), rest: note.slice(index + 2) }
}
