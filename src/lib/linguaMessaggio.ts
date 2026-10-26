import { linguaValida, type Lingua } from '../i18n/lingua'
import { normalizzaTelefono } from './whatsapp'

const PREFISSO = 'groomly.linguaMessaggio.'

function soleCifre(telefono: string): string {
  return normalizzaTelefono(telefono) ?? telefono.replace(/\D/g, '')
}

export function leggiLinguaMessaggio(telefono: string, predefinita: Lingua): Lingua {
  const cifre = soleCifre(telefono)
  if (!cifre) return predefinita
  try {
    return linguaValida(localStorage.getItem(PREFISSO + cifre)) ?? predefinita
  } catch {
    return predefinita
  }
}

export function scriviLinguaMessaggio(telefono: string, lingua: Lingua): void {
  const cifre = soleCifre(telefono)
  if (!cifre) return
  localStorage.setItem(PREFISSO + cifre, lingua)
}
