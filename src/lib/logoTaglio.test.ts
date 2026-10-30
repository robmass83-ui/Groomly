import { describe, expect, it } from 'vitest'
import { ritagliaLogo } from './logoTaglio'

type Rgba = [number, number, number, number]
type Forma = (x: number, y: number) => boolean

/** Disegna un logo finto: `dentro` dice dove sta il marchio, i bordi sono sfumati come in un'immagine vera. */
function disegna(w: number, h: number, opzioni: {
  dentro: Forma
  colore: (x: number, y: number) => Rgba
  sfondo?: Rgba
  rumore?: number
}): Uint8ClampedArray {
  const sfondo = opzioni.sfondo ?? [255, 255, 255, 255]
  const data = new Uint8ClampedArray(w * h * 4)
  let seme = 7
  const caso = () => {
    seme = (seme * 16807) % 2147483647
    return seme / 2147483647 - 0.5
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 4×4 campioni per pixel: la copertura dà il contorno sfumato
      let copertura = 0
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (opzioni.dentro(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) copertura++
      const c = copertura / 16
      const [r, g, b, a] = opzioni.colore(x, y)
      const fa = (a / 255) * c
      const out = sfondo[3] / 255 * (1 - fa) + fa
      const mix = (v: number, s: number) => out === 0 ? 0 : (v * fa + s * (sfondo[3] / 255) * (1 - fa)) / out
      const n = (opzioni.rumore ?? 0) * caso()
      const i = (y * w + x) * 4
      data[i] = mix(r, sfondo[0]) + n
      data[i + 1] = mix(g, sfondo[1]) + n
      data[i + 2] = mix(b, sfondo[2]) + n
      data[i + 3] = Math.round(out * 255)
    }
  }
  return data
}

const pixel = (data: Uint8ClampedArray, w: number, x: number, y: number): Rgba => {
  const i = (y * w + x) * 4
  return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, data[i + 3] ?? 0]
}

const cerchio = (cx: number, cy: number, r: number): Forma => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r
const rettangolo = (x0: number, y0: number, x1: number, y1: number): Forma => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1
const pieno = (colore: Rgba) => () => colore
const ROSSO: Rgba = [200, 30, 60, 255]
const BLU: Rgba = [30, 60, 160, 255]

function stella(cx: number, cy: number, fuori: number, dentro: number): Forma {
  const punte: [number, number][] = []
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? fuori : dentro
    const t = -Math.PI / 2 + (k * Math.PI) / 5
    punte.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
  }
  return (x, y) => {
    let dentroPoligono = false
    for (let i = 0, j = punte.length - 1; i < punte.length; j = i++) {
      const [xi, yi] = punte[i] as [number, number]
      const [xj, yj] = punte[j] as [number, number]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentroPoligono = !dentroPoligono
    }
    return dentroPoligono
  }
}

describe('ritagliaLogo', () => {
  it('logo tondo su sfondo bianco: angoli trasparenti, taglio sul cerchio', () => {
    const data = disegna(120, 120, { dentro: cerchio(60, 60, 40), colore: pieno(ROSSO) })
    const box = ritagliaLogo(data, 120, 120)
    expect(box).toEqual({ x: 20, y: 20, w: 80, h: 80 })
    // angolo del riquadro tagliato: fuori dal cerchio, quindi trasparente
    expect(pixel(data, 120, 21, 21)[3]).toBe(0)
    // centro pieno e del suo colore
    expect(pixel(data, 120, 60, 60)).toEqual(ROSSO)
    // sul contorno il bianco sparisce: resta rosso, solo meno opaco
    // sulla diagonale il cerchio copre il pixel solo in parte
    const bordo = pixel(data, 120, 31, 31)
    expect(bordo[3]).toBeGreaterThan(0)
    expect(bordo[3]).toBeLessThan(255)
    expect(Math.abs(bordo[0] - ROSSO[0])).toBeLessThan(12)
    expect(Math.abs(bordo[1] - ROSSO[1])).toBeLessThan(12)
  })

  it('logo orizzontale (più largo che alto) in un quadrato bianco: resta orizzontale', () => {
    const data = disegna(200, 200, { dentro: rettangolo(20, 75, 180, 125), colore: pieno(BLU) })
    expect(ritagliaLogo(data, 200, 200)).toEqual({ x: 20, y: 75, w: 160, h: 50 })
  })

  it('logo verticale: resta verticale', () => {
    const data = disegna(200, 200, { dentro: rettangolo(80, 10, 120, 190), colore: pieno(BLU) })
    expect(ritagliaLogo(data, 200, 200)).toEqual({ x: 80, y: 10, w: 40, h: 180 })
  })

  it('stella su bianco: le punte restano, tra le punte è trasparente', () => {
    const data = disegna(160, 160, { dentro: stella(80, 84, 70, 28), colore: pieno(ROSSO) })
    const box = ritagliaLogo(data, 160, 160)
    expect(box.w).toBeGreaterThan(125)
    expect(box.w).toBeLessThan(140)
    // tra due punte in basso
    expect(pixel(data, 160, 80, 150)[3]).toBe(0)
    expect(pixel(data, 160, 80, 84)).toEqual(ROSSO)
  })

  it('quadrato con angoli arrotondati: gli angoli bianchi spariscono', () => {
    const tondeggiante: Forma = (x, y) => {
      const r = 20
      const cx = Math.min(Math.max(x, 30 + r), 130 - r)
      const cy = Math.min(Math.max(y, 30 + r), 130 - r)
      return x >= 30 && x < 130 && y >= 30 && y < 130 && (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    }
    const data = disegna(160, 160, { dentro: tondeggiante, colore: pieno(BLU) })
    expect(ritagliaLogo(data, 160, 160)).toEqual({ x: 30, y: 30, w: 100, h: 100 })
    expect(pixel(data, 160, 31, 31)[3]).toBe(0)
    expect(pixel(data, 160, 80, 80)).toEqual(BLU)
  })

  it('il bianco dentro il logo resta: solo lo sfondo che tocca i bordi sparisce', () => {
    // anello nero con il centro bianco
    const anello: Forma = (x, y) => {
      const d = (x - 60) ** 2 + (y - 60) ** 2
      return d <= 45 ** 2 && d >= 35 ** 2
    }
    const data = disegna(120, 120, { dentro: anello, colore: pieno([20, 20, 20, 255]) })
    ritagliaLogo(data, 120, 120)
    expect(pixel(data, 120, 60, 60)).toEqual([255, 255, 255, 255])
    expect(pixel(data, 120, 2, 2)[3]).toBe(0)
  })

  it('sfondo bianco sporco di un JPEG (rumore e tono caldo): sparisce lo stesso', () => {
    const data = disegna(120, 120, { dentro: cerchio(60, 60, 30), colore: pieno(ROSSO), sfondo: [246, 244, 238, 255], rumore: 14 })
    const box = ritagliaLogo(data, 120, 120)
    expect(box.x).toBeGreaterThanOrEqual(28)
    expect(box.x).toBeLessThanOrEqual(30)
    expect(box.w).toBeGreaterThanOrEqual(60)
    expect(box.w).toBeLessThanOrEqual(64)
    expect(pixel(data, 120, 5, 5)[3]).toBe(0)
  })

  it('PNG già trasparente con margini: si tagliano solo i margini, i pixel restano', () => {
    const data = disegna(100, 100, { dentro: stella(50, 50, 30, 12), colore: pieno(BLU), sfondo: [0, 0, 0, 0] })
    const prima = data.slice()
    const box = ritagliaLogo(data, 100, 100)
    expect(box.w).toBeLessThan(65)
    expect(box.h).toBeLessThan(65)
    expect(data).toEqual(prima)
  })

  it('riquadro colorato pieno fino ai bordi: è il logo, non si tocca', () => {
    const data = disegna(100, 100, {
      dentro: rettangolo(30, 40, 70, 60),
      colore: pieno([255, 255, 255, 255]),
      sfondo: [20, 90, 160, 255],
    })
    const prima = data.slice()
    expect(ritagliaLogo(data, 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
    expect(data).toEqual(prima)
  })

  it('foto o sfumatura fino ai bordi: resta intera', () => {
    const data = disegna(80, 60, { dentro: () => true, colore: (x, y) => [x * 3, y * 4, 120, 255] })
    const prima = data.slice()
    expect(ritagliaLogo(data, 80, 60)).toEqual({ x: 0, y: 0, w: 80, h: 60 })
    expect(data).toEqual(prima)
  })

  it('logo con fondo nero: il nero è parte del logo e resta', () => {
    const data = disegna(80, 80, { dentro: cerchio(40, 40, 20), colore: pieno([240, 200, 40, 255]), sfondo: [0, 0, 0, 255] })
    expect(ritagliaLogo(data, 80, 80)).toEqual({ x: 0, y: 0, w: 80, h: 80 })
    expect(pixel(data, 80, 1, 1)).toEqual([0, 0, 0, 255])
  })

  it('immagine tutta bianca: non sparisce, resta com’è', () => {
    const data = disegna(40, 40, { dentro: () => false, colore: pieno(ROSSO) })
    const prima = data.slice()
    expect(ritagliaLogo(data, 40, 40)).toEqual({ x: 0, y: 0, w: 40, h: 40 })
    expect(data).toEqual(prima)
  })

  it('logo che tocca un bordo: dove tocca resta pieno, il resto del bianco sparisce', () => {
    const data = disegna(100, 100, { dentro: rettangolo(0, 30, 60, 70), colore: pieno(BLU) })
    expect(ritagliaLogo(data, 100, 100)).toEqual({ x: 0, y: 30, w: 60, h: 40 })
    expect(pixel(data, 100, 0, 50)).toEqual(BLU)
  })
})
