/** Vero solo nel bundle del sito admin: lì non c'è nessun salone e nulla resta sul PC. */
export function solaAdmin(): boolean {
  return import.meta.env.VITE_ENTRY === 'admin'
}
