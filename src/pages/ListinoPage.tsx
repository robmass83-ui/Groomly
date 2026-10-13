import { format } from 'date-fns'
import { FileText, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { useToast } from '../components/layout/Toast'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { SectionTitle } from '../components/ui/SectionTitle'
import { addPriceFile, dropOldestPrice, listPriceFiles, pdfPageCount, priceFileMeta, removePriceFile, renamePriceFile, type PriceFile } from '../data/local/settings'
import { useLocalData } from '../hooks/useLocalData'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { prepareListinoPhoto } from '../lib/dogPhoto'
import { guardCaptureClick } from '../lib/photoCapture'
import { IT_DATE } from '../lib/format'
import { listinoView } from '../lib/listino'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { ServiceIconKey } from '../types/models'
import { ShellFrame } from './ShellFrame'

const cell = { padding: '6px 4px', verticalAlign: 'top' } as const
const stickyHead = { position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)' } as const
const figures = { fontVariantNumeric: 'tabular-nums' } as const

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

function dataUrlByteSize(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

const nameField = {
  width: '100%',
  height: 34,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '0 8px',
  font: 'inherit',
  boxSizing: 'border-box',
} as const

export function ListinoPage() {
  const session = useSession()
  const toast = useToast()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { services } = useServices(uid)
  const { settings, save, ready } = useSettings()
  const local = useLocalData()
  const addRef = useRef<HTMLInputElement>(null)
  const skipRename = useRef(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const view = listinoView(uid ? services : [])
  const iconById = Object.fromEntries(services.map((service) => [service.id, service.iconKey])) as Record<string, ServiceIconKey | undefined>
  const files = listPriceFiles(settings)
  const latest = files.reduce<PriceFile | undefined>((best, file) => (!best || file.uploadedAt > best.uploadedAt ? file : best), undefined)
  const subtitle = latest
    ? `Aggiornato ${format(new Date(latest.uploadedAt), 'd MMM yyyy', IT_DATE)}`
    : view.updatedAt == null ? undefined : `Aggiornato ${format(view.updatedAt, 'd MMM yyyy', IT_DATE)}`

  async function priceFrom(file: File): Promise<PriceFile | null> {
    if (file.type.startsWith('image/')) {
      try {
        const dataUrl = await prepareListinoPhoto(file)
        return {
          id: crypto.randomUUID(),
          fileName: file.name || 'foto.jpg',
          mime: 'image/jpeg',
          byteSize: dataUrlByteSize(dataUrl),
          uploadedAt: new Date().toISOString(),
          dataUrl,
        }
      } catch {
        toast.show('Foto non utilizzabile', 'plain')
        return null
      }
    }
    const mime = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : (file.type || 'application/octet-stream')
    const pageCount = mime === 'application/pdf' ? pdfPageCount(await file.text()) : undefined
    const price: PriceFile = {
      id: crypto.randomUUID(),
      fileName: file.name,
      mime,
      byteSize: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl: await blobToDataUrl(file),
    }
    if (pageCount != null) price.pageCount = pageCount
    return price
  }

  async function onAdd(picked: File[]) {
    if (picked.length === 0) return
    if (!uid || !ready) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    let next = settings
    const keepIds: string[] = []
    for (const file of picked) {
      const price = await priceFrom(file)
      if (!price) continue
      next = addPriceFile(next, price)
      keepIds.push(price.id)
    }
    if (keepIds.length === 0) return
    if (save(next)) return
    if (local && save(dropOldestPrice(next, keepIds))) return
    toast.show('Salvataggio non riuscito', 'plain')
  }

  function onRemove(id: string) {
    if (!uid || !ready) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    if (!save(removePriceFile(settings, id))) toast.show('Salvataggio non riuscito', 'plain')
  }

  function startRename(file: PriceFile) {
    skipRename.current = false
    setRenamingId(file.id)
    setDraftName(file.fileName)
  }

  function commitRename(id: string) {
    if (skipRename.current) {
      skipRename.current = false
      return
    }
    skipRename.current = true
    setRenamingId(null)
    const name = draftName.trim()
    if (!name) return
    const current = listPriceFiles(settings).find((file) => file.id === id)
    if (!current || current.fileName === name) return
    if (!uid || !ready || !save(renamePriceFile(settings, id, name))) toast.show('Salvataggio non riuscito', 'plain')
  }

  return (
    <ShellFrame>
      <Header title="Listino prezzi" subtitle={subtitle} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Card>
          {files.length === 0 ? (
            <Row style={{ borderTop: 'none' }}>
              <IconTile tone="prim"><FileText size={16} strokeWidth={2} aria-hidden /></IconTile>
              <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun file</p>
            </Row>
          ) : files.map((file, index) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 9px',
                borderTop: index === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingId === file.id ? (
                  <input
                    aria-label={`Nome di ${file.fileName}`}
                    value={draftName}
                    autoFocus
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={() => commitRename(file.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitRename(file.id)
                      }
                      if (event.key === 'Escape') {
                        skipRename.current = true
                        setRenamingId(null)
                      }
                    }}
                    style={nameField}
                  />
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <Link
                      to={`/listino/vedi?id=${encodeURIComponent(file.id)}`}
                      style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontWeight: 700, fontSize: TYPE.rowTitle, color: 'var(--tx)', textDecoration: 'none' }}
                    >
                      {file.fileName}
                    </Link>
                    <IconButton label={`Rinomina ${file.fileName}`} onClick={() => startRename(file)} style={{ width: 32, height: 32, flex: 'none', background: 'transparent' }}>
                      <Pencil size={14} strokeWidth={2} aria-hidden />
                    </IconButton>
                  </span>
                )}
                <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{priceFileMeta(file)}</div>
              </div>
              <IconButton label={`Elimina ${file.fileName}`} onClick={() => onRemove(file.id)} style={{ flex: 'none', marginLeft: 'auto', color: 'var(--bad)', background: 'transparent' }}>
                <Trash2 size={16} strokeWidth={2} aria-hidden />
              </IconButton>
            </div>
          ))}
          <div style={{ display: 'flex', padding: '9px' }}>
            <Button size="sm" onClick={() => addRef.current?.click()}>Aggiungi file</Button>
          </div>
        </Card>
        <input
          ref={addRef}
          aria-label="Aggiungi file"
          type="file"
          accept="application/pdf,image/*,.pdf"
          multiple
          hidden
          onClick={(event) => guardCaptureClick(event, () => toast.show('Permesso foto negato', 'plain'))}
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? [])
            event.currentTarget.value = ''
            return onAdd(picked)
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, marginBottom: -2 }}>
          <SectionTitle>Prezzi e tempi standard</SectionTitle>
          <Link to="/impostazioni/servizi" style={{ flexShrink: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)' }}>Modifica</Link>
        </div>
        {view.rows.length === 0 && view.extras.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun servizio</p>
        ) : null}
        {view.rows.length > 0 ? (
          <Card>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: TYPE.meta }}>
              <thead>
                <tr>
                  <th style={{ ...cell, ...stickyHead, textAlign: 'left', width: '40%' }}>Servizio</th>
                  <th style={{ ...cell, ...stickyHead, textAlign: 'right' }}>Piccola</th>
                  <th style={{ ...cell, ...stickyHead, textAlign: 'right' }}>Media</th>
                  <th style={{ ...cell, ...stickyHead, textAlign: 'right' }}>Grande</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconTile tone={iconById[row.id] ?? 'prim'} size="sm">
                          <ServiceIcon iconKey={iconById[row.id]} size={SIZES.chip.serviceIconInChip} />
                        </IconTile>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{row.name}</div>
                          <div style={{ color: 'var(--tx3)' }}>{row.duration}</div>
                        </div>
                      </div>
                    </td>
                    {row.price.kind === 'sizes' ? (
                      <>
                        <td style={{ ...cell, ...figures, textAlign: 'right' }}>{row.price.piccola}</td>
                        <td style={{ ...cell, ...figures, textAlign: 'right' }}>{row.price.media}</td>
                        <td style={{ ...cell, ...figures, textAlign: 'right' }}>{row.price.grande}</td>
                      </>
                    ) : (
                      <td colSpan={3} style={{ ...cell, ...figures, textAlign: 'right' }}>{row.price.text}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
        {view.extras.length > 0 ? (
          <>
            <div style={{ marginTop: 8, marginBottom: -2 }}>
              <SectionTitle>Servizi aggiuntivi · prezzo unico</SectionTitle>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {view.extras.map((row) => (
                <li key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, padding: '6px 4px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <IconTile tone={iconById[row.id] ?? 'prim'} size="sm">
                      <ServiceIcon iconKey={iconById[row.id]} size={SIZES.chip.serviceIconInChip} />
                    </IconTile>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{row.name}</span>
                      <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.duration}</span>
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, fontSize: TYPE.meta, ...figures }}>{row.price.kind === 'sizes' ? '' : row.price.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p style={{ margin: 0, background: 'var(--pri-s)', color: 'var(--pri-ink)', borderRadius: 9, padding: '8px 10px', fontSize: TYPE.meta }}>
          I prezzi in scheda cane hanno priorità sul listino.
        </p>
      </div>
    </ShellFrame>
  )
}
