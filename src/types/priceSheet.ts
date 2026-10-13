import type { DogSize } from './models'
import type { PriceIconKey } from '../assets/icons/icons'

export type PriceKind = 'da' | 'fisso' | 'valutazione'

export interface PriceItem {
  id: string
  nome: string
  iconKey: PriceIconKey
  tipo: PriceKind
  prezzo?: number
}

export interface Breed {
  id: string
  taglia: DogSize
  nome: string
  voci: PriceItem[]
}

export interface ExtraItem extends PriceItem {
  sotto: Omit<PriceItem, 'iconKey'>[]
}

export type SheetSectionId =
  | 'piccola'
  | 'media'
  | 'grande'
  | 'bagnoTosatura'
  | 'extra'
  | 'info'
  | 'avviso'
  | 'compresi'
  | 'saluto'

export interface PriceSheet {
  version: 1
  intestazione: {
    logo?: string
    titolo: string
    sottotitolo: string
    nome: string
    descrizione: string
    indirizzo: string
    telefono: string
    colore: string
  }
  razze: Breed[]
  noteTaglia: Record<DogSize, string>
  bagnoTosatura: { titolo: string; sottotitolo: string; voci: Omit<PriceItem, 'iconKey'>[] }
  extra: { titolo: string; voci: ExtraItem[] }
  compresi: { titolo: string; voci: { id: string; iconKey: PriceIconKey; testo: string }[] }
  info: { titolo: string; intro: string; punti: string[]; chiusura: string }
  avviso: { titolo: string; intro: string; punti: string[] }
  saluto: string
  sezioni: { id: SheetSectionId; visibile: boolean }[]
  opzioni: { scriviAPartireDa: boolean; formato: 'A4' | 'A3'; tipoFile: 'pdf' | 'jpeg' }
  updatedAt: string
}
