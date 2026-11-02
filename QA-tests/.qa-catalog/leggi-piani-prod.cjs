// Solo lettura: elenca i piani (salons/*/pro/main) in produzione e quali chiuderebbe chiudiProve.
const fs = require('fs'), os = require('os'), path = require('path')
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'))
const PROJECT = 'groomly-3128b'
;(async () => {
  const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }) })).json()
  if (!tok.access_token) throw new Error('token: ' + JSON.stringify(tok))
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'pro', allDescendants: true }] } }) })
  const righe = await res.json()
  if (!Array.isArray(righe)) throw new Error(JSON.stringify(righe))
  const v = (f) => f == null ? undefined : ('stringValue' in f ? f.stringValue : 'booleanValue' in f ? f.booleanValue : 'nullValue' in f ? null : 'integerValue' in f ? Number(f.integerValue) : '?')
  const adesso = Date.now()
  for (const r of righe) {
    if (!r.document) continue
    const nome = r.document.name.split('/documents/')[1]
    if (!nome.endsWith('/pro/main')) continue
    const f = r.document.fields || {}
    const stato = v(f.stato), scade = v(f.scadeIl)
    const t = typeof scade === 'string' ? new Date(scade).getTime() : NaN
    const chiude = ['attivo', 'prova', 'grazia', 'disdetto'].includes(stato) && !Number.isNaN(t) && t <= adesso
    console.log([nome.split('/')[1], 'piano=' + v(f.piano), 'stato=' + stato, 'fonte=' + v(f.fonte), 'scadeIl=' + scade, 'enabled=' + v(f.enabled), chiude ? '=> CHIUDEREBBE' : ''].join('  '))
  }
})().catch((e) => { console.error(e.message); process.exit(1) })
