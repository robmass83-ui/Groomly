export function bucketCopie(): string | null {
  const value = process.env.COPIE_BUCKET
  if (typeof value !== 'string' || value.trim() === '') return null
  return value.trim()
}

export async function eseguiCopie(): Promise<{ scritto: boolean }> {
  if (!bucketCopie()) return { scritto: false }
  return { scritto: false }
}
