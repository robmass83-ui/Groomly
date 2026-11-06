import type { Lingua } from '../i18n/lingua'
import type { DogSize } from '../types/models'
import { NOMI_VECCHI } from './catalogoProdotti'
import { normalizeSearch } from './normalizza'

/** `varie` è la riserva dei prodotti non riconosciuti: non si propone, si vede solo se contiene qualcosa. */
export const CATEGORIE_PRODOTTO = ['lavaggio', 'finitura', 'cura', 'macchinette', 'pulizia', 'tocchi', 'varie'] as const
export type CategoriaProdotto = (typeof CATEGORIE_PRODOTTO)[number]
export const CATEGORIE_SCELTA = CATEGORIE_PRODOTTO.filter((categoria) => categoria !== 'varie')
export type FiltroProdotti = CategoriaProdotto | 'tutti' | 'daOrdinare'

export const ETICHETTA_CATEGORIA = {
  lavaggio: 'magCatLavaggio',
  finitura: 'magCatFinitura',
  cura: 'magCatCuraEstesa',
  macchinette: 'magCatMacchinette',
  pulizia: 'magCatPulizia',
  tocchi: 'magCatTocchi',
  varie: 'magCatAltro',
} as const satisfies Record<CategoriaProdotto, string>

const CATEGORIE_VECCHIE = new Map<unknown, CategoriaProdotto>([['shampoo', 'lavaggio'], ['balsami', 'lavaggio'], ['profumi', 'finitura'], ['altro', 'pulizia']])
const CATEGORIA_DAL_NOME = new Map(Object.entries(NOMI_VECCHI).flatMap(([categoria, nomi]) => nomi.map((nome) => [normalizeSearch(nome), categoria as CategoriaProdotto] as const)))

/** Chi ha `uso` è già salvato nel formato nuovo: il nome non deve più spostarlo. */
function categoriaDaDoc(data: Record<string, unknown>): CategoriaProdotto {
  const salvata = data.categoria
  const nota = CATEGORIE_PRODOTTO.find((categoria) => categoria === salvata) ?? CATEGORIE_VECCHIE.get(salvata) ?? 'varie'
  if ('uso' in data) return nota
  const dalNome = CATEGORIA_DAL_NOME.get(normalizeSearch(testoDa(data.nome)))
  if (salvata === 'altro' && dalNome) return dalNome
  return salvata === 'cura' && dalNome === 'pulizia' ? dalNome : nota
}

export const USI_PRODOTTO = ['salone', 'vendita'] as const
export type UsoProdotto = (typeof USI_PRODOTTO)[number]

export const UNITA_PRODOTTO = ['l', 'ml'] as const
export type UnitaProdotto = (typeof UNITA_PRODOTTO)[number]

const TESTO_MAX = 120
const PEZZI_MAX = 9999
const MOVIMENTI_MAX = 30
const TACCHE = 10

export const FORMATI_PROPOSTI: readonly { quantita: number; unita: UnitaProdotto }[] = [
  { quantita: 250, unita: 'ml' }, { quantita: 500, unita: 'ml' },
  ...[1, 2, 3, 4, 5, 6, 7, 10].map((quantita) => ({ quantita, unita: 'l' as const })),
]

export type StatoProdotto = 'ok' | 'ordina' | 'finito'

/** Ml di concentrato per un cane di quella taglia. */
export type ConsumoPerTaglia = Record<DogSize, number>

export interface Movimento {
  at: number
  delta: number
  dopo: number
}

export interface Prodotto {
  id: string
  nome: string
  categoria: CategoriaProdotto
  pezzi: number
  /** Contenuto di ogni pezzo: `null` per i prodotti senza formato. */
  quantita: number | null
  unita: UnitaProdotto
  ditta: string
  telefono: string
  email: string
  codice: string
  soglia: number
  inArrivo: number
  ordinatoIl: number | null
  movimenti: Movimento[]
  uso: UsoProdotto
  /** 10 vuol dire 1:10. `null` è pronto all'uso. */
  diluizione: number | null
  apertoIl: number | null
  mesiDopoApertura: number | null
  /** Euro per pezzo. */
  costo: number | null
  prezzoVendita: number | null
  mlPerCane: ConsumoPerTaglia | null
  /** Vale per tutta la ditta, come telefono ed email. */
  giorniConsegna: number | null
  /** L'ultima volta che si è chiesto se aggiornare il consumo. */
  confrontoIl: number | null
  createdAt: Date
  updatedAt: Date
}

export const DETTAGLI_VUOTI = {
  uso: 'salone',
  diluizione: null,
  apertoIl: null,
  mesiDopoApertura: null,
  costo: null,
  prezzoVendita: null,
  mlPerCane: null,
  giorniConsegna: null,
  confrontoIl: null,
} as const satisfies Partial<Prodotto>

function interoValido(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= PEZZI_MAX
}

export function prodottoValido(prodotto: Prodotto): boolean {
  return prodotto.id.length > 0
    && prodotto.nome.trim().length > 0
    && prodotto.nome.length <= TESTO_MAX
    && prodotto.ditta.length <= TESTO_MAX
    && prodotto.codice.length <= TESTO_MAX
    && prodotto.telefono.length <= TESTO_MAX
    && prodotto.email.length <= TESTO_MAX
    && interoValido(prodotto.pezzi)
    && interoValido(prodotto.soglia)
    && interoValido(prodotto.inArrivo)
    && CATEGORIE_PRODOTTO.includes(prodotto.categoria)
    && UNITA_PRODOTTO.includes(prodotto.unita)
    && USI_PRODOTTO.includes(prodotto.uso)
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

function interoDa(value: unknown, riserva: number): number {
  return typeof value === 'number' && interoValido(value) ? value : riserva
}

/** Un valore storto vale come campo vuoto: i campi facoltativi non fanno sparire il prodotto. */
function numeroDa(value: unknown, minimo = 0): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimo ? value : null
}

function interoFacoltativoDa(value: unknown, minimo: number): number | null {
  return typeof value === 'number' && interoValido(value) && value >= minimo ? value : null
}

function consumoDa(value: unknown): ConsumoPerTaglia | null {
  const dati = value as Partial<ConsumoPerTaglia> | null | undefined
  const piccola = numeroDa(dati?.piccola, 0)
  const media = numeroDa(dati?.media, 0)
  const grande = numeroDa(dati?.grande, 0)
  return piccola === null || media === null || grande === null ? null : { piccola, media, grande }
}

function movimentiDa(value: unknown): Movimento[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item: Partial<Movimento> | null) => (
    typeof item?.at === 'number' && typeof item.delta === 'number' && typeof item.dopo === 'number'
      ? [{ at: item.at, delta: item.delta, dopo: item.dopo }]
      : []
  )).slice(0, MOVIMENTI_MAX)
}

/** Vale per il documento del cloud (date in millisecondi) e per la copia locale (date ISO). */
export function prodottoDaDoc(id: string, data: Record<string, unknown>): Prodotto | null {
  const prodotto: Prodotto = {
    id,
    nome: testoDa(data.nome),
    categoria: categoriaDaDoc(data),
    // I prodotti salvati prima dei pezzi contano come uno, senza avviso.
    pezzi: interoDa(data.pezzi, 1),
    quantita: typeof data.quantita === 'number' ? data.quantita : null,
    unita: UNITA_PRODOTTO.find((unita) => unita === data.unita) ?? 'l',
    ditta: testoDa(data.ditta),
    telefono: testoDa(data.telefono),
    email: testoDa(data.email),
    codice: testoDa(data.codice),
    soglia: interoDa(data.soglia, 0),
    inArrivo: interoDa(data.inArrivo, 0),
    ordinatoIl: typeof data.ordinatoIl === 'number' ? data.ordinatoIl : null,
    movimenti: movimentiDa(data.movimenti),
    uso: data.uso === 'vendita' ? 'vendita' : 'salone',
    diluizione: interoFacoltativoDa(data.diluizione, 1),
    apertoIl: numeroDa(data.apertoIl),
    mesiDopoApertura: interoFacoltativoDa(data.mesiDopoApertura, 1),
    costo: numeroDa(data.costo),
    prezzoVendita: numeroDa(data.prezzoVendita),
    mlPerCane: consumoDa(data.mlPerCane),
    giorniConsegna: interoFacoltativoDa(data.giorniConsegna, 0),
    confrontoIl: numeroDa(data.confrontoIl),
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

export function misura(quantita: number, unita: UnitaProdotto, lingua: Lingua): string {
  return `${new Intl.NumberFormat(lingua).format(quantita)} ${unita === 'l' ? 'L' : 'ml'}`
}

export function misuraProdotto(prodotto: Prodotto, lingua: Lingua): string {
  return prodotto.quantita === null ? '' : misura(prodotto.quantita, prodotto.unita, lingua)
}

/** Tutto il contenuto a magazzino: oltre il litro i ml diventano litri. */
export function totaleProdotto(prodotto: Prodotto, lingua: Lingua): string {
  if (prodotto.quantita === null || prodotto.pezzi === 0) return ''
  const totale = prodotto.quantita * prodotto.pezzi
  return prodotto.unita === 'ml' && totale >= 1000 ? misura(totale / 1000, 'l', lingua) : misura(totale, prodotto.unita, lingua)
}

export function statoProdotto(prodotto: Prodotto): StatoProdotto {
  if (prodotto.pezzi === 0) return 'finito'
  return prodotto.pezzi <= prodotto.soglia ? 'ordina' : 'ok'
}

/** Tacche accese e posizione del minimo: oltre le dieci unità la barra si comprime. */
export function tacche(pezzi: number, soglia: number): { accese: number; minimo: number | null } {
  const scala = Math.max(TACCHE, pezzi, soglia)
  return {
    accese: Math.ceil((pezzi * TACCHE) / scala),
    minimo: soglia > 0 ? Math.ceil((soglia * TACCHE) / scala) - 1 : null,
  }
}

/** 1:N sono una parte di prodotto e N d'acqua. */
export function dosaggio(diluizione: number): { prodotto: number; acqua: number } {
  const prodotto = Math.round(1000 / (diluizione + 1))
  return { prodotto, acqua: 1000 - prodotto }
}

/** I pezzi non scendono sotto zero: se non cambia nulla torna lo stesso prodotto. */
export function muoviProdotto(prodotto: Prodotto, delta: number, adesso: Date): Prodotto {
  const dopo = Math.min(PEZZI_MAX, Math.max(0, prodotto.pezzi + delta))
  if (dopo === prodotto.pezzi) return prodotto
  const movimento = { at: adesso.getTime(), delta: dopo - prodotto.pezzi, dopo }
  return {
    ...prodotto,
    pezzi: dopo,
    // Il pezzo aperto è finito: la data vale per il prossimo.
    apertoIl: delta < 0 ? null : prodotto.apertoIl,
    movimenti: [movimento, ...prodotto.movimenti].slice(0, MOVIMENTI_MAX),
    updatedAt: adesso,
  }
}

export function arrivatoProdotto(prodotto: Prodotto, adesso: Date): Prodotto {
  return { ...muoviProdotto(prodotto, prodotto.inArrivo, adesso), inArrivo: 0, ordinatoIl: null, updatedAt: adesso }
}

export function daOrdinare(prodotti: Prodotto[]): Prodotto[] {
  return prodotti.filter((prodotto) => statoProdotto(prodotto) !== 'ok' && prodotto.inArrivo === 0)
}

/** Riporta il prodotto al doppio del minimo. */
export function quantitaProposta(prodotto: Prodotto): number {
  return Math.max(1, Math.max(prodotto.soglia, 1) * 2 - prodotto.pezzi)
}

export interface Fornitore {
  nome: string
  telefono: string
  email: string
  giorniConsegna: number | null
}

/** I contatti vivono sui prodotti: vince il primo prodotto che li ha. */
export function fornitori(prodotti: Prodotto[]): Fornitore[] {
  const trovati = new Map<string, Fornitore>()
  for (const { ditta, telefono, email, giorniConsegna } of prodotti) {
    const chiave = normalizeSearch(ditta)
    if (!chiave) continue
    const noto = trovati.get(chiave)
    trovati.set(chiave, { nome: noto?.nome ?? ditta.trim(), telefono: noto?.telefono || telefono, email: noto?.email || email, giorniConsegna: noto?.giorniConsegna ?? giorniConsegna })
  }
  return [...trovati.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}

export function filtraProdotti(prodotti: Prodotto[], testo: string, filtro: FiltroProdotti): Prodotto[] {
  const cercato = normalizeSearch(testo)
  return prodotti.filter((prodotto) => (filtro === 'tutti' || prodotto.categoria === filtro || (filtro === 'daOrdinare' && statoProdotto(prodotto) !== 'ok'))
    && normalizeSearch(`${prodotto.nome} ${prodotto.ditta} ${prodotto.codice}`).includes(cercato))
}
