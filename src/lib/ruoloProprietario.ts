const MASCHILI_IN_A = new Set(['andrea', 'luca', 'nicola', 'elia', 'mattia', 'battista', 'gianluca'])

/** Il nome non basta a scegliere il sesso: il femminile solo se il primo nome lo indica. */
export function ruoloDelProprietario(nome: string): 'Proprietario' | 'Proprietaria' {
  const primo = nome.trim().split(/\s+/)[0]?.toLocaleLowerCase('it') ?? ''
  if (primo.endsWith('a') && !MASCHILI_IN_A.has(primo)) return 'Proprietaria'
  return 'Proprietario'
}
