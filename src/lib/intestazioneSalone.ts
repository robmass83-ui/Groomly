import type { PriceSheet } from '../types/priceSheet'

type Identita = { salonName: string; name: string; address: string; phone: string }

function primo(valori: string[]): string {
  return valori.map((voce) => voce.trim()).find((voce) => voce.length > 0) ?? ''
}

export function conIntestazioneSalone<T extends { intestazione: PriceSheet['intestazione'] }>(sheet: T, business: Identita): T {
  const nome = primo([business.salonName, business.name])
  const indirizzo = business.address.trim()
  const telefono = business.phone.trim()
  return {
    ...sheet,
    intestazione: {
      ...sheet.intestazione,
      titolo: nome || sheet.intestazione.titolo,
      nome: nome || sheet.intestazione.nome,
      indirizzo: indirizzo || sheet.intestazione.indirizzo,
      telefono: telefono || sheet.intestazione.telefono,
    },
  }
}
