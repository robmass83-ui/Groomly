// Si carica con NODE_OPTIONS=--require dentro il runtime delle functions in emulatore.
// Ogni chiamata a Brevo finisce in un file e nessuna email lascia la macchina.
const fs = require('fs')
const file = process.env.BREVO_FINTO_FILE
const vero = globalThis.fetch
globalThis.fetch = async (url, init) => {
  const u = String(url && url.url ? url.url : url)
  if (u.includes('brevo.com') || u.includes('sendinblue')) {
    if (file) fs.appendFileSync(file, JSON.stringify({ url: u, body: init && init.body ? JSON.parse(init.body) : null, quando: Date.now() }) + '\n')
    return new Response(JSON.stringify({ messageId: 'finto' }), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  if (/fcm\.googleapis\.com|googleapis\.com\/oauth2/.test(u)) return new Response('{}', { status: 200 })
  return vero(url, init)
}

// La credenziale finta di functions/src/index.ts non basta a getFirestore(): in emulatore serve una credenziale vera nella forma.
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  const Modulo = require('module')
  const carica = Modulo._load
  Modulo._load = function (nome, ...resto) {
    const mod = carica.call(this, nome, ...resto)
    if (nome !== 'firebase-admin/app' || mod.__lingue) return mod
    const { privateKey } = require('crypto').generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
    const finto = { ...mod, __lingue: true, initializeApp: (opzioni, ...altro) => mod.initializeApp({ ...opzioni, credential: mod.cert({ projectId: 'demo-groomly', clientEmail: 'lingue@demo-groomly.iam.gserviceaccount.com', privateKey }) }, ...altro) }
    return finto
  }
}
