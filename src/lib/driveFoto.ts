export type VoceFoto = {
  codice: string
  cartella: string
  relativo: string
  fileId: string
}

const RADICI = new Set(['cani', 'animali'])

export function codiceCartella(cartella: string): string | null {
  const taglio = cartella.indexOf(' - ')
  if (taglio <= 0) return null
  const codice = cartella.slice(0, taglio)
  return /^C\d+$/.test(codice) ? codice : null
}

export function pianoFoto(file: readonly { id: string; percorso: string }[]): VoceFoto[] {
  const viste = new Set<string>()
  const voci: VoceFoto[] = []
  const ordinati = [...file].sort((a, b) => a.percorso.localeCompare(b.percorso) || a.id.localeCompare(b.id))
  for (const item of ordinati) {
    if (!item.id || viste.has(item.id)) continue
    const voce = voceDi(item.id, item.percorso)
    if (!voce) continue
    viste.add(item.id)
    voci.push(voce)
  }
  return voci
}

function voceDi(fileId: string, percorso: string): VoceFoto | null {
  if (percorso.includes('\\')) return null
  const pezzi = percorso.split('/')
  if (pezzi.length < 3 || pezzi.some((pezzo) => pezzo === '' || pezzo === '.' || pezzo === '..')) return null
  const radice = pezzi[0]
  const cartella = pezzi[1]
  if (!radice || !RADICI.has(radice) || !cartella) return null
  const codice = codiceCartella(cartella)
  if (!codice) return null
  const relativo = pezzi.slice(2).join('/')
  if (!relativo) return null
  return { codice, cartella, relativo, fileId }
}
