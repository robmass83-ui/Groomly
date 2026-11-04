import type { ReactNode } from 'react'
import type { PianoValore } from '../../hooks/usePiano'
import { CONFIG_PIANI_DEFAULT } from '../../lib/configPiani'
import { statoPiano, type ProMain } from '../../lib/piano'
import type { InvitoBeta } from '../../lib/betaInvito'
import { BetaContext, VALORE_BETA_VUOTO, type ValoreBeta } from './BetaProvider'

// Solo per i test: uno stato beta finto e il contesto che lo porta.
const GIORNO = 24 * 60 * 60 * 1000

export function invitoDiProva(campi: Partial<InvitoBeta> = {}, adesso = new Date()): InvitoBeta {
  const tra = (giorni: number) => new Date(adesso.getTime() + giorni * GIORNO).toISOString()
  return {
    salonId: 'u1', piano: 'pro', giorni: 30, messaggio: null, stato: 'invitato', invitatoIl: tra(-1), scadeInvitoIl: tra(13),
    rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: 'op@groomly.app', aggiornatoIl: tra(-1),
    ...campi,
  }
}

export function valoreBeta(campi: Partial<ValoreBeta> = {}): ValoreBeta {
  return { ...VALORE_BETA_VUOTO, salonId: 'u1', titolare: true, ...campi }
}

export function ConBeta({ valore, children }: { valore: ValoreBeta; children: ReactNode }) {
  return <BetaContext.Provider value={valore}>{children}</BetaContext.Provider>
}

export function pianoFinto(campi: Partial<PianoValore> = {}, doc?: ProMain, adesso = new Date()): PianoValore {
  return {
    mostraPiani: true,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoPiano(doc, adesso),
    provaUsata: doc?.provaUsata === true,
    provaConcessa: false,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    pronto: true,
    traccia: doc ?? {},
    configPiani: CONFIG_PIANI_DEFAULT,
    ...campi,
  }
}
