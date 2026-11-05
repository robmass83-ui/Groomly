type Colonna = { giorno: string; valore: number }

const ALTEZZA = 140

export function GraficoMetriche({ colonne, etichetta }: { colonne: readonly Colonna[]; etichetta: string }) {
  const massimo = Math.max(1, ...colonne.map(({ valore }) => valore))
  return (
    <div role="img" aria-label={etichetta} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: ALTEZZA, padding: '8px 0' }}>
      {colonne.map(({ giorno, valore }) => (
        <div
          key={giorno}
          title={`${giorno}: ${valore}`}
          style={{ flex: 1, minWidth: 0, height: `${Math.max(2, (valore / massimo) * 100)}%`, borderRadius: '3px 3px 0 0', background: 'var(--pri)' }}
        />
      ))}
    </div>
  )
}
