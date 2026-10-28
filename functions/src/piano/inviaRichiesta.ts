import { randomBytes } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { riepilogoRicevuta } from '../../../src/i18n/emailHtml'
import { scegliCatalogo, type TagliaPrenotazione } from '../../../src/lib/catalogoPrenotazione'
import { fotoRichiesta, razzaRichiesta } from '../../../src/lib/fotoRichiesta'
import { specieAccettate } from '../../../src/lib/prenotazionePubblica'
import { contaAperte, ingressoRichiestaPubblica, intervalloRichiesta, templatePrenotazione } from '../../../src/lib/prenotazione'
import { linguaClientiSalon, spedisciHtml, tipoEmailPrenotazione } from '../postaHtml'
import { salonPrenota } from './gatePrenotazione'
import { catalogoDelSalone } from './paginaPubblica'
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
  const taglia: TagliaPrenotazione | null = input.taglia === 'piccola' || input.taglia === 'media' || input.taglia === 'grande' ? input.taglia : null
  const scelta = taglia ? scegliCatalogo(await catalogoDelSalone(input.salonId), input.servizi ?? [], taglia) : null
  if (!taglia || !scelta) throw new HttpsError('invalid-argument', 'Servizio non valido')
  const liberi = await postiLiberiPer(input.salonId, quando.giorno, scelta.durataMin)
  if (!liberi.orari.includes(quando.ora)) throw new HttpsError('failed-precondition', 'Orario non disponibile')
  const fine = new Date(quando.inizio.getTime() + scelta.durataMin * 60 * 1000)
  const token = randomBytes(16).toString('hex')
  const ref = db.collection(`salons/${input.salonId}/richieste`).doc()
  await ref.set({
    status: 'nuova',
    email: ingresso.email,
    phone: ingresso.phone,
    nome: ingresso.nome,
    start: quando.inizio.toISOString(),
    end: fine.toISOString(),
    token,
    template: templatePrenotazione('nuova'),
    ...campiRichiesta(input, razza, foto),
    servizi: scelta.voci.map((voce) => voce.id),
    voci: scelta.voci.map((voce) => ({
      id: voce.id,
      nome: voce.nome,
      kind: voce.kind,
      minuti: voce.minuti[taglia],
      prezzo: voce.prezzo[taglia],
    })),
    totaleIndicativo: scelta.totaleIndicativo,
    durataMin: scelta.durataMin,
    emailStato: 'non_inviata',
  })
  const business = impostazioni.business && typeof impostazioni.business === 'object' ? impostazioni.business as Record<string, unknown> : {}
  const salone = typeof business.salonName === 'string' ? business.salonName.trim() : ''
  const telefono = typeof business.phone === 'string' ? business.phone.trim() : ''
  let emailStato: 'inviata' | 'non_inviata' = 'non_inviata'
  if (apiKey) {
    try {
      const lingua = await linguaClientiSalon(input.salonId)
      const scheda = riepilogoRicevuta(lingua, {
        nome: ingresso.nome,
        cane: (input.cane ?? '').trim(),
        razza,
        specie: input.specie,
        taglia,
        servizi: scelta.voci.map((voce) => voce.nome),
        inizio: quando.inizio,
        fine,
        durataMin: scelta.durataMin,
        totale: scelta.totaleIndicativo,
        telefono,
      })
      await spedisciHtml(apiKey, tipoEmailPrenotazione('nuova'), lingua, ingresso.email, {
        nome: ingresso.nome,
        ...(salone ? { salone } : {}),
        scheda,
      })
      emailStato = 'inviata'
      await ref.set({ emailStato }, { merge: true })
    } catch {
      emailStato = 'non_inviata'
    }
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
