/**
 * Ripulisce i pixel di un logo perché resti nella sua forma vera:
 * lo sfondo bianco che tocca i bordi diventa trasparente e i margini vuoti si tagliano.
 * Un logo pieno fino ai bordi (foto, riquadro colorato) resta com'è.
 */

export type Riquadro = { x: number; y: number; w: number; h: number }

/** Fin qui dal colore dello sfondo il pixel è sfondo (rumore dei JPEG compreso). */
const SFONDO_PIENO = 40
/** Pixel più trasparenti di così non contano per il taglio. */
const ALFA_VUOTO = 8
/** Sotto questa luminosità lo sfondo non è bianco: un riquadro colorato fa parte del logo. */
const LUCE_BIANCO = 220
const BORDI_TRASPARENTI = 0.5
const BORDI_UNIFORMI = 0.6

function distanza(data: Uint8ClampedArray, i: number, r: number, g: number, b: number): number {
  const dr = (data[i] ?? 0) - r
  const dg = (data[i + 1] ?? 0) - g
  const db = (data[i + 2] ?? 0) - b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function indiciBordo(w: number, h: number): number[] {
  const out: number[] = []
  for (let x = 0; x < w; x++) {
    out.push(x)
    if (h > 1) out.push((h - 1) * w + x)
  }
  for (let y = 1; y < h - 1; y++) {
    out.push(y * w)
    if (w > 1) out.push(y * w + w - 1)
  }
  return out
}

/** Il colore dello sfondo, se i bordi sono quasi tutti bianchi e pieni. */
function sfondoBianco(data: Uint8ClampedArray, bordo: number[]): [number, number, number] | null {
  const pieni = bordo.filter((p) => (data[p * 4 + 3] ?? 0) >= 250)
  if (pieni.length === 0) return null
  // la media dei pixel chiari del bordo: tollera il rumore dei JPEG e i bianchi sporchi
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (const p of pieni) {
    const i = p * 4
    const luce = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3
    if (luce < LUCE_BIANCO) continue
    r += data[i] ?? 0
    g += data[i + 1] ?? 0
    b += data[i + 2] ?? 0
    n++
  }
  if (n === 0) return null
  const colore: [number, number, number] = [r / n, g / n, b / n]
  const vicini = pieni.filter((p) => distanza(data, p * 4, ...colore) <= SFONDO_PIENO).length
  return vicini / bordo.length >= BORDI_UNIFORMI ? colore : null
}

/** Toglie lo sfondo bianco collegato ai bordi; i contorni sfumati diventano semitrasparenti. */
function togliSfondo(data: Uint8ClampedArray, w: number, h: number, bordo: number[], [r, g, b]: [number, number, number]): void {
  const sfondo = new Uint8Array(w * h)
  const coda = new Int32Array(w * h)
  let testa = 0
  let fine = 0
  for (const p of bordo) {
    if (sfondo[p] || distanza(data, p * 4, r, g, b) > SFONDO_PIENO) continue
    sfondo[p] = 1
    coda[fine++] = p
  }
  while (testa < fine) {
    const p = coda[testa++] ?? 0
    const x = p % w
    const y = (p - x) / w
    const vicini = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
    for (const q of vicini) {
      if (q < 0 || sfondo[q] || distanza(data, q * 4, r, g, b) > SFONDO_PIENO) continue
      sfondo[q] = 1
      coda[fine++] = q
    }
  }

  // Contorno: i pixel del logo che toccano lo sfondo sono un misto tra logo e bianco.
  // La copertura si stima sul colore più lontano dal bianco lì attorno, poi si toglie il bianco dal colore.
  const alfa = new Float32Array(w * h).fill(1)
  for (let p = 0; p < w * h; p++) {
    if (sfondo[p]) continue
    const x = p % w
    const y = (p - x) / w
    let tocca = false
    for (let dy = -1; dy <= 1 && !tocca; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < w && yy >= 0 && yy < h && sfondo[yy * w + xx]) {
          tocca = true
          break
        }
      }
    }
    if (!tocca) continue
    let lontano = 0
    for (let dy = -2; dy <= 2; dy++) {
      const yy = y + dy
      if (yy < 0 || yy >= h) continue
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx
        const q = yy * w + xx
        if (xx < 0 || xx >= w || sfondo[q]) continue
        lontano = Math.max(lontano, distanza(data, q * 4, r, g, b))
      }
    }
    if (lontano <= 0) continue
    alfa[p] = Math.min(1, distanza(data, p * 4, r, g, b) / lontano)
  }

  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (sfondo[p]) {
      data[i + 3] = 0
      continue
    }
    const a = alfa[p] ?? 1
    if (a >= 1) continue
    if (a <= 0.02) {
      data[i + 3] = 0
      continue
    }
    data[i] = ((data[i] ?? 0) - r * (1 - a)) / a
    data[i + 1] = ((data[i + 1] ?? 0) - g * (1 - a)) / a
    data[i + 2] = ((data[i + 2] ?? 0) - b * (1 - a)) / a
    data[i + 3] = Math.round((data[i + 3] ?? 255) * a)
  }
}

/** Il riquadro più piccolo che contiene tutti i pixel visibili; null se l'immagine è vuota. */
function riquadroVisibile(data: Uint8ClampedArray, w: number, h: number): Riquadro | null {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((data[(y * w + x) * 4 + 3] ?? 0) <= ALFA_VUOTO) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Lavora sui pixel RGBA (li cambia sul posto) e dice quale parte tenere.
 * Se il logo sparirebbe del tutto, i pixel restano quelli di prima e si tiene l'immagine intera.
 */
export function ritagliaLogo(data: Uint8ClampedArray, w: number, h: number): Riquadro {
  const intero = { x: 0, y: 0, w, h }
  if (w < 1 || h < 1) return intero
  const bordo = indiciBordo(w, h)
  const trasparenti = bordo.filter((p) => (data[p * 4 + 3] ?? 0) <= ALFA_VUOTO).length
  if (trasparenti / bordo.length < BORDI_TRASPARENTI) {
    const bianco = sfondoBianco(data, bordo)
    if (bianco) {
      const copia = data.slice()
      togliSfondo(data, w, h, bordo, bianco)
      const box = riquadroVisibile(data, w, h)
      if (box) return box
      data.set(copia)
      return intero
    }
  }
  return riquadroVisibile(data, w, h) ?? intero
}
