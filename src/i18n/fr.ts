import { en } from './en'
import { it as italiano } from './it'

// LINGUE: da tradurre. Provvisorio: all'unione vince il file di T2.
export const fr = { ...en } as const satisfies Record<keyof typeof italiano, string>
