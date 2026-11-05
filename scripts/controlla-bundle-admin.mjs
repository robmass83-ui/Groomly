import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Dopo `npm run build:admin`: nel sito admin non devono finire plugin nativi né pagine del salone.
const CARTELLA = 'dist-admin'
const VIETATI = [
  'capacitor-firebase',
  'FirebaseCrashlytics',
  'FirebaseAnalytics',
  'local-notifications',
  'push-notifications',
  'purchases-capacitor',
  'RevenueCatUI',
  '@capacitor/camera',
  '@capacitor/filesystem',
  '@capacitor/share',
  '@capacitor/browser',
  '@capacitor/file-viewer',
  'CapacitorFilesystem',
  'LocalNotifications.schedule',
  '/listino/gestione',
  '/incassi/report',
  '/impostazioni/abbonamento',
]

function file(cartella) {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome)
    return statSync(percorso).isDirectory() ? file(percorso) : [percorso]
  })
}

const trovati = file(CARTELLA)
  .filter((percorso) => /\.(js|html)$/.test(percorso))
  .flatMap((percorso) => {
    const testo = readFileSync(percorso, 'utf8')
    return VIETATI.filter((voce) => testo.includes(voce)).map((voce) => `${percorso}: ${voce}`)
  })

if (trovati.length > 0) {
  console.error('Bundle admin sporco:')
  for (const riga of trovati) console.error(`  ${riga}`)
  process.exit(1)
}
console.log('Bundle admin pulito')
