import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { linguaValida } from '../../../src/i18n/lingua'
import { htmlAvviso, oggettoAvviso } from '../../../src/lib/avvisoPiano'
import { decisioneVip } from '../../../src/lib/funzioniPiano'
import { decisioneBypass, type AzioneBypass } from '../../../src/lib/pianoBypass'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { postBrevoHtml } from '../brevoMail'
import { campiAzione, campiBypass, scriviPiano, type AzionePiano, type CampiPiano } from './scriviPiano'
import type { ProMain } from '../../../src/lib/piano'

const AZIONI = new Set<AzionePiano>(['prova', 'pro', 'salone', 'base'])

function comeBypass(azione: string): AzioneBypass | null {
  if (azione === 'bypass-pro') return 'scegli-pro'
  if (azione === 'bypass-salone') return 'scegli-salone'
  if (azione === 'spegni' || azione === 'spegni-omaggio') return azione
  return null
}

export async function impostaPianoManualePer(input: {
  operatorEmail: string
  emailVerified?: boolean
  admin?: boolean
  salonId: string
  azione: string
  adesso?: Date
  testo?: string
  apiKey?: string
}): Promise<{ ok: true; emailStato: 'inviata' | 'non_inviata' | null }> {
  if (!operatoreAutorizzato({ email: input.operatorEmail, emailVerified: input.emailVerified, admin: input.admin })) {
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  const bypass = comeBypass(input.azione)
  if (!bypass && !AZIONI.has(input.azione as AzionePiano)) throw new HttpsError('failed-precondition', 'Accesso negato')
  if (input.salonId === '' || input.salonId.includes('/') || input.salonId === 'shared') {
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()
  const ref = db.doc(`salons/${input.salonId}/pro/main`)
  const ownerRef = db.doc(`accounts/${input.salonId}`)
  const memberRef = db.doc(`salons/${input.salonId}/members/${input.salonId}`)
  let avviso: string | null = null
  let emailTitolare = ''
  let linguaTitolare: 'it' | 'en' | 'es' = 'it'
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const ownerSnap = await tx.get(ownerRef)
    const memberSnap = await tx.get(memberRef)
    const owner = ownerSnap.data() as DocumentData | undefined
    emailTitolare = typeof owner?.email === 'string' ? owner.email.trim() : ''
    linguaTitolare = linguaValida(owner?.lingua) ?? 'it'
    const provaUsata = snap.get('provaUsata') === true
    const attuale: ProMain | undefined = snap.exists ? {
      piano: snap.get('piano') === 'pro' || snap.get('piano') === 'salone' || snap.get('piano') === 'base' ? snap.get('piano') : undefined,
      stato: snap.get('stato') === 'attivo' || snap.get('stato') === 'prova' || snap.get('stato') === 'grazia' || snap.get('stato') === 'sospeso' || snap.get('stato') === 'disdetto' || snap.get('stato') === 'scaduto' ? snap.get('stato') : undefined,
      fonte: snap.get('fonte') === 'play' || snap.get('fonte') === 'prova' || snap.get('fonte') === 'omaggio' || snap.get('fonte') === 'manuale' ? snap.get('fonte') : null,
      scadeIl: typeof snap.get('scadeIl') === 'string' || snap.get('scadeIl') === null ? snap.get('scadeIl') : undefined,
    } : undefined
    if (input.azione !== 'spegni-omaggio') {
      const vip = decisioneVip(attuale, input.azione)
      if (!vip.ok) throw new HttpsError('failed-precondition', vip.message)
    }
    const esito = bypass
      ? esitoBypass(attuale, bypass, input.testo ?? '', adesso)
      : { campi: campiDellaAzione(input.azione as AzionePiano, adesso, provaUsata), avviso: null }
    avviso = esito.avviso
    const campi = esito.campi
    tx.set(ref, { ...scriviPiano(campi, adesso), updatedAt: adesso.toISOString() }, { merge: true })
    if (avviso !== null) {
      tx.set(db.doc(`salons/${input.salonId}/avvisi/piano`), {
        testo: avviso,
        at: adesso.toISOString(),
        letto: false,
      })
    }
    if ((input.azione !== 'salone' && input.azione !== 'bypass-salone') || memberSnap.exists) return
    if (!owner || owner.salonId !== input.salonId || owner.role !== 'titolare') return
    tx.set(memberRef, {
      uid: input.salonId,
      email: typeof owner.email === 'string' ? owner.email : '',
      role: 'titolare',
      firstName: typeof owner.firstName === 'string' ? owner.firstName : '',
      lastName: typeof owner.lastName === 'string' ? owner.lastName : '',
      status: 'attivo',
    })
  })
  if (avviso === null) return { ok: true, emailStato: null }
  return { ok: true, emailStato: await inviaAvvisoPiano(emailTitolare, avviso, input.apiKey ?? '', linguaTitolare) }
}

async function inviaAvvisoPiano(
  email: string,
  avviso: string,
  apiKey: string,
  lingua: 'it' | 'en' | 'es',
): Promise<'inviata' | 'non_inviata'> {
  if (email === '' || apiKey === '') return 'non_inviata'
  try {
    await postBrevoHtml(apiKey, email, oggettoAvviso(lingua), htmlAvviso(avviso))
    return 'inviata'
  } catch {
    return 'non_inviata'
  }
}

function esitoBypass(doc: ProMain | undefined, azione: AzioneBypass, testo: string, adesso: Date): { campi: CampiPiano; avviso: string | null } {
  const decisione = decisioneBypass(doc, azione, testo, adesso)
  if (!decisione.ok) {
    if (decisione.manca === 'testo' || decisione.manca === 'vip') {
      throw new HttpsError(
        'failed-precondition',
        decisione.manca === 'vip' ? 'Il piano VIP resta attivo' : 'Scrivi il motivo, da 1 a 400 caratteri',
      )
    }
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  return { campi: campiBypass(decisione.campi), avviso: decisione.avviso }
}

function campiDellaAzione(azione: AzionePiano, adesso: Date, provaUsata: boolean): CampiPiano {
  const campi = campiAzione(azione, adesso, provaUsata)
  if ('message' in campi) throw new HttpsError('failed-precondition', campi.message)
  return campi
}
