const PAROLE = [
  'nessun',
  'nessuna',
  'proprietario',
  'proprietaria',
  'torna',
  'salva',
  'annulla',
  'partita',
  'iva',
  'cani',
  'appuntamento',
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
  'domenica',
]

const UGUALI = ['groomly', 'privacy', 'dpa', 'whatsapp', 'pos']

function pezzi(testo: string): string[] {
  return testo.toLowerCase().split(/[^\p{L}]+/u).filter((voce) => voce.length > 0)
}

export function testoHaItaliano(testo: string, ammessi: readonly string[] = []): string | null {
  const via = new Set([...UGUALI, ...ammessi.flatMap((voce) => pezzi(voce))])
  for (const parola of pezzi(testo)) {
    if (via.has(parola)) continue
    if (PAROLE.includes(parola)) return parola
  }
  return null
}
