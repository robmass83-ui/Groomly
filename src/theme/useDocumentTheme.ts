import { useSyncExternalStore } from 'react'

function read(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

export function useDocumentTheme(): 'light' | 'dark' {
  return useSyncExternalStore<'light' | 'dark'>(subscribe, read, () => 'light')
}
