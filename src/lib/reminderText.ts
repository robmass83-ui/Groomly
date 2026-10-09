export function reminderText(rows: { dog: { name: string } }[]): string | null {
  if (rows.length === 0) return null
  const label = rows.length === 1 ? '1 mensile da programmare' : `${rows.length} mensili da programmare`
  const names = rows.slice(0, 3).map((row) => row.dog.name).join(', ')
  return `${label}: ${names}`
}
