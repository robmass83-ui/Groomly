import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

// firebase-tools vuole Java 21+: se c'è, si usa quello di Android Studio.
const jbr = 'C:\\Program Files\\Android\\Android Studio\\jbr'
const env = { ...process.env }
if (existsSync(jbr)) {
  env.JAVA_HOME = jbr
  env.PATH = `${join(jbr, 'bin')}${delimiter}${env.PATH ?? env.Path ?? ''}`
}

const run = spawn(
  'npx firebase emulators:exec --only storage --project demo-groomly --config firebase.emu.json "npx vitest run --config vitest.storage.config.ts"',
  { stdio: 'inherit', shell: true, env },
)
run.on('exit', (code) => process.exit(code ?? 1))
