import { en } from './en'
import { it as italiano } from './it'

// LINGUE: da tradurre. Provvisorio: all'unione vince il file di T3.
export const de = { ...en } as const satisfies Record<keyof typeof italiano, string>
