export const EXTRA_NOTE_MAX = 240
export const EXTRA_NOTE_LIMIT = 40

export function cleanExtraNote(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > EXTRA_NOTE_MAX) return null
  return trimmed
}

export function hasExtraNotes(notes: readonly { text: string }[] | undefined): boolean {
  return (notes ?? []).some((item) => item.text.trim().length > 0)
}
