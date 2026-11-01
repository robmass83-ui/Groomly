import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio, authCancellati } = vi.hoisted(() => ({
  archivio: new Map<string, Record<string, unknown>>(),
  authCancellati: [] as string[],
}))

vi.mock('firebase-admin/firestore', () => {
  const figli = (percorso: string) => [...archivio.keys()].filter((chiave) => {
    if (!chiave.startsWith(`${percorso}/`)) return false
    return !chiave.slice(percorso.length + 1).includes('/')
  })
  const idDi = (chiave: string) => chiave.slice(chiave.lastIndexOf('/') + 1)
  const snapDoc = (chiave: string) => ({
    id: idDi(chiave),
    ref: documento(chiave),
    data: () => archivio.get(chiave),
    get: (campo: string) => archivio.get(chiave)?.[campo],
  })
  const query = (percorso: string, filtro: (chiave: string) => boolean): unknown => ({
    where: (campo: string, _op: string, valore: unknown) =>
      query(percorso, (chiave) => filtro(chiave) && archivio.get(chiave)?.[campo] === valore),
    orderBy: () => query(percorso, filtro),
    startAt: (inizio: string) => query(percorso, (chiave) => filtro(chiave) && idDi(chiave) >= inizio),
    endAt: (fine: string) => query(percorso, (chiave) => filtro(chiave) && idDi(chiave) <= fine),
    get: async () => {
      const docs = figli(percorso).filter(filtro).map(snapDoc)
      return { empty: docs.length === 0, docs }
    },
  })
  const documento = (percorso: string) => ({
    path: percorso,
    get: async () => {
      const dati = archivio.get(percorso)
      return { exists: dati !== undefined, id: idDi(percorso), data: () => dati, get: (campo: string) => dati?.[campo] }
    },
    set: async (dati: Record<string, unknown>) => {
      archivio.set(percorso, { ...(archivio.get(percorso) ?? {}), ...dati })
    },
    delete: async () => {
      archivio.delete(percorso)
    },
  })
  return {
    FieldPath: { documentId: () => '__name__' },
    getFirestore: () => ({
      doc: documento,
      collection: (percorso: string) => query(percorso, () => true),
      recursiveDelete: async (ref: { path: string }) => {
        for (const chiave of [...archivio.keys()]) {
          if (chiave === ref.path || chiave.startsWith(`${ref.path}/`)) archivio.delete(chiave)
        }
      },
      bulkWriter: () => {
        const coda: string[] = []
        return {
          delete: (ref: { path: string }) => {
            coda.push(ref.path)
            return Promise.resolve()
          },
          close: async () => coda.forEach((chiave) => archivio.delete(chiave)),
        }
      },
    }),
  }
})

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUser: async (uid: string) => ({ uid, email: `${uid}@test.it` }),
    deleteUser: async (uid: string) => {
      authCancellati.push(uid)
    },
  }),
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: () => ({ deleteFiles: async () => undefined }) }),
}))

import { emailEliminazione } from './emailEliminazione'
import { avvisoAbbonamentoPlay, decisioneEliminazione, eliminaAccountPer } from './eliminaAccount'

describe('eliminazione account', () => {
  it('il titolare cancella il salone, il collaboratore solo il proprio posto', () => {
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1' })).toEqual({ ok: true, azione: 'salone' })
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'altro' }).ok).toBe(false)
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'collab', salonId: 'u1' })).toEqual({ ok: true, azione: 'membro' })
    expect(decisioneEliminazione({ uid: 'u1', salonId: '' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'attivo' })).toEqual({ ok: true, azione: 'salone' })
    expect(avvisoAbbonamentoPlay('play', 'attivo')).toBe(true)
    expect(avvisoAbbonamentoPlay('play', 'scaduto')).toBe(false)
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'scaduto' })).toEqual({ ok: true, azione: 'salone' })
  })

  it('non elimina Laura né un titolare VIP', () => {
    expect(decisioneEliminazione({ uid: 'laura', salonId: 'laura', email: 'laura.masala@tiscali.it' }).message).toBe('Questo account non si può eliminare')
    expect(decisioneEliminazione({ uid: 'ada', salonId: 'ada', vip: true }).message).toBe('Questo account non si può eliminare')
    expect(decisioneEliminazione({ uid: 'collab', salonId: 'ada', vip: true })).toEqual({ ok: true, azione: 'membro' })
    expect(decisioneEliminazione({ uid: 'ada', salonId: 'ada', email: '' }).ok).toBe(true)
  })

  it('l’email di conferma nomina il salone e il contatto', () => {
    const lettera = emailEliminazione('Bauci <salon>')
    expect(lettera.oggetto).toBe('Il tuo account Groomly è stato eliminato')
    expect(lettera.html).toContain('Bauci &lt;salon&gt;')
    expect(lettera.html).toContain('Grazie per aver lavorato con noi')
    expect(lettera.html).toContain('info@groomlyapp.it')
    expect(lettera.html).toContain('groomly-logo-orizzontale.svg')
    expect(lettera.html).not.toContain('<a ')
  })

  it('senza nome la lettera dice l’account del salone', () => {
    const lettera = emailEliminazione('  ')
    expect(lettera.html).toContain('l’account del salone')
    expect(lettera.html).not.toContain('dell’account')
    expect(lettera.html).not.toContain('di il')
    expect(lettera.html).not.toContain('di Groomly')
  })

  it('l’eliminazione in inglese e spagnolo usa la specifica', () => {
    const en = emailEliminazione('Canespa', 'en')
    expect(en.oggetto).toBe('Your Groomly account has been deleted')
    expect(en.html).toContain("Hi, this is to confirm that the Canespa account has been deleted, together with the salon data managed by Groomly. Any files you saved on your phone or Google Drive remain yours. Thank you for working with us: if you ever want to come back, we'll be glad to have you. If this wasn't you, please write to info@groomlyapp.it straight away.")
    expect(emailEliminazione('', 'en').html).toContain('the salon account')
    expect(emailEliminazione('', 'en').html).not.toContain('the Groomly account')
    const es = emailEliminazione('Canespa', 'es')
    expect(es.oggetto).toBe('Tu cuenta de Groomly ha sido eliminada')
    expect(es.html).toContain('Hola, te confirmamos que la cuenta de Canespa ha sido eliminada, junto con los datos de la peluquería gestionados por Groomly. Los archivos que guardaste en tu teléfono o en tu Google Drive siguen siendo tuyos. Gracias por trabajar con nosotros: si algún día quieres volver, te esperamos. Si no has sido tú, escribe cuanto antes a info@groomlyapp.it.')
    expect(emailEliminazione('', 'es').html).toContain('la cuenta de la peluquería')
    expect(emailEliminazione('', 'es').html).not.toContain('la cuenta de Groomly')
  })
})

describe('eliminare l’account del titolare', () => {
  beforeEach(() => {
    archivio.clear()
    authCancellati.length = 0
    archivio.set('accounts/tit', { salonId: 'tit', role: 'titolare', email: 'tit@test.it' })
    archivio.set('salons/tit/settings/main', { business: { salonName: 'Bauci' } })
    archivio.set('salons/tit/members/socio', { status: 'attivo' })
    archivio.set('salons/tit/members/collab', { status: 'attivo' })
    archivio.set('accounts/socio', { salonId: 'tit', role: 'socio', email: 'socio@test.it' })
    archivio.set('accounts/collab', { salonId: 'tit', role: 'collaboratore', email: 'collab@test.it' })
  })

  it('il titolare che si elimina non lascia pagina pubblica, inviti né contatori email', async () => {
    archivio.set('pubblici/bauci', { salonId: 'tit' })
    archivio.set('pubblici/altro', { salonId: 'altro' })
    archivio.set('invites/i1', { salonId: 'tit' })
    archivio.set('schede/s1', { salonId: 'tit' })
    archivio.set('suggerimenti/g1', { salonId: 'tit' })
    archivio.set('emailRateLimits/tit@test.it', { n: 1 })
    archivio.set('accounts/tit/devices/tel1', { x: 1 })
    archivio.set('pushDeliveries/tel1__', { x: 1 })
    await eliminaAccountPer('tit')
    for (const percorso of ['pubblici/bauci', 'invites/i1', 'schede/s1', 'suggerimenti/g1', 'emailRateLimits/tit@test.it', 'accounts/tit', 'accounts/tit/devices/tel1', 'pushDeliveries/tel1__', 'salons/tit/settings/main']) {
      expect(archivio.has(percorso), percorso).toBe(false)
    }
    expect(archivio.has('pubblici/altro')).toBe(true)
    expect(authCancellati).toEqual(['tit'])
  })

  it('soci e collaboratori tornano al proprio salone e tengono l’accesso', async () => {
    await eliminaAccountPer('tit')
    expect(archivio.get('accounts/socio')).toMatchObject({ salonId: 'socio', role: 'titolare', email: 'socio@test.it' })
    expect(archivio.get('accounts/collab')).toMatchObject({ salonId: 'collab', role: 'titolare', email: 'collab@test.it' })
    expect(authCancellati).toEqual(['tit'])
  })

  it('un membro che è già in un altro salone non viene toccato', async () => {
    archivio.set('accounts/socio', { salonId: 'altro', role: 'socio' })
    await eliminaAccountPer('tit')
    expect(archivio.get('accounts/socio')).toEqual({ salonId: 'altro', role: 'socio' })
    expect(archivio.get('accounts/collab')).toMatchObject({ salonId: 'collab' })
  })

  it('senza pagina pubblica, inviti e telefoni l’eliminazione riesce', async () => {
    await expect(eliminaAccountPer('tit')).resolves.toEqual({ ok: true })
    expect(archivio.has('accounts/tit')).toBe(false)
    expect(authCancellati).toEqual(['tit'])
  })
})
