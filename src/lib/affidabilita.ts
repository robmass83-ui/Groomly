import { renderTemplate } from './whatsapp'

const SEI_MESI_MS = 183 * 24 * 60 * 60 * 1000

export function etichettaAffidabilita(nonVenuti: readonly Date[], adesso: Date): string | null {
  const recenti = nonVenuti.filter((data) => adesso.getTime() - data.getTime() <= SEI_MESI_MS && adesso.getTime() >= data.getTime())
  if (recenti.length === 0) return null
  if (recenti.length >= 3) return 'Spesso non viene'
  return null
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

export function notaVocale(microfono: boolean): { ok: true; kind: 'audio' } | { ok: false; message: 'Il microfono non è disponibile' } {
  if (!microfono) return { ok: false, message: 'Il microfono non è disponibile' }
  return { ok: true, kind: 'audio' }
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
    testi: servizi.map((servizio) => renderTemplate('{{servizio}} a meno {{percentuale}}%', { servizio, percentuale: String(percentuale) })),
  }
}

export function firmaCollage(base: boolean, senzaFirma: boolean): string | null {
  if (senzaFirma || !base) return null
  return 'Fatto con Groomly'
}
