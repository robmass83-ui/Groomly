// Tutte le email, le pagine di esito e le push, in cinque lingue, senza spedire niente. Lo usa verify-lingue-documenti.mjs.
import { emailMessaggio, giornoMail, mailPostoLibero, riepilogoRicevuta, type TipoEmail } from '../../src/i18n/emailHtml'
import { LINGUE } from '../../src/i18n/lingua'
import { paginaRisposta, htmlEsito, htmlDomandaRisposta } from '../../src/lib/htmlEsito'
import { htmlAvviso, oggettoAvviso } from '../../src/lib/avvisoPiano'
import { selectPushes } from '../../src/lib/pushDue'
import { emailBeta, type TipoEmailBeta } from '../../functions/src/beta/emailBeta'
import { emailAnnuncio } from '../../functions/src/abbonamenti/emailAnnuncio'
import { emailEliminazione } from '../../functions/src/piano/emailEliminazione'

const TIPI: TipoEmail[] = ['verifica', 'reset', 'invito', 'ricevuta', 'conferma', 'proposta', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri', 'recensione', 'attesa']
const BETA: TipoEmailBeta[] = ['invito', 'invito-ritirato', 'revoca', 'estensione', 'fine-7', 'fine-1']

export function tutto() {
  const email: { lingua: string; tipo: string; oggetto: string; html: string }[] = []
  const altri: { lingua: string; tipo: string; testo: string }[] = []
  const push: { lingua: string; tipo: string; title: string; body: string }[] = []
  for (const lingua of LINGUE) {
    const data = new Date(2026, 10, 12, 10, 30)
    const quando = giornoMail(lingua, data)
    for (const tipo of TIPI) {
      const m = emailMessaggio(lingua, tipo, {
        cliente: 'Luna', cane: 'Luna', salone: 'Pelo & Coda', ruolo: 'collaboratore', url: 'https://groomlyapp.it/azione/?lang=' + lingua, urlRifiuta: 'https://groomlyapp.it/azione/?no=1&lang=' + lingua,
        quando, telefono: '+39 333 1112223', invece: quando, entro: quando, silenzio: 'https://groomlyapp.it/azione/?silenzio=1', rispondi: true, account: 'prova@example.test',
        scheda: riepilogoRicevuta(lingua, { nome: 'Luna', cane: 'Luna', razza: 'Barboncino', specie: 'cane', taglia: 'media', servizi: ['Bagno', 'Unghie'], inizio: data, fine: new Date(data.getTime() + 3600000), durataMin: 60, totale: 40.5, telefono: '+39 333 1112223' }),
      })
      email.push({ lingua, tipo, ...m })
    }
    for (const tipo of BETA) email.push({ lingua, tipo: 'beta-' + tipo, ...emailBeta(lingua, tipo, { piano: 'salone', giorni: 30, scadeIl: '2026-12-21', testo: 'Testo operatore' }) })
    email.push({ lingua, tipo: 'annuncio', ...emailAnnuncio(lingua, '2026-12-21') })
    email.push({ lingua, tipo: 'eliminazione', ...emailEliminazione('Pelo & Coda', lingua) })
    email.push({ lingua, tipo: 'avviso-piano', oggetto: oggettoAvviso(lingua), html: htmlAvviso('Testo') })
    const posto = mailPostoLibero({ lingua, nomeSalone: 'Pelo & Coda', quando, url: 'https://groomlyapp.it/s/x?lang=' + lingua })
    altri.push({ lingua, tipo: 'posto-libero', testo: posto.oggetto + '\n' + posto.testo })
    for (const esito of ['confermato', 'liberato', 'nonValido'] as const) altri.push({ lingua, tipo: 'pagina-' + esito, testo: paginaRisposta(lingua, esito, { salone: 'Pelo & Coda', cane: 'Luna', quando }) })
    for (const azione of ['conferma', 'rifiuta'] as const) altri.push({ lingua, tipo: 'domanda-' + azione, testo: htmlDomandaRisposta({ lingua, azione, azioneUrl: 'https://x.test' }) })
    for (const tipo of ['conferma', 'liberato', 'non_valido'] as never[]) { try { altri.push({ lingua, tipo: 'esito-' + String(tipo), testo: htmlEsito({ lingua, tipo, salone: 'Pelo & Coda', cane: 'Luna', quando } as never) }) } catch { /* tipo assente */ } }
    const ora = Date.UTC(2026, 10, 12, 12, 0)
    const sends = selectPushes({
      deviceId: 'd', token: 't', salonId: 's', appVersion: '1.0.0', latestVersion: '2.0.0', lingua, nowMs: ora, delivered: [],
      prefs: { enabled: true, updates: true, complete: true, completeAfterMin: 0 },
      appointments: [
        { id: 'a', dogId: 'x', status: 'programmato', startMs: ora + 20 * 60000, durationMin: 30, personalTitle: 'Dentista' },
        { id: 'b', dogId: 'x', status: 'programmato', startMs: ora - 90 * 60000, durationMin: 30 },
        { id: 'c', dogId: 'y', status: 'programmato', startMs: ora - 90 * 60000, durationMin: 30 },
      ],
      dogNames: { x: 'Luna' },
    } as never)
    for (const s of sends as { kind: string; title: string; body: string }[]) push.push({ lingua, tipo: s.kind, title: s.title, body: s.body })
  }
  return { email, altri, push }
}
