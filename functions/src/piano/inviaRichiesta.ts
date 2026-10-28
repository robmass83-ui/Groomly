import { randomBytes } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { fotoRichiesta, razzaRichiesta } from '../../../src/lib/fotoRichiesta'
import { specieAccettate } from '../../../src/lib/prenotazionePubblica'
import { contaAperte, esitoEmailPrenotazione, ingressoRichiestaPubblica, intervalloRichiesta, templatePrenotazione } from '../../../src/lib/prenotazione'
import { linguaClientiSalon, spedisciHtml, tipoEmailPrenotazione } from '../postaHtml'
import { salonPrenota } from './gatePrenotazione'
import { postiLiberiPer } from './postiLiberi'

export async function inviaRichiestaPer(input: {
  salonId: string
  email: string
  phone: string
  nome: string
  inizio: string
  fine: string
  esca: string
  giorno?: string
  ora?: string
  cane?: string
  taglia?: string
  specie?: string
  razza?: string
  foto?: unknown
  servizi?: string[]
}, apiKey?: string): Promise<{ ok: true; id?: string; emailStato: 'inviata' | 'non_inviata' }> {
  if (input.salonId === '' || input.salonId === 'shared' || input.salonId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  if (!(await salonPrenota(input.salonId))) throw new HttpsError('failed-precondition', 'Prenotazioni spente')
  const db = getFirestore()
  const aperte = await db.collection(`salons/${input.salonId}/richieste`).where('status', '==', 'nuova').get()
  const conti = contaAperte(
    aperte.docs.map((doc) => doc.data()),
    input.phone,
    input.email,
  )
  const ingresso = ingressoRichiestaPubblica({
    nome: input.nome,
    phone: input.phone,
    email: input.email,
    giorno: input.giorno ?? '',
    ora: input.ora ?? '',
    esca: input.esca,
    aperteTelefono: conti.aperteTelefono,
    aperteEmail: conti.aperteEmail,
    aperteSalone: conti.aperteSalone,
    adesso: new Date(),
  })
  if (!ingresso.ok) {
    const codice = ingresso.message === 'Troppe richieste' ? 'resource-exhausted' : 'invalid-argument'
    throw new HttpsError(codice, ingresso.message)
  }
  if (!ingresso.scrivi) return { ok: true, emailStato: 'non_inviata' }
  const razza = razzaRichiesta(input.razza)
  if (!razza) throw new HttpsError('invalid-argument', 'Razza obbligatoria')
  const impostazioni = (await db.doc(`salons/${input.salonId}/settings/main`).get()).data() ?? {}
  if (!specieAccettate(impostazioni.speciePrenotabili).includes(input.specie as 'cane' | 'gatto' | 'altro')) {
    throw new HttpsError('invalid-argument', 'Questo salone non accetta questo animale')
  }
  const foto = fotoRichiesta(input.foto)
  if (!foto) throw new HttpsError('invalid-argument', 'Foto non valida')
  const quando = intervalloRichiesta({ giorno: ingresso.giorno, ora: ingresso.ora })
  if (!quando?.giorno || !quando.ora) throw new HttpsError('invalid-argument', 'Richiesta non valida')
  const liberi = await postiLiberiPer(input.salonId, quando.giorno, 60)
  if (!liberi.orari.includes(quando.ora)) throw new HttpsError('failed-precondition', 'Orario non disponibile')
  const emailStato = esitoEmailPrenotazione(apiKey)
  const token = randomBytes(16).toString('hex')
  const ref = db.collection(`salons/${input.salonId}/richieste`).doc()
  await ref.set({
    status: 'nuova',
    email: ingresso.email,
    phone: ingresso.phone,
    nome: ingresso.nome,
    start: quando.inizio.toISOString(),
    end: quando.fine.toISOString(),
    token,
    emailStato,
    template: templatePrenotazione('nuova'),
    ...campiRichiesta(input, razza, foto),
  })
  if (apiKey) {
    const lingua = await linguaClientiSalon(input.salonId)
    await spedisciHtml(apiKey, tipoEmailPrenotazione('nuova'), lingua, ingresso.email, { nome: ingresso.nome }).catch(() => undefined)
  }
  return { ok: true, id: ref.id, emailStato }
}

function campiRichiesta(
  input: { cane?: string; taglia?: string; specie?: string; servizi?: string[] },
  razza: string,
  foto: string[],
): { cane?: string; taglia?: string; specie?: string; servizi?: string[]; razza: string; foto?: string[] } {
  const cane = (input.cane ?? '').trim().slice(0, 80)
  const taglia = input.taglia === 'piccola' || input.taglia === 'media' || input.taglia === 'grande' ? input.taglia : ''
  const specie = input.specie === 'cane' || input.specie === 'gatto' || input.specie === 'altro' ? input.specie : ''
  const servizi = (input.servizi ?? []).filter((id) => /^[a-z0-9-]{1,40}$/.test(id)).slice(0, 8)
  return {
    ...(cane ? { cane } : {}),
    ...(taglia ? { taglia } : {}),
    ...(specie ? { specie } : {}),
    ...(servizi.length > 0 ? { servizi } : {}),
    razza,
    ...(foto.length > 0 ? { foto } : {}),
  }
}
