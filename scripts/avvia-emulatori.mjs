import { spawnSync } from 'node:child_process'

// La scoperta delle Functions scade a 10 secondi. La compilazione e il primo avvio su Windows possono superarla.
const build = spawnSync('npm', ['--prefix', 'functions', 'run', 'build'], { stdio: 'inherit', shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

const env = { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '30' }
const run = spawnSync(
  'npx',
  ['firebase', 'emulators:start', '--only', 'auth,firestore,functions,pubsub', '--config', 'firebase.emu.json', '--project', 'demo-groomly'],
  { stdio: 'inherit', shell: true, env },
)
process.exit(run.status ?? 1)
