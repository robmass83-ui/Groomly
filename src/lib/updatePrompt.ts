import type { AppRelease } from './appRelease'

type Prompt = (release: AppRelease) => void

let prompt: Prompt | null = null

export function registerUpdatePrompt(next: Prompt): () => void {
  prompt = next
  return () => {
    if (prompt === next) prompt = null
  }
}

export function showUpdatePrompt(release: AppRelease): void {
  prompt?.(release)
}
