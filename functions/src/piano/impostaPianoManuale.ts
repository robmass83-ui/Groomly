import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { htmlAvviso, oggettoAvviso } from '../../../src/lib/avvisoPiano'
import { decisioneVip } from '../../../src/lib/funzioniPiano'
import { decisioneBypass, type AzioneBypass } from '../../../src/lib/pianoBypass'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { postBrevoHtml } from '../brevoMail'
import { membroTitolareMancante } from './titolareMembro'
import { campiAzione, campiBypass, conTraccia, scriviPiano, tracciaProva, type AzionePiano, type CampiPiano } from './scriviPiano'
import { fonteDi, type ProMain } from '../../../src/lib/piano'
import { erroreDaMessaggio, erroreServer } from '../erroriServer'

const AZIONI = new Set<AzionePiano>(['prova', 'pro', 'salone', 'base'])

function comeBypass(azione: string): AzioneBypass | null {
  if (azione === 'bypass-pro') return 'scegli-pro'
  if (azione === 'bypass-salone') return 'scegli-salone'
  if (azione === 'spegni' || azione === 'spegni-omaggio') return azione
  return null
}

export async function impostaPianoManualePer(input: {
  admin?: boolean
  salonId: string
  azione: string
  adesso?: Date
  testo?: string
  apiKey?: string
}): Promise<{ ok: true; emailStato: 'inviata' | 'non_inviata' | null }> {
  if (!operatoreAutorizzato({ admin: input.admin })) {
    throw erroreServer('failed-precondition', 'accesso_negato')
  }
  const bypass = comeBypass(input.azione)
  if (!bypass && !AZIONI.has(input.azione as AzionePiano)) throw erroreServer('failed-precondition', 'accesso_negato')
  if (input.salonId === '' || input.salonId.includes('/') || input.salonId === 'shared') {
    throw erroreServer('failed-precondition', 'accesso_negato')
  }
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()
  const ref = db.doc(`salons/${input.salonId}/pro/main`)
  const ownerRef = db.doc(`accounts/${input.salonId}`)
  const memberRef = db.doc(`salons/${input.salonId}/members/${input.salonId}`)
  let avviso: string | null = null
  let emailTitolare = ''
  let linguaTitolare: Lingua = 'it'
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
      fonte: fonteDi(snap.get('fonte')),
      scadeIl: typeof snap.get('scadeIl') === 'string' || snap.get('scadeIl') === null ? snap.get('scadeIl') : undefined,
    } : undefined
    const traccia = tracciaProva(attuale, provaUsata, adesso)
    if (input.azione !== 'spegni-omaggio') {
      const vip = decisioneVip(attuale, input.azione)
      if (!vip.ok) throw erroreDaMessaggio('failed-precondition', vip.message)
    }
    const esito = bypass
      ? esitoBypass(attuale, bypass, input.testo ?? '', adesso)
      : { campi: campiAzione(input.azione as AzionePiano, adesso, traccia), avviso: null }
    avviso = esito.avviso
    const campi = conTraccia(esito.campi, traccia)
    tx.set(ref, { ...scriviPiano(campi, adesso), updatedAt: adesso.toISOString() }, { merge: true })
    if (avviso !== null) {
      tx.set(db.doc(`salons/${input.salonId}/avvisi/piano`), {
        testo: avviso,
        at: adesso.toISOString(),
        letto: false,
      })
    }
    if (input.azione !== 'salone' && input.azione !== 'bypass-salone') return
    const membro = membroTitolareMancante(input.salonId, memberSnap.exists, owner)
    if (membro) tx.set(memberRef, membro)
  })
  if (avviso === null) return { ok: true, emailStato: null }
  return { ok: true, emailStato: await inviaAvvisoPiano(emailTitolare, avviso, input.apiKey ?? '', linguaTitolare) }
}

async function inviaAvvisoPiano(
  email: string,
  avviso: string,
  apiKey: string,
  lingua: Lingua,
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
      throw erroreServer('failed-precondition', decisione.manca === 'vip' ? 'piano_vip_attivo' : 'motivo_piano')
    }
    throw erroreServer('failed-precondition', 'accesso_negato')
  }
  return { campi: campiBypass(decisione.campi), avviso: decisione.avviso }
}
