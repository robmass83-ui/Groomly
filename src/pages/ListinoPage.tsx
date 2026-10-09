import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { SectionTitle } from '../components/ui/SectionTitle'
import { ensureServiceSeed } from '../data/local/services'
import { useSession } from '../hooks/useSession'
import { IT_DATE } from '../lib/format'
import { listinoView } from '../lib/listino'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const cell = { padding: '6px 4px', verticalAlign: 'top' } as const

export function ListinoPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const view = listinoView(uid ? ensureServiceSeed(uid) : [])
  const subtitle = view.updatedAt == null ? undefined : `Aggiornato ${format(view.updatedAt, 'd MMM yyyy', IT_DATE)}`
  return (
    <ShellFrame>
      <Header title="Listino prezzi" subtitle={subtitle} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <SectionTitle>Prezzi e tempi standard</SectionTitle>
          <Link to="/impostazioni/servizi" style={{ flexShrink: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)' }}>Modifica</Link>
        </div>
        {view.rows.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun servizio</p>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: TYPE.meta }}>
            <thead>
              <tr>
                <th style={{ ...cell, textAlign: 'left', width: '40%' }}>Servizio</th>
                <th style={{ ...cell, textAlign: 'right' }}>Piccola</th>
                <th style={{ ...cell, textAlign: 'right' }}>Media</th>
                <th style={{ ...cell, textAlign: 'right' }}>Grande</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id}>
                  <td style={cell}>
                    <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{row.name}</div>
                    <div style={{ color: 'var(--tx3)' }}>{row.duration}</div>
                  </td>
                  {row.price.kind === 'sizes' ? (
                    <>
                      <td style={{ ...cell, textAlign: 'right' }}>{row.price.piccola}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{row.price.media}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{row.price.grande}</td>
                    </>
                  ) : (
                    <td colSpan={3} style={{ ...cell, textAlign: 'right' }}>{row.price.text}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ShellFrame>
  )
}
