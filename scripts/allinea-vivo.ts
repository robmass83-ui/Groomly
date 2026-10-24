import { createRequire } from 'node:module'
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  cancellaConsentita,
  eseguiCopia,
  percorsiUguali,
  scrittureAccount,
  troddioniValido,
  insiemeCancellazione,
  type ElencoPronto,
} from '../src/lib/allineaLaura.ts'

const require = createRequire(import.meta.url)
const admin = require('../functions/node_modules/firebase-admin')
const firebaseApi = require('C:/Users/masal/AppData/Roaming/npm/node_modules/firebase-tools/lib/api.js')

const LAURA_EMAIL = 'laura.masala@tiscali.it'
const ROBERTO_EMAIL = 'masala.roberto@hotmail.it'
const TRODDIONI_EMAIL = 'robmass83@gmail.com'
const PROJECT = 'groomly-3128b'

type DocMap = Map<string, Record<string, unknown>>

function db() {
  return admin.firestore()
}

function init(): void {
  if (admin.apps.length > 0) return
  const config = JSON.parse(readFileSync('C:/Users/masal/.config/configstore/firebase-tools.json', 'utf8')) as {
    tokens: { refresh_token: string }
  }
  const file = join(tmpdir(), 'groomly-allinea-adc.json')
  writeFileSync(file, JSON.stringify({
    type: 'authorized_user',
    client_id: firebaseApi.clientId(),
    client_secret: firebaseApi.clientSecret(),
    refresh_token: config.tokens.refresh_token,
  }))
  process.env.GOOGLE_APPLICATION_CREDENTIALS = file
  admin.initializeApp({
    projectId: PROJECT,
    credential: admin.credential.applicationDefault(),
  })
}

function encode(value: unknown): unknown {
  if (value == null) return value
  if (value instanceof admin.firestore.Timestamp) {
    return { __t: 'ts', s: value.seconds, n: value.nanoseconds }
  }
  if (Buffer.isBuffer(value)) return { __t: 'bytes', b: value.toString('base64') }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __t: 'geo', lat: value.latitude, lng: value.longitude }
  }
  if (value instanceof admin.firestore.DocumentReference) return { __t: 'ref', p: value.path }
  if (Array.isArray(value)) return value.map(encode)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = encode(item)
    return out
  }
  return value
}

async function walk(path: string, into: DocMap): Promise<void> {
  const ref = db().doc(path)
  const snap = await ref.get()
  if (snap.exists) into.set(path, snap.data() as Record<string, unknown>)
  const collections = await ref.listCollections()
  for (const collection of collections) {
    const page = await collection.get()
    for (const doc of page.docs) {
      await walk(`${path}/${collection.id}/${doc.id}`, into)
    }
  }
}

async function listSalonIds(): Promise<string[]> {
  const refs = await db().collection('salons').listDocuments()
  return refs.map((ref) => ref.id).sort()
}

async function listAuth(): Promise<{ uid: string; email: string; emailVerified: boolean }[]> {
  const found: { uid: string; email: string; emailVerified: boolean }[] = []
  let page = await admin.auth().listUsers(1000)
  found.push(...page.users.map(userRow))
  while (page.pageToken) {
    page = await admin.auth().listUsers(1000, page.pageToken)
    found.push(...page.users.map(userRow))
  }
  return found
}

function userRow(user: { uid: string; email?: string; emailVerified: boolean }) {
  return { uid: user.uid, email: (user.email ?? '').trim().toLowerCase(), emailVerified: user.emailVerified }
}

function byEmail(users: { uid: string; email: string; emailVerified: boolean }[], email: string) {
  const found = users.filter((user) => user.email === email)
  if (found.length !== 1) throw new Error(`Accesso ${email}: trovati ${found.length}`)
  return found[0]
}

async function businessName(salonId: string): Promise<string> {
  if (!salonId || salonId.includes('/')) return ''
  const path = salonId === 'shared' ? 'salon/shared/settings/main' : `salons/${salonId}/settings/main`
  const snap = await db().doc(path).get()
  const business = snap.exists ? (snap.data()?.business as { name?: unknown } | undefined) : undefined
  return typeof business?.name === 'string' ? business.name : ''
}

async function quadro() {
  init()
  const users = await listAuth()
  const laura = byEmail(users, LAURA_EMAIL)
  const roberto = byEmail(users, ROBERTO_EMAIL)
  const troddioni = byEmail(users, TRODDIONI_EMAIL)
  const lauraAccount = (await db().doc(`accounts/${laura.uid}`).get()).data() ?? {}
  const robertoAccount = (await db().doc(`accounts/${roberto.uid}`).get()).data() ?? {}
  const troddioniAccount = (await db().doc(`accounts/${troddioni.uid}`).get()).data() ?? {}
  const troddioniSalonId = typeof troddioniAccount.salonId === 'string' ? troddioniAccount.salonId : ''
  const nome = await businessName(troddioniSalonId)
  const ok = troddioniValido({ salonId: troddioniSalonId, lauraUid: laura.uid, businessName: nome })
  const salonIds = await listSalonIds()
  return { users, laura, roberto, troddioni, lauraAccount, robertoAccount, troddioniAccount, troddioniSalonId, nome, ok, salonIds }
}

function elencoDa(state: Awaited<ReturnType<typeof quadro>>) {
  return insiemeCancellazione({
    authUids: state.users.map((user) => ({ uid: user.uid, email: user.email })),
    salonIds: state.salonIds,
    lauraUid: state.laura.uid,
    robertoUid: state.roberto.uid,
    troddioniUid: state.troddioni.uid,
    troddioniSalonId: state.troddioniSalonId,
    troddioniOk: state.ok,
  })
}

async function writeJsonl(file: string, docs: DocMap): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(file)
    stream.on('error', reject)
    stream.on('finish', resolve)
    for (const [path, data] of docs) {
      stream.write(JSON.stringify({ path, data: encode(data) }) + '\n')
    }
    stream.end()
  })
}

async function backup(dir: string): Promise<void> {
  init()
  mkdirSync(dir, { recursive: true })
  const state = await quadro()
  const shared = new Map<string, Record<string, unknown>>()
  await walk('salon/shared', shared)
  await writeJsonl(join(dir, 'salon-shared.jsonl'), shared)
  const ready = elencoDa(state)
  writeFileSync(join(dir, 'quadro.json'), JSON.stringify({
    lauraUid: state.laura.uid,
    robertoUid: state.roberto.uid,
    troddioniUid: state.troddioni.uid,
    troddioniSalonId: state.troddioniSalonId,
    troddioniName: state.nome,
    troddioniOk: state.ok,
    sharedDocs: shared.size,
    salonIds: state.salonIds,
    elenco: ready,
  }, null, 2))
  if (!ready) {
    console.log('Backup di shared scritto. La cancellazione non parte: Troddioni non torna, gli altri alberi non si archiviano.')
    return
  }
  for (const salonId of ready.salonIds) {
    const tree = new Map<string, Record<string, unknown>>()
    await walk(`salons/${salonId}`, tree)
    await writeJsonl(join(dir, `salon-${salonId}.jsonl`), tree)
  }
  for (const uid of ready.uids) {
    const userTree = new Map<string, Record<string, unknown>>()
    await walk(`users/${uid}`, userTree)
    await writeJsonl(join(dir, `users-${uid}.jsonl`), userTree)
    const accountTree = new Map<string, Record<string, unknown>>()
    await walk(`accounts/${uid}`, accountTree)
    await writeJsonl(join(dir, `accounts-${uid}.jsonl`), accountTree)
  }
  const invites = await db().collection('invites').get()
  const inviteDocs = new Map<string, Record<string, unknown>>()
  for (const doc of invites.docs) {
    if (ready.salonIds.includes(String(doc.data().salonId ?? ''))) {
      inviteDocs.set(doc.ref.path, doc.data())
    }
  }
  await writeJsonl(join(dir, 'invites.jsonl'), inviteDocs)
  console.log(`Backup in ${dir}. shared=${shared.size} saloni=${ready.salonIds.length} account=${ready.uids.length}`)
}

async function copia(): Promise<void> {
  init()
  const state = await quadro()
  const origine = new Map<string, Record<string, unknown>>()
  await walk('salon/shared', origine)
  const destinazione = new Map<string, Record<string, unknown>>()
  await walk(`salons/${state.laura.uid}`, destinazione)
  const esito = eseguiCopia(origine, destinazione, state.laura.uid)
  if (!esito.ok) {
    console.log(`Copia ferma: ${esito.reason}. Nessuna scrittura.`)
    process.exitCode = 2
    return
  }
  let batch = db().batch()
  let ops = 0
  let bytes = 0
  const flush = async () => {
    if (ops === 0) return
    await batch.commit()
    batch = db().batch()
    ops = 0
    bytes = 0
  }
  for (const [path, data] of esito.destinazione) {
    const size = Buffer.byteLength(JSON.stringify(encode(data)))
    if (ops > 0 && (ops >= 80 || bytes + size > 6_000_000)) await flush()
    batch.set(db().doc(path), data)
    ops += 1
    bytes += size
  }
  await flush()
  const riletta = new Map<string, Record<string, unknown>>()
  await walk(`salons/${state.laura.uid}`, riletta)
  const origineChiavi = [...origine.keys()]
  const destChiavi = [...riletta.keys()].filter((path) => path.startsWith(`salons/${state.laura.uid}/`))
  const attese = [...esito.destinazione.keys()]
  if (!percorsiUguali(origineChiavi, attese) || !stessiInsiemi(attese, destChiavi)) {
    console.log('Confronto percorsi fallito. Gli account non si puntano.')
    process.exitCode = 3
    return
  }
  for (const path of attese) {
    const relativo = path.slice(`salons/${state.laura.uid}/`.length)
    const prima = origine.get(`salon/shared/${relativo}`)
    const dopo = riletta.get(path)
    if (JSON.stringify(encode(prima)) !== JSON.stringify(encode(dopo))) {
      console.log(`Contenuto diverso: ${relativo}`)
      process.exitCode = 3
      return
    }
  }
  console.log(`Copia verificata. Documenti=${attese.length}`)
}

function stessiInsiemi(a: string[], b: string[]): boolean {
  const left = [...a].sort()
  const right = [...b].sort()
  return left.length === right.length && left.every((value, index) => value === right[index])
}

async function punta(): Promise<void> {
  init()
  const state = await quadro()
  const scritto = scrittureAccount({
    lauraUid: state.laura.uid,
    robertoUid: state.roberto.uid,
    lauraVerified: state.laura.emailVerified,
    robertoVerified: state.roberto.emailVerified,
    laura: nomeAccount(state.lauraAccount, state.laura.email),
    roberto: nomeAccount(state.robertoAccount, state.roberto.email),
  })
  const now = new Date().toISOString()
  await db().doc(`accounts/${state.laura.uid}`).set({
    email: scritto.laura.email,
    firstName: scritto.laura.firstName,
    lastName: scritto.laura.lastName,
    salonId: scritto.laura.salonId,
    role: scritto.laura.role,
    legacy: scritto.laura.legacy,
  }, { merge: true })
  await db().doc(`accounts/${state.roberto.uid}`).set({
    email: scritto.roberto.email,
    firstName: scritto.roberto.firstName,
    lastName: scritto.roberto.lastName,
    salonId: scritto.roberto.salonId,
    role: scritto.roberto.role,
    legacy: scritto.roberto.legacy,
  }, { merge: true })
  await db().doc(`salons/${state.laura.uid}/members/${state.laura.uid}`).set(scritto.membroLaura)
  await db().doc(`salons/${state.laura.uid}/members/${state.roberto.uid}`).set(scritto.membroRoberto)
  await db().doc(`salons/${state.laura.uid}/pro/main`).set({ ...scritto.pro, updatedAt: now }, { merge: true })
  console.log(`Puntati. Laura legacy=${scritto.laura.legacy} Roberto legacy=${scritto.roberto.legacy} salon=${state.laura.uid}`)
}

function nomeAccount(data: Record<string, unknown>, email: string) {
  return {
    firstName: typeof data.firstName === 'string' ? data.firstName : '',
    lastName: typeof data.lastName === 'string' ? data.lastName : '',
    email,
  }
}

async function elenco(dir: string): Promise<void> {
  init()
  mkdirSync(dir, { recursive: true })
  const state = await quadro()
  const ready = elencoDa(state)
  if (!ready) {
    console.log('Elenco non pronto. Cancellazione non consentita.')
    writeFileSync(join(dir, 'elenco.json'), JSON.stringify({ ready: null }, null, 2))
    process.exitCode = 4
    return
  }
  const payload = {
    ready,
    emails: state.users.filter((user) => ready.uids.includes(user.uid)).map((user) => ({ uid: user.uid, email: user.email })),
  }
  writeFileSync(join(dir, 'elenco.json'), JSON.stringify(payload, null, 2))
  console.log('Uid da cancellare:')
  for (const row of payload.emails) console.log(`- ${row.uid} ${row.email}`)
  console.log('Saloni da cancellare:')
  for (const id of ready.salonIds) console.log(`- ${id}`)
  console.log(`Impronta ${ready.fingerprint}`)
}

async function cancella(dir: string): Promise<void> {
  init()
  const saved = JSON.parse(readFileSync(join(dir, 'elenco.json'), 'utf8')) as { ready: ElencoPronto }
  const state = await quadro()
  const ready = elencoDa(state)
  if (!ready || !cancellaConsentita(saved.ready.fingerprint, ready) || !stessiInsiemi(saved.ready.salonIds, ready.salonIds) || !stessiInsiemi(saved.ready.uids, ready.uids)) {
    console.log('Impronta o elenco saloni diverso. Nessuna cancellazione.')
    process.exitCode = 5
    return
  }
  const vietatiSalon = new Set([state.laura.uid, state.troddioniSalonId, 'shared'])
  const vietatiUid = new Set([state.laura.uid, state.roberto.uid, state.troddioni.uid])
  for (const salonId of ready.salonIds) {
    if (vietatiSalon.has(salonId) || salonId.includes('/')) throw new Error(`Salone protetto: ${salonId}`)
    await db().recursiveDelete(db().doc(`salons/${salonId}`))
    const invites = await db().collection('invites').where('salonId', '==', salonId).get()
    for (const doc of invites.docs) await doc.ref.delete()
  }
  for (const uid of ready.uids) {
    if (vietatiUid.has(uid)) throw new Error(`Accesso protetto: ${uid}`)
    await db().recursiveDelete(db().doc(`users/${uid}`))
    await db().recursiveDelete(db().doc(`accounts/${uid}`))
    await admin.auth().deleteUser(uid)
  }
  console.log(`Cancellati account=${ready.uids.length} saloni=${ready.salonIds.length}`)
}

async function main(): Promise<void> {
  const comando = process.argv[2]
  const dir = process.argv[3]
  if (comando === 'inventario') {
    init()
    const state = await quadro()
    const shared = new Map<string, Record<string, unknown>>()
    await walk('salon/shared', shared)
    const dest = new Map<string, Record<string, unknown>>()
    await walk(`salons/${state.laura.uid}`, dest)
    console.log(JSON.stringify({
      lauraUid: state.laura.uid,
      lauraVerified: state.laura.emailVerified,
      lauraSalon: state.lauraAccount.salonId,
      robertoUid: state.roberto.uid,
      robertoVerified: state.roberto.emailVerified,
      robertoSalon: state.robertoAccount.salonId,
      troddioniUid: state.troddioni.uid,
      troddioniSalonId: state.troddioniSalonId,
      troddioniName: state.nome,
      troddioniOk: state.ok,
      auth: state.users.length,
      salons: state.salonIds,
      sharedDocs: shared.size,
      destDocs: dest.size,
    }, null, 2))
    return
  }
  if (comando === 'copia') return copia()
  if (comando === 'punta') return punta()
  if (!dir) throw new Error('Manca la cartella')
  if (comando === 'backup') return backup(dir)
  if (comando === 'elenco') return elenco(dir)
  if (comando === 'cancella') return cancella(dir)
  throw new Error(`Comando sconosciuto: ${comando}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
