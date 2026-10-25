import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { fermaSeNonDemo } from './guard'

fermaSeNonDemo()
initializeApp({ projectId: 'demo-groomly' })
const r = JSON.parse(readFileSync('test-results/test360/seed-report.json','utf8'))
const uid = r.find((x: any) => String(x.salone) === process.argv[2]).uid
await getFirestore().doc(`salons/${uid}/pro/main`).set({ enabled: process.argv[3] === 'on', seats: 3, updatedAt: new Date().toISOString() })
console.log('pro', process.argv[2], process.argv[3])
