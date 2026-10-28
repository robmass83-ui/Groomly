import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { decisioneVip } from '../../../src/lib/funzioniPiano'
import { decisioneBypass, type AzioneBypass } from '../../../src/lib/pianoBypass'
import { isOperator } from '../../../src/lib/salonPath'
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
  salonId: string
  azione: string
  adesso?: Date
  testo?: string
}): Promise<{ ok: true }> {
  if (!isOperator(input.operatorEmail)) throw new HttpsError('failed-precondition', 'Accesso negato')
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
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const ownerSnap = await tx.get(ownerRef)
    const memberSnap = await tx.get(memberRef)
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
    const campi = bypass
      ? campiDelBypass(attuale, bypass, input.testo ?? '', adesso)
      : campiDellaAzione(input.azione as AzionePiano, adesso, provaUsata)
    tx.set(ref, { ...scriviPiano(campi, adesso), updatedAt: adesso.toISOString() }, { merge: true })
    if ((input.azione !== 'salone' && input.azione !== 'bypass-salone') || memberSnap.exists) return
    const owner = ownerSnap.data() as DocumentData | undefined
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
  return { ok: true }
}

function campiDelBypass(doc: ProMain | undefined, azione: AzioneBypass, testo: string, adesso: Date): CampiPiano {
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
  return campiBypass(decisione.campi)
}

function campiDellaAzione(azione: AzionePiano, adesso: Date, provaUsata: boolean): CampiPiano {
  const campi = campiAzione(azione, adesso, provaUsata)
  if ('message' in campi) throw new HttpsError('failed-precondition', campi.message)
  return campi
}
