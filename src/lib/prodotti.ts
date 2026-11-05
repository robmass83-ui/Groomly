import type { Lingua } from '../i18n/lingua'
import { normalizeSearch } from './normalizza'

export const CATEGORIE_PRODOTTO = ['shampoo', 'balsami', 'profumi', 'altro'] as const
export type CategoriaProdotto = (typeof CATEGORIE_PRODOTTO)[number]
export type FiltroProdotti = CategoriaProdotto | 'tutti'

export const UNITA_PRODOTTO = ['l', 'ml'] as const
export type UnitaProdotto = (typeof UNITA_PRODOTTO)[number]

const TESTO_MAX = 120
const DITTE_PROPOSTE = 4

export interface Prodotto {
  id: string
  nome: string
  categoria: CategoriaProdotto
  quantita: number | null
  unita: UnitaProdotto
  ditta: string
  codice: string
  createdAt: Date
  updatedAt: Date
}

export function prodottoValido(prodotto: Prodotto): boolean {
  return prodotto.id.length > 0
    && prodotto.nome.trim().length > 0
    && prodotto.nome.length <= TESTO_MAX
    && prodotto.ditta.length <= TESTO_MAX
    && prodotto.codice.length <= TESTO_MAX
    && CATEGORIE_PRODOTTO.includes(prodotto.categoria)
    && UNITA_PRODOTTO.includes(prodotto.unita)
    && (prodotto.quantita === null || (Number.isFinite(prodotto.quantita) && prodotto.quantita > 0))
    && !Number.isNaN(prodotto.createdAt.getTime())
    && !Number.isNaN(prodotto.updatedAt.getTime())
}

function dataDa(value: unknown): Date {
  return typeof value === 'number' || typeof value === 'string' ? new Date(value) : new Date(NaN)
}

function testoDa(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Vale per il documento del cloud (date in millisecondi) e per la copia locale (date ISO). */
export function prodottoDaDoc(id: string, data: Record<string, unknown>): Prodotto | null {
  const prodotto: Prodotto = {
    id,
    nome: testoDa(data.nome),
    categoria: data.categoria as CategoriaProdotto,
    quantita: typeof data.quantita === 'number' ? data.quantita : null,
    unita: data.unita as UnitaProdotto,
    ditta: testoDa(data.ditta),
    codice: testoDa(data.codice),
    createdAt: dataDa(data.createdAt),
    updatedAt: dataDa(data.updatedAt),
  }
  return prodottoValido(prodotto) ? prodotto : null
}

export function ordinaProdotti(prodotti: Prodotto[]): Prodotto[] {
  return [...prodotti].sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id))
}

/** `null` è il campo lasciato vuoto. */
export function leggiQuantita(testo: string): number | null | 'errore' {
  const pulito = testo.trim().replace(',', '.')
  if (pulito === '') return null
  const numero = Number(pulito)
  return Number.isFinite(numero) && numero > 0 ? numero : 'errore'
}

export function misuraProdotto(prodotto: Prodotto, lingua: Lingua): string {
  if (prodotto.quantita === null) return ''
  return `${new Intl.NumberFormat(lingua).format(prodotto.quantita)} ${prodotto.unita === 'l' ? 'L' : 'ml'}`
}

export function filtraProdotti(prodotti: Prodotto[], testo: string, filtro: FiltroProdotti): Prodotto[] {
  const cercato = normalizeSearch(testo)
  return prodotti.filter((prodotto) => (filtro === 'tutti' || prodotto.categoria === filtro)
    && normalizeSearch(`${prodotto.nome} ${prodotto.ditta} ${prodotto.codice}`).includes(cercato))
}

export function ditteProposte(prodotti: Prodotto[], testo: string): string[] {
  const cercato = normalizeSearch(testo)
  const ditte = new Map<string, string>()
  for (const { ditta } of prodotti) {
    const chiave = normalizeSearch(ditta)
    if (chiave && !ditte.has(chiave)) ditte.set(chiave, ditta.trim())
  }
  if (ditte.has(cercato)) return []
  return [...ditte].filter(([chiave]) => chiave.includes(cercato)).map(([, ditta]) => ditta).sort((a, b) => a.localeCompare(b)).slice(0, DITTE_PROPOSTE)
}
