import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

const realFetch = globalThis.fetch.bind(globalThis)

function hostOf(input: RequestInfo | URL): string {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.startsWith('blob:') || url.startsWith('data:')) return 'local'
  try {
    return new URL(url, 'http://localhost').hostname
  } catch {
    return ''
  }
}

function blockedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const host = hostOf(input)
  if (host === 'local' || host === 'localhost' || host === '127.0.0.1') return realFetch(input, init)
  return Promise.resolve(new Response('offline', { status: 503 }))
}

globalThis.fetch = blockedFetch as typeof fetch
vi.stubGlobal('fetch', blockedFetch as typeof fetch)

if (typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}

afterEach(() => {
  cleanup()
})

Object.defineProperty(navigator, 'language', { configurable: true, value: 'it-IT' })

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
})
