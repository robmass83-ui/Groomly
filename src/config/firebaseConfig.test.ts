import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

describe('configurazione Firebase', () => {
  it('firebase.json non pubblica Storage e storage.rules non esiste', () => {
    const config = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8')) as Record<string, unknown>
    expect(config.storage).toBeUndefined()
    expect(existsSync(resolve(root, 'storage.rules'))).toBe(false)
  })

  it('le regole mettono i tetti a files', () => {
    const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8')
    expect(rules).toContain('match /salon/shared/files/{fileId}')
    expect(rules).toContain('thumb.size() < 25000')
    expect(rules).toContain('dati.size() <= 716800')
    expect(rules).toContain('dati.size() <= 614400')
    expect(rules).toContain('function salonKindWritable(kind)')
    expect(rules).toContain("kind == 'services'")
    expect(rules).toContain("kind == 'closures'")
    expect(rules).toContain("kind == 'settings'")
    expect(rules).toContain("kind == 'meta'")
    expect(rules).toContain("kind == 'deletedDogs'")
    expect(rules).not.toContain("kind != 'files'")
    expect(rules).not.toContain('match /salon/{document=**}')
    expect(rules).toContain('match /emailRateLimits/{id}')
    expect(rules).toContain('allow read, write: if false;')
  })

  it('la pagina azione sta su groomlyapp.it e non cita firebaseapp.com', () => {
    const hosting = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8')) as {
      hosting?: { rewrites?: { source: string; destination?: string; function?: { functionId: string; region: string } }[] }
    }
    expect(hosting.hosting?.rewrites).toEqual([
      { source: '/azione', destination: '/azione/index.html' },
      { source: '/s/pagina.js', destination: '/s/pagina.js' },
      { source: '/s/**', function: { functionId: 'paginaPubblica', region: 'europe-west1' } },
    ])
    const page = readFileSync(resolve(root, 'hosting/azione/index.html'), 'utf8')
    const home = readFileSync(resolve(root, 'hosting/index.html'), 'utf8')
    expect(page).not.toContain('firebaseapp.com')
    expect(page).toContain('https://groomlyapp.it/azione')
    expect(page).toContain('Il link è scaduto o è già stato usato. Richiedine uno nuovo dall’app.')
    expect(page).toContain('Password aggiornata! Ora puoi accedere all’app Groomly.')
    expect(page).toContain('Email confermata! Ora puoi tornare all’app Groomly.')
    expect(page).toContain('#2E7FB0')
    expect(page).toContain('#8ADBD9')
    expect(page).toContain('groomly-logo-orizzontale.svg')
    expect(page).not.toContain('non scarica')
    expect(page).not.toContain('groomly.apk')
    expect(JSON.stringify(hosting)).not.toContain('Content-Disposition')
    expect(page).not.toContain('#2f4ec2')
    expect(home).toContain('privacy.html')
    expect(home).toContain('groomly-logo-orizzontale.svg')
    expect(home).toContain('info@groomlyapp.it')
    expect(home).not.toContain('robmass83@gmail.com')
    expect(home).not.toContain('firebaseapp.com')
    const privacy = readFileSync(resolve(root, 'hosting/privacy.html'), 'utf8')
    expect(privacy).toContain('info@groomlyapp.it')
    expect(privacy).not.toContain('robmass83@gmail.com')
    expect(privacy).toContain('drive.file')
    expect(privacy).toContain('Firebase Authentication')
    expect(privacy).toContain('Cloud Firestore')
    expect(privacy).not.toContain('firebaseapp.com')
  })

  it('il sito non offre mai l’APK: l’aggiornamento arriva dalla release GitHub', () => {
    const config = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8')) as { hosting: { ignore: string[] } }
    expect(config.hosting.ignore).toContain('**/*.apk')
    const release = JSON.parse(readFileSync(resolve(root, 'hosting/release.json'), 'utf8')) as { version: string; url: string }
    expect(release.url).toBe(`https://github.com/robmass83-ui/Groomly/releases/download/v${release.version}/groomly.apk`)
    for (const pagina of ['index.html', 'privacy.html', 'privacy/index.html', 'termini/index.html', 'dpa/index.html', 'elimina-account/index.html', 'azione/index.html', 'c/index.html', 'salone/index.html', 'lingua-pagina.js']) {
      expect(readFileSync(resolve(root, 'hosting', pagina), 'utf8')).not.toMatch(/\.apk/i)
    }
  })

  it('pro.stato è un indice di campo per la collection group, non un composito da un solo campo', () => {
    const file = JSON.parse(readFileSync(resolve(root, 'firestore.indexes.json'), 'utf8')) as {
      indexes: { collectionGroup: string; fields: unknown[] }[]
      fieldOverrides: { collectionGroup: string; fieldPath: string; indexes: { order?: string; queryScope: string }[] }[]
    }
    expect(file.indexes.filter((index) => index.collectionGroup === 'pro')).toEqual([])
    const override = file.fieldOverrides.find((item) => item.collectionGroup === 'pro' && item.fieldPath === 'stato')
    expect(override?.indexes).toEqual(expect.arrayContaining([
      { order: 'ASCENDING', queryScope: 'COLLECTION' },
      { order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' },
    ]))
    const token = file.fieldOverrides.find((item) => item.collectionGroup === 'devices' && item.fieldPath === 'token')
    expect(token?.indexes).toEqual(expect.arrayContaining([
      { order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' },
    ]))
  })

  it('solo il backup importa firebase/storage', () => {
    const client = readFileSync(resolve(root, 'src/data/firebase/client.ts'), 'utf8')
    const uses = client.split('\n').filter((line) => line.includes("import('firebase/storage')"))
    expect(uses.length).toBeLessThanOrEqual(2)
    expect(client).not.toContain('uploadDataUrl')
  })
})
