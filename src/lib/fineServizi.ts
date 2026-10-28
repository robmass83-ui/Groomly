export function sumDuration(services: { durationMin: number }[]): number {
  return services.reduce((total, line) => total + line.durationMin, 0)
}

export function roundEnd(start: Date, durationMin: number): Date {
  const exact = new Date(start.getTime() + durationMin * 60_000)
  const minutes = exact.getHours() * 60 + exact.getMinutes() + exact.getSeconds() / 60 + exact.getMilliseconds() / 60_000
  const rounded = Math.round(minutes / 5) * 5
  const result = new Date(exact.getFullYear(), exact.getMonth(), exact.getDate(), 0, 0, 0, 0)
  result.setMinutes(rounded)
  return result
}

export function appointmentEnd(start: Date, services: { durationMin: number }[]): Date {
  return roundEnd(start, sumDuration(services))
}
