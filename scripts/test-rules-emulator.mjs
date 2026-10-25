import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'

const host = '127.0.0.1'
const port = 8080
const projectId = 'demo-groomly'

function findJar() {
  const candidates = [
    process.env.FIRESTORE_EMULATOR_JAR,
    resolve('cloud-firestore-emulator-v1.19.8.jar'),
  ].filter((path) => typeof path === 'string' && path.length > 0)
  return candidates.find((path) => existsSync(path))
}

function portOpen() {
  return new Promise((ok) => {
    const socket = createConnection({ host, port }, () => {
      socket.end()
      ok(true)
    })
    socket.on('error', () => ok(false))
  })
}

if (!projectId.startsWith('demo-')) {
  console.error('Project id non demo: mi fermo')
  process.exit(1)
}

const already = await portOpen()
let emulator
if (!already) {
  const jar = findJar()
  if (!jar) {
    console.error('Manca cloud-firestore-emulator-v1.19.8.jar')
    process.exit(1)
  }
  emulator = spawn('java', [
    '-jar', jar,
    `--host=${host}`,
    `--port=${port}`,
    `--project_id=${projectId}`,
    '--single_project_mode',
    `--rules=${resolve('firestore.rules')}`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  const ready = new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(new Error('emulatore Firestore non partito')), 60_000)
    const watch = (chunk) => {
      const text = chunk.toString()
      log += text
      process.stderr.write(text)
      if (log.includes('Dev App Server is now running')) {
        clearTimeout(timer)
        ok()
      }
    }
    emulator.stdout.on('data', watch)
    emulator.stderr.on('data', watch)
    emulator.on('exit', (code) => {
      if (!log.includes('Dev App Server is now running')) fail(new Error(`emulatore uscito con codice ${code}`))
    })
  })
  await ready
}

const vitest = spawn('npx', ['vitest', 'run', '--config', 'vitest.rules.config.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FIRESTORE_EMULATOR_HOST: `${host}:${port}`, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' },
})
const code = await new Promise((ok) => {
  vitest.on('exit', ok)
})
if (emulator) emulator.kill()
process.exit(code ?? 1)
