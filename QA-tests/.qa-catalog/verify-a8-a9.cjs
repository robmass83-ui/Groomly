// Verifica A8+A9 (solo emulatore): elimina l'account del titolare di un Salone di prova chiamando eliminaAccountPer compilata
// e controlla resti e account di soci/collaboratori. Uso: node QA-tests/.qa-catalog/verify-a8-a9.cjs <email-titolare>
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore(); const auth = getAuth()
const { eliminaAccountPer } = req('./lib/functions/src/piano/eliminaAccount.js')
;(async () => {
  const email = process.argv[2]
  const uid = (await auth.getUserByEmail(email)).uid
  const membri = (await db.collection(`salons/${uid}/members`).get()).docs.map((d) => d.data()).filter((m) => m.uid !== uid)
  // resti da controllare: pagina pubblica, invito, contatore email, telefono con una consegna push
  await db.doc('pubblici/qa-a8-salone').set({ salonId: uid })
  await db.doc('invites/qa-a8-invito').set({ salonId: uid, email: 'nuovo@test.groomly', status: 'aperto' })
  await db.doc(`emailRateLimits/${email.toLowerCase()}`).set({ n: 1 })
  await db.doc(`accounts/${uid}/devices/qa-tel-a8`).set({ token: 'x' })
  await db.doc('pushDeliveries/qa-tel-a8__updates__abc').set({ at: 1 })
  await eliminaAccountPer(uid)
  const esiste = async (p) => (await db.doc(p).get()).exists
  const out = {
    titolare: email,
    salonePresente: (await db.collection(`salons/${uid}/appointments`).limit(1).get()).size > 0 || await esiste(`salons/${uid}/settings/main`),
    paginaPubblica: await esiste('pubblici/qa-a8-salone'),
    invito: await esiste('invites/qa-a8-invito'),
    contatoreEmail: await esiste(`emailRateLimits/${email.toLowerCase()}`),
    consegnaPush: await esiste('pushDeliveries/qa-tel-a8__updates__abc'),
    accountTitolare: await esiste(`accounts/${uid}`),
    accessoTitolare: await auth.getUser(uid).then(() => true, () => false),
    membri: [],
  }
  for (const m of membri) {
    const acc = (await db.doc(`accounts/${m.uid}`).get()).data() ?? null
    out.membri.push({ email: m.email, ruoloPrima: m.role, account: acc && { salonId: acc.salonId === m.uid ? '<proprio>' : acc.salonId, role: acc.role }, accesso: await auth.getUser(m.uid).then(() => true, () => false) })
  }
  console.log(JSON.stringify(out, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
