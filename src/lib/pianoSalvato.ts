import { haAccesso, statoPiano, type FeatureKey, type ProMain } from './piano'

function chiavePiano(uid: string): string {
  return `groomly.piano.${uid}`
}

export function salvaPiano(uid: string, doc: ProMain | null): void {
  try {
    if (doc) localStorage.setItem(chiavePiano(uid), JSON.stringify(doc))
    else localStorage.removeItem(chiavePiano(uid))
  } catch {
    // Il telefono può rifiutare la scrittura: il backup notturno resta fermo finché non si salva.
  }
}

function leggiPiano(uid: string): ProMain | undefined {
  try {
    const raw = localStorage.getItem(chiavePiano(uid))
    if (!raw) return undefined
    const doc: unknown = JSON.parse(raw)
    return doc && typeof doc === 'object' ? doc as ProMain : undefined
  } catch {
    return undefined
  }
}

/** Nel backup notturno Firestore non c'è: decide il piano salvato sul telefono, con la tolleranza offline. */
export function pianoPermette(uid: string, feature: FeatureKey, adesso: Date): boolean {
  const doc = leggiPiano(uid)
  if (!doc) return false
  return haAccesso(statoPiano(doc, adesso, { offline: true }), feature)
}
