export function fermaSeNonDemo(): void {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Emulatori assenti: mi fermo')
  }
  const project = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'demo-groomly'
  if (!String(project).startsWith('demo-')) throw new Error('Project id non demo: mi fermo')
}
