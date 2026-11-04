import { renderTemplate } from './whatsapp'
import { frase } from '../i18n/frase'

const SEI_MESI_MS = 183 * 24 * 60 * 60 * 1000

export function dateNonVenuti(
  appuntamenti: readonly { dogId: string; status: string; start: Date }[],
  dogId: string,
): Date[] {
  return appuntamenti.filter((voce) => voce.dogId === dogId && voce.status === 'non_venuto').map((voce) => voce.start)
}

export function nonVenutiRecenti(nonVenuti: readonly Date[], adesso: Date): number {
  return nonVenuti.filter((data) => adesso.getTime() - data.getTime() <= SEI_MESI_MS && adesso.getTime() >= data.getTime()).length
}

export function etichettaAffidabilita(nonVenuti: readonly Date[], adesso: Date): string | null {
  return nonVenutiRecenti(nonVenuti, adesso) >= 3 ? frase('strumSpesso') : null
}

export function messaggioWhatsapp(modello: string, valori: Record<string, string>, telefono: string): {
  url: string
  canale: 'wa_manuale'
  stato: 'aperto'
  testo: string
} {
  const testo = renderTemplate(modello, valori)
  const cifre = telefono.replace(/\D/g, '')
  return { url: `https://wa.me/${cifre}?text=${encodeURIComponent(testo)}`, canale: 'wa_manuale', stato: 'aperto', testo }
}

export function inRitardo(intervalloGiorni: number, giorniDaUltima: number, futuri: boolean): boolean {
  if (futuri) return false
  return giorniDaUltima > intervalloGiorni * 1.5
}

export function compleanniDelMese(cani: readonly { nome: string; nascita?: string }[], mese: number): string[] {
  return cani.filter((cane) => {
    if (!cane.nascita) return false
    const data = new Date(cane.nascita)
    return !Number.isNaN(data.getTime()) && data.getMonth() === mese
  }).map((cane) => cane.nome)
}

export function codaPromozione(servizi: readonly string[], percentuale: number): { invioAutomatico: false; testi: string[] } {
  return {
    invioAutomatico: false,
    testi: servizi.map((servizio) => frase('strumPromo', { servizio, percentuale })),
  }
}
