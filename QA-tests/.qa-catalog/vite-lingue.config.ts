// Vite per il giro delle lingue: stessa app del ramo, ma verso gli emulatori di firebase.lingue.json.
// Altre porte perché altre sessioni possono tenere occupate 8080 e 5173. Il codice dell'app non cambia.
import { defineConfig, mergeConfig } from 'vite'
import base from '../../vite.config'

const porte = {
  name: 'porte-emulatori-lingue',
  enforce: 'pre' as const,
  transform(codice: string, id: string) {
    if (!id.split('?')[0].endsWith('/src/data/firebase/client.ts')) return null
    return codice.replace(':9099', ':9199').replace("'127.0.0.1', 8080", "'127.0.0.1', 8180").replace("'127.0.0.1', 5001", "'127.0.0.1', 5101")
  },
}

export default defineConfig((env) => mergeConfig((base as (e: typeof env) => object)(env), { plugins: [porte], cacheDir: 'node_modules/.vite-lingue' }))
