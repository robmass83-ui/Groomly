import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Il blocco com'era in `main` prima del sito admin: il sito pubblico non deve cambiare di una virgola.
const PUBBLICO = {
  public: 'hosting',
  ignore: ['firebase.json', '**/.*', '**/node_modules/**', '**/*.apk'],
  rewrites: [
    { source: '/azione', destination: '/azione/index.html' },
    { source: '/s/pagina.js', destination: '/s/pagina.js' },
    { source: '/s/**', function: { functionId: 'paginaPubblica', region: 'europe-west1' } },
  ],
  headers: [
    {
      source: '**',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Cache-Control', value: 'no-cache' },
      ],
    },
  ],
}

type Sito = { target: string; public: string; rewrites: { source: string; destination?: string }[]; headers: { source: string; headers: { key: string; value: string }[] }[] }

const siti = (JSON.parse(readFileSync('firebase.json', 'utf8')) as { hosting: Sito[] }).hosting
const sito = (target: string) => siti.find((s) => s.target === target)

describe('firebase.json a due siti', () => {
  it('il sito pubblico è uguale a prima', () => {
    expect(sito('pubblico')).toEqual({ target: 'pubblico', ...PUBBLICO })
  })

  it('il sito admin serve dist-admin, porta tutto alla sua pagina e sta fuori dai motori di ricerca', () => {
    const admin = sito('admin')
    expect(admin?.public).toBe('dist-admin')
    expect(admin?.rewrites).toEqual([{ source: '**', destination: '/admin.html' }])
    expect(admin?.headers.flatMap((h) => h.headers)).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow' })
  })

  it('i target puntano ai siti giusti', () => {
    const rc = JSON.parse(readFileSync('.firebaserc', 'utf8')) as { targets: Record<string, { hosting: Record<string, string[]> }> }
    expect(rc.targets['groomly-3128b']?.hosting).toEqual({ pubblico: ['groomly-3128b'], admin: ['groomly-admin'] })
  })

  it('la pagina admin chiede di non essere indicizzata e non carica l’app del salone', () => {
    expect(existsSync('admin.html')).toBe(true)
    const pagina = readFileSync('admin.html', 'utf8')
    expect(pagina).toContain('<meta name="robots" content="noindex, nofollow" />')
    expect(pagina).toContain('/src/main.admin.tsx')
    expect(pagina).not.toContain('/src/main.tsx')
  })
})
