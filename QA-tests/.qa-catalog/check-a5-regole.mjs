// Controllo A5 (solo emulatore): come collaboratore, via SDK client, prova a svuotare la scheda di un cane e a lasciarne il nome vuoto.
// Uso: node QA-tests/.qa-catalog/check-a5-regole.mjs <email-collaboratore> <password> <salonId> <dogId>
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore'
const [email, password, salonId, dogId] = process.argv.slice(2)
const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-groomly' })
const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080)
await signInWithEmailAndPassword(auth, email, password)
const ref = doc(db, 'salons', salonId, 'dogs', dogId)
const prova = async (nome, fn) => { try { await fn(); return `${nome}: PERMESSO` } catch (e) { return `${nome}: ${e.code ?? e.message}` } }
const prima = (await getDoc(ref)).data()
const out = [
  await prova('svuota scheda', () => setDoc(ref, { status: 'attivo' })),
  await prova('nome vuoto', () => updateDoc(ref, { name: '' })),
  await prova('modifica note', () => updateDoc(ref, { notes: 'nota QA A5' })),
]
const dopo = (await getDoc(ref)).data()
console.log(JSON.stringify({ esiti: out, nomePrima: prima?.name, nomeDopo: dopo?.name, specieDopo: dopo?.species, noteDopo: dopo?.notes }))
process.exit(0)
