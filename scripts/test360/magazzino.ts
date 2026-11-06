// Test 360° del Magazzino: SOLO per gli emulatori Firebase (progetto demo-groomly).
// Uso: npx vite-node scripts/test360/magazzino.ts semina|controlla|pulisci <cartella dei risultati>
// `semina` crea 20 saloni finti e scrive quello che si aspetta. `controlla` rilegge i dati con il codice dell'app
// e confronta con conti fatti qui a parte. `pulisci` cancella tutto e verifica che non resti nulla.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { appointmentFromDoc, dogFromDoc, serviceFromDoc, serviceToDoc } from '../../src/lib/firebaseMap'
import { SERVICE_SEED } from '../../src/data/seed/services'
import { costruisciRegistro } from '../../src/lib/registroModello'
import { canonicalJson, type GroomlyDati } from '../../src/lib/backupBundle'
import { prodottiToLocalMap } from '../../src/data/local/prodotti'
import { daButtare, daOrdinare, filtraProdotti, prodottoDaDoc, type FiltroProdotti, type Prodotto } from '../../src/lib/prodotti'
import { costoLavaggio, incassiMese, lavaggiRecenti, riepilogoMagazzino, sottoStima, stimaProdotto } from '../../src/lib/stimeMagazzino'
import type { DogSize } from '../../src/types/models'
import { fermaSeNonDemo } from './guard'

fermaSeNonDemo()
initializeApp({ projectId: 'demo-groomly' })
const auth = getAuth()
const db = getFirestore()

const [azione, cartella] = process.argv.slice(2)
if (!cartella) throw new Error('Manca la cartella dei risultati')
mkdirSync(cartella, { recursive: true })
const FILE_ATTESO = join(cartella, 'atteso.json')

const PASSWORD = 'Test1234!'
const GIORNO = 86400000
const TAGLIE: DogSize[] = ['piccola', 'media', 'grande']
const ADESSO = Date.now()

let seme = 7
const caso = () => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme / 2147483648 }
const intero = (a: number, b: number) => a + Math.floor(caso() * (b - a + 1))

type Livello = 'go' | 'plus' | 'salone'
interface Atteso {
  indice: number
  uid: string
  email: string
  livello: Livello
  lavaggi: Record<DogSize, number>
  incassi: number
  prodotti: number
}

const PIANI: Record<Livello, Record<string, unknown>> = {
  go: { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true },
  plus: { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null },
  salone: { piano: 'salone', stato: 'attivo', fonte: 'manuale', scadeIl: null },
}

const SHAMPOO = { piccola: 15, media: 30, grande: 50 }
const PROFUMO = { piccola: 2, media: 3, grande: 5 }

/** I documenti come stanno davvero: i primi nel formato vecchio, senza `uso`. */
function prodottiDi(strano: boolean): Record<string, Record<string, unknown>> {
  const ora = ADESSO - 200 * GIORNO
  const vecchio = (nome: string, categoria: unknown, over: Record<string, unknown> = {}) => ({ nome, categoria, pezzi: 3, quantita: null, unita: 'l', ditta: 'Ditta Alfa', telefono: '+393331112223', email: 'ordini@alfa.test', codice: '', soglia: 0, inArrivo: 0, ordinatoIl: null, movimenti: [], createdAt: ora, updatedAt: ora, ...over })
  const nuovo = (nome: string, categoria: string, over: Record<string, unknown> = {}) => ({ ...vecchio(nome, categoria), uso: 'salone', diluizione: null, apertoIl: null, mesiDopoApertura: null, costo: null, prezzoVendita: null, mlPerCane: null, giorniConsegna: null, confrontoIl: null, ...over })
  return {
    vecchioShampoo: vecchio(strano ? 'Shampoo «extra» 🐾 per cani con un nome lunghissimo che non finisce mai' : 'Shampoo neutro', 'shampoo', { pezzi: 4, quantita: 5, soglia: 2 }),
    vecchioProfumo: vecchio('Profumo talco', 'profumi', { pezzi: 1, quantita: 250, unita: 'ml', soglia: 2 }),
    vecchiaLama: vecchio('Lame per tosatrice', 'altro', { pezzi: 0, soglia: 1 }),
    vecchioDisinfettante: vecchio('Disinfettante per attrezzi', 'cura'),
    vecchiGuanti: vecchio('Guanti monouso', 'altro'),
    ignoto: vecchio('Cosa ignota', 'cibo'),
    tanica: nuovo('Shampoo concentrato', 'lavaggio', { pezzi: 3, quantita: 0.5, soglia: 1, costo: 40, diluizione: 10, mlPerCane: SHAMPOO, giorniConsegna: 3 }),
    profumo: nuovo('Profumo fiorito', 'finitura', { pezzi: 2, quantita: 30, unita: 'ml', soglia: 1, costo: 12, mlPerCane: PROFUMO, giorniConsegna: 5 }),
    banco: nuovo('Crema zampe', 'cura', { uso: 'vendita', pezzi: 5, soglia: 2, costo: 8, prezzoVendita: 15 }),
    scaduto: nuovo('Balsamo aperto da tanto', 'lavaggio', { pezzi: 2, apertoIl: ADESSO - 430 * GIORNO, mesiDopoApertura: 12 }),
    fresco: nuovo('Balsamo aperto da poco', 'lavaggio', { pezzi: 2, apertoIl: ADESSO - 60 * GIORNO, mesiDopoApertura: 12 }),
    inArrivo: nuovo('Fiocchetti', 'tocchi', { pezzi: 0, soglia: 2, inArrivo: 4, ordinatoIl: ADESSO - GIORNO }),
    arrivi: nuovo('Rotoli di carta', 'pulizia', { pezzi: 6, costo: 10, movimenti: [{ at: ADESSO - 3600000, delta: 3, dopo: 6 }, { at: ADESSO - 40 * GIORNO, delta: 3, dopo: 3 }] }),
  }
}

const CATEGORIE_ATTESE: Record<string, string> = {
  vecchioShampoo: 'lavaggio', vecchioProfumo: 'finitura', vecchiaLama: 'macchinette', vecchioDisinfettante: 'pulizia', vecchiGuanti: 'pulizia', ignoto: 'varie',
  tanica: 'lavaggio', profumo: 'finitura', banco: 'cura', scaduto: 'lavaggio', fresco: 'lavaggio', inArrivo: 'tocchi', arrivi: 'pulizia',
}

async function semina(): Promise<void> {
  // Un giro fermato a metà non deve bloccare il successivo.
  const rimasti = (await auth.listUsers()).users.filter((utente) => utente.email?.startsWith('mag360-'))
  await auth.deleteUsers(rimasti.map((utente) => utente.uid))
  const attesi: Atteso[] = []
  for (let indice = 1; indice <= 20; indice += 1) {
    const email = `mag360-${indice}@test.groomly`
    const { uid } = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
    const livello: Livello = (['go', 'plus', 'salone'] as const)[indice % 3]
    const vuoto = indice === 18
    const nomeSalone = indice === 19 ? 'Toelettatura «Il Pelo Lunghissimo & Co.» 🐾' : `Salone finto ${indice}`
    await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', legacy: false, firstName: 'Prova', lastName: `Salone${indice}`, createdAt: '2020-01-01T00:00:00.000Z' })
    const root = db.doc(`salons/${uid}`)
    await root.collection('settings').doc('main').set({ business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' })
    await root.collection('members').doc(uid).set({ uid, email, role: 'titolare', firstName: 'Prova', lastName: `Salone${indice}`, status: 'attivo' })
    await root.collection('pro').doc('main').set(PIANI[livello])
    const data = new Date(ADESSO - 400 * GIORNO)
    const servizi = [...SERVICE_SEED.map((servizio) => ({ ...servizio, createdAt: data, updatedAt: data })), { ...SERVICE_SEED[0], id: 'soloUnghie', name: 'Solo unghie', senzaBagno: true, order: 90, createdAt: data, updatedAt: data }]
    for (const servizio of servizi) await root.collection('services').doc(servizio.id).set(serviceToDoc(servizio))
    const principale = SERVICE_SEED.find((servizio) => servizio.kind === 'principale')
    const extra = SERVICE_SEED.find((servizio) => servizio.kind === 'extra')
    if (!principale || !extra) throw new Error('Servizi di base mancanti')

    const lavaggi: Record<DogSize, number> = { piccola: 0, media: 0, grande: 0 }
    let incassi = 0
    if (!vuoto) {
      for (const taglia of TAGLIE) {
        await root.collection('dogs').doc(`cane-${taglia}`).set({ id: `cane-${taglia}`, name: `Cane ${taglia}`, species: taglia === 'media' ? 'gatto' : 'cane', breed: 'Meticcio', size: taglia, ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Ada Rossi', phone: '+393331112224' }, contacts: [], createdAt: ADESSO - 400 * GIORNO, updatedAt: ADESSO - 400 * GIORNO })
      }
      const inizioMese = new Date(ADESSO)
      inizioMese.setDate(1)
      inizioMese.setHours(0, 0, 0, 0)
      let numero = 0
      let lotto = db.batch()
      const visita = (taglia: DogSize, giorniFa: number, over: Record<string, unknown> = {}, voce: { id: string; name: string } = principale) => {
        numero += 1
        const start = ADESSO - giorniFa * GIORNO
        lotto.set(root.collection('appointments').doc(`v${numero}`), { id: `v${numero}`, dogId: `cane-${taglia}`, start, end: start + 3600000, services: [{ serviceId: voce.id, name: voce.name, durationMin: 60, price: 30 }], status: 'completato', total: 30, kind: 'pelosetto', createdAt: start, updatedAt: start, ...over })
      }
      const volume = indice === 20 ? 200 : intero(6, 70)
      for (let volta = 0; volta < volume; volta += 1) {
        const taglia = TAGLIE[intero(0, 2)]
        const giorniFa = 0.1 + caso() * 29.6
        visita(taglia, giorniFa)
        lavaggi[taglia] += 1
        if (ADESSO - giorniFa * GIORNO >= inizioMese.getTime()) incassi += 30
      }
      // Niente di questo deve contare come lavaggio.
      for (const taglia of TAGLIE) {
        visita(taglia, 31)
        visita(taglia, 45)
        visita(taglia, 3, { status: 'disdetto', cancelReason: 'salone' })
        visita(taglia, 3, { status: 'non_venuto' })
        visita(taglia, -3, { status: 'programmato' })
        visita(taglia, 4, { kind: 'personale', title: 'Pausa' })
        visita(taglia, 5, { total: 0 }, { id: 'soloUnghie', name: 'Solo unghie' })
        visita(taglia, 6, { total: 0 }, extra)
      }
      await lotto.commit()
      const prodotti = prodottiDi(indice === 19)
      for (const [id, prodotto] of Object.entries(prodotti)) await root.collection('prodotti').doc(id).set(prodotto)
    }
    attesi.push({ indice, uid, email, livello, lavaggi, incassi, prodotti: vuoto ? 0 : Object.keys(CATEGORIE_ATTESE).length })
  }
  writeFileSync(FILE_ATTESO, JSON.stringify({ adesso: ADESSO, saloni: attesi }, null, 2))
  console.log('SEMINATI', attesi.length)
}

const errori: string[] = []
let controlli = 0
function uguale(cosa: string, ottenuto: unknown, atteso: unknown): void {
  controlli += 1
  if (JSON.stringify(ottenuto) !== JSON.stringify(atteso)) errori.push(`${cosa}: ${JSON.stringify(ottenuto)} invece di ${JSON.stringify(atteso)}`)
}
function vicino(cosa: string, ottenuto: number | undefined, atteso: number): void {
  controlli += 1
  if (ottenuto === undefined || Math.abs(ottenuto - atteso) > 0.001) errori.push(`${cosa}: ${ottenuto} invece di ${atteso}`)
}

/** Conti rifatti a mano, senza passare dal codice dell'app. */
function giorniAttesi(pezzi: number, contenutoMl: number, ml: Record<DogSize, number>, lavaggi: Record<DogSize, number>): number | null {
  const mese = lavaggi.piccola * ml.piccola + lavaggi.media * ml.media + lavaggi.grande * ml.grande
  return mese === 0 ? null : (pezzi * contenutoMl) / (mese / 30)
}

async function controlla(): Promise<void> {
  const { saloni, adesso: seminato } = JSON.parse(readFileSync(FILE_ATTESO, 'utf8')) as { saloni: Atteso[]; adesso: number }
  // Stessa ora della semina: le visite vicine ai 30 giorni non devono uscire dalla finestra mentre il test gira.
  const adesso = new Date(seminato)
  const riassunto: unknown[] = []
  const conStimaAccesa: number[] = []
  const conStimaSpenta: number[] = []
  for (const salone of saloni) {
    const nome = `salone ${salone.indice}`
    const root = db.doc(`salons/${salone.uid}`)
    const [prodottiSnap, visiteSnap, caniSnap, serviziSnap] = await Promise.all(['prodotti', 'appointments', 'dogs', 'services'].map((collezione) => root.collection(collezione).get()))
    const grezzi = new Map(prodottiSnap.docs.map((item) => [item.id, item.data()]))
    const prodotti = prodottiSnap.docs.flatMap((item) => { const letto = prodottoDaDoc(item.id, item.data()); return letto ? [letto] : [] })
    const visite = visiteSnap.docs.map((item) => appointmentFromDoc(item.id, item.data()))
    const cani = caniSnap.docs.map((item) => dogFromDoc(item.id, item.data()))
    const servizi = serviziSnap.docs.map((item) => serviceFromDoc(item.id, item.data()))
    const acceso = salone.livello !== 'go'
    const per = (id: string): Prodotto | undefined => prodotti.find((item) => item.id === id)

    uguale(`${nome}: nessun prodotto sparisce`, prodotti.length, salone.prodotti)
    const lavaggi = lavaggiRecenti(visite, cani, servizi, adesso)
    uguale(`${nome}: lavaggi per taglia`, lavaggi, salone.lavaggi)
    if (salone.prodotti === 0) {
      uguale(`${nome}: da ordinare vuoto`, daOrdinare(prodotti, sottoStima(prodotti, lavaggi)), [])
      continue
    }
    uguale(`${nome}: nessuna scrittura in lettura`, ['vecchioShampoo', 'vecchioProfumo', 'vecchiaLama', 'ignoto'].map((id) => grezzi.get(id)?.categoria), ['shampoo', 'profumi', 'altro', 'cibo'])
    uguale(`${nome}: uso assente nei vecchi`, 'uso' in (grezzi.get('vecchioShampoo') ?? {}), false)
    for (const [id, categoria] of Object.entries(CATEGORIE_ATTESE)) uguale(`${nome}: categoria di ${id}`, per(id)?.categoria, categoria)

    // Filtri Salone e Vendita.
    const conto = (filtro: FiltroProdotti) => filtraProdotti(prodotti, '', filtro, new Set(), adesso).map((item) => item.id).sort()
    uguale(`${nome}: Tutti`, conto('tutti').length, salone.prodotti)
    uguale(`${nome}: Vendita`, conto('vendita'), ['banco'])
    uguale(`${nome}: Cura senza il venduto`, conto('cura'), [])
    uguale(`${nome}: Altro`, conto('varie'), ['ignoto'])
    const categorie: FiltroProdotti[] = ['lavaggio', 'finitura', 'cura', 'macchinette', 'pulizia', 'tocchi', 'varie']
    uguale(`${nome}: salone + vendita = tutti`, categorie.reduce((somma, filtro) => somma + conto(filtro).length, 0) + conto('vendita').length, salone.prodotti)

    // Scadenze.
    uguale(`${nome}: da buttare`, prodotti.filter((item) => daButtare(item, adesso)).map((item) => item.id), ['scaduto'])

    // Stime contro i conti a mano.
    const tanica = giorniAttesi(3, 500, SHAMPOO, salone.lavaggi)
    const profumo = giorniAttesi(2, 30, PROFUMO, salone.lavaggi)
    const stimaTanica = stimaProdotto(per('tanica') as Prodotto, lavaggi)
    const stimaProfumo = stimaProdotto(per('profumo') as Prodotto, lavaggi)
    if (tanica === null || profumo === null) errori.push(`${nome}: nessun lavaggio seminato`)
    else {
      vicino(`${nome}: durata tanica`, stimaTanica?.giorni, tanica)
      vicino(`${nome}: durata profumo`, stimaProfumo?.giorni, profumo)
    }
    uguale(`${nome}: niente stima senza consumo`, stimaProdotto(per('vecchioShampoo') as Prodotto, lavaggi), null)
    uguale(`${nome}: niente stima per il venduto`, stimaProdotto({ ...(per('tanica') as Prodotto), uso: 'vendita' }, lavaggi), null)
    vicino(`${nome}: costo a cane`, costoLavaggio(per('tanica') as Prodotto) ?? undefined, (40 / 500) * 30)

    // Da ordinare: la lista di oggi, più la stima solo con il piano.
    const base = ['vecchiaLama', 'vecchioProfumo']
    const perStima = [...(tanica !== null && tanica < 10 ? ['tanica'] : []), ...(profumo !== null && profumo < 12 ? ['profumo'] : [])]
    const sotto = acceso ? sottoStima(prodotti, lavaggi) : new Set<string>()
    uguale(`${nome}: da ordinare`, daOrdinare(prodotti, sotto).map((item) => item.id).sort(), [...base, ...(acceso ? perStima : [])].sort())
    if (perStima.length > 0) (acceso ? conStimaAccesa : conStimaSpenta).push(salone.indice)
    uguale(`${nome}: in arrivo non si riordina`, daOrdinare(prodotti, sotto).some((item) => item.id === 'inArrivo'), false)

    // Riepilogo.
    const incassi = incassiMese(visite, adesso)
    uguale(`${nome}: incassi del mese`, incassi, salone.incassi)
    const riepilogo = riepilogoMagazzino(prodotti, incassi, adesso)
    vicino(`${nome}: valore`, riepilogo?.valore, 3 * 40 + 2 * 12 + 6 * 10)
    vicino(`${nome}: spesa del mese`, riepilogo?.spesaMese, 30)
    uguale(`${nome}: incidenza`, riepilogo?.incidenza ?? null, salone.incassi > 0 ? 30 / salone.incassi : null)

    // Backup e registro: i prodotti ci sono tutti, con il formato nuovo.
    const mappa = prodottiToLocalMap(prodotti)
    const dati = { versioneFormato: 1, dogs: {}, appointments: {}, services: {}, settings: {}, closures: {}, prodotti: mappa, files: {}, deletedDogs: { ids: [], appointmentIds: [], storicoIds: [] }, codiciCane: { next: 1, cartella: 'cani', byId: {} }, fotoMancanti: [] } as unknown as GroomlyDati
    uguale(`${nome}: righe del registro`, costruisciRegistro(dati, adesso).prodotti.length, salone.prodotti)
    const riletto = JSON.parse(canonicalJson(dati)).prodotti as Record<string, Record<string, unknown>>
    uguale(`${nome}: il backup rilegge lo stesso prodotto`, prodottoDaDoc('tanica', riletto.tanica)?.mlPerCane, SHAMPOO)

    riassunto.push({ salone: salone.indice, piano: salone.livello, lavaggi: salone.lavaggi, tanicaGiorni: tanica === null ? null : Math.round(tanica), profumoGiorni: profumo === null ? null : Math.round(profumo), daOrdinare: daOrdinare(prodotti, sotto).length })
  }
  // Il controllo non vale se nessun salone arriva davvero sotto la soglia.
  if (conStimaAccesa.length === 0 || conStimaSpenta.length === 0) errori.push(`soglia mai raggiunta: acceso ${conStimaAccesa.length}, spento ${conStimaSpenta.length}`)
  console.log('Sotto la soglia con il piano:', conStimaAccesa.join(), '· in Go, senza effetto:', conStimaSpenta.join())
  writeFileSync(join(cartella, 'esito.json'), JSON.stringify({ controlli, errori, riassunto, conStimaAccesa, conStimaSpenta }, null, 2))
  console.table(riassunto)
  console.log(`CONTROLLI ${controlli}, ERRORI ${errori.length}`)
  for (const errore of errori.slice(0, 30)) console.log(' -', errore)
  if (errori.length > 0) process.exit(1)
}

async function pulisci(): Promise<void> {
  const { saloni } = JSON.parse(readFileSync(FILE_ATTESO, 'utf8')) as { saloni: Atteso[] }
  for (const salone of saloni) {
    await db.recursiveDelete(db.doc(`salons/${salone.uid}`))
    await db.recursiveDelete(db.doc(`accounts/${salone.uid}`))
    await auth.deleteUser(salone.uid)
  }
  const restano = (await auth.listUsers()).users.filter((utente) => utente.email?.startsWith('mag360-'))
  const salonsRestanti = await Promise.all(saloni.map((salone) => db.doc(`salons/${salone.uid}`).listCollections()))
  console.log(`PULITI ${saloni.length}, utenti rimasti ${restano.length}, sottocollezioni rimaste ${salonsRestanti.flat().length}`)
  if (restano.length > 0 || salonsRestanti.flat().length > 0) process.exit(1)
}

const azioni: Record<string, () => Promise<void>> = { semina, controlla, pulisci }
const scelta = azioni[azione]
if (!scelta) throw new Error('Azione sconosciuta')
scelta().then(() => process.exit(0)).catch((errore) => { console.error(errore); process.exit(1) })
