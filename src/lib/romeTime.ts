const ROME = 'Europe/Rome'

function parts(date: Date, time: boolean): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(time ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' as const, timeZoneName: 'longOffset' as const } : {}),
  }).formatToParts(date)
}

function pick(list: Intl.DateTimeFormatPart[], type: string): string {
  return list.find((part) => part.type === type)?.value ?? ''
}

export function romeDay(date: Date): string {
  const list = parts(date, false)
  return `${pick(list, 'year')}-${pick(list, 'month')}-${pick(list, 'day')}`
}

export function romeIso(date: Date): string {
  const list = parts(date, true)
  let hour = pick(list, 'hour')
  if (hour === '24') hour = '00'
  const offset = pick(list, 'timeZoneName').replace('GMT', '') || '+00:00'
  return `${pick(list, 'year')}-${pick(list, 'month')}-${pick(list, 'day')}T${hour}:${pick(list, 'minute')}:${pick(list, 'second')}${offset}`
}
