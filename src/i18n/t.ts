import { en } from './en'
import { es } from './es'
import { it } from './it'
import type { Lingua } from './lingua'

export type Chiave = keyof typeof it

const cataloghi = { it, en, es } as const

export function t(lingua: Lingua, chiave: Chiave, valori: Record<string, string | number> = {}): string {
  return cataloghi[lingua][chiave].replace(/\{\{(\w+)\}\}/g, (_tutto, nome: string) => {
    const valore = valori[nome]
    return valore === undefined ? '' : String(valore)
  })
}
