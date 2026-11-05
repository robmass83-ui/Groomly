import { emailMessaggio, type TipoEmail } from '../../src/i18n/emailHtml'
import { LINGUE, type Lingua } from '../../src/i18n/lingua'

export const DESTINATARIO_CAMPIONE = 'info@groomlyapp.it'

const TIPI: TipoEmail[] = [
  'verifica',
  'reset',
  'invito',
  'ricevuta',
  'conferma',
  'proposta',
  'rifiuto',
  'liberato',
  'scadenza',
  'disdetta',
  'promemoria',
  'pronto',
  'auguri',
  'recensione',
  'attesa',
]


export function pianoCampione(): { tipo: TipoEmail; lingua: Lingua }[] {
  return LINGUE.flatMap((lingua) => TIPI.map((tipo) => ({ tipo, lingua })))
}

export async function inviaCampione(input: {
  admin: boolean
  apiKey?: string
  invia: (to: string, oggetto: string, html: string) => Promise<void>
}): Promise<{ spedite: number; motivo?: 'chiave assente' | 'negato' }> {
  if (!input.admin) return { spedite: 0, motivo: 'negato' }
  if (!input.apiKey) return { spedite: 0, motivo: 'chiave assente' }
  const piano = pianoCampione()
  for (const voce of piano) {
    const mail = emailMessaggio(voce.lingua, voce.tipo, {
      cliente: 'Luna',
      cane: 'Luna',
      salone: 'Salone Demo',
      url: 'https://groomlyapp.it/azione',
    })
    await input.invia(DESTINATARIO_CAMPIONE, mail.oggetto, mail.html)
  }
  return { spedite: piano.length }
}
