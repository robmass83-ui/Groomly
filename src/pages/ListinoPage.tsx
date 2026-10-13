import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { useToast } from '../components/layout/Toast'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconTile } from '../components/ui/IconTile'
import { SectionTitle } from '../components/ui/SectionTitle'
import { dropOldestPrice, pdfPageCount, priceFileMeta, removePriceFile, replacePriceFile, type PriceFile } from '../data/local/settings'
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

export function ListinoPage() {
  const navigate = useNavigate()
  const session = useSession()
  const toast = useToast()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { services } = useServices(uid)
  const { settings, save, ready } = useSettings()
  const local = useLocalData()
  const replaceRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const view = listinoView(uid ? services : [])
  const iconById = Object.fromEntries(services.map((service) => [service.id, service.iconKey])) as Record<string, ServiceIconKey | undefined>
  const subtitle = settings.priceList
    ? `Aggiornato ${format(new Date(settings.priceList.uploadedAt), 'd MMM yyyy', IT_DATE)}`
    : view.updatedAt == null ? undefined : `Aggiornato ${format(view.updatedAt, 'd MMM yyyy', IT_DATE)}`

  function persist(file: PriceFile) {
    if (!uid) return
    if (!ready) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    const next = replacePriceFile(settings, file)
    if (save(next)) return
    if (local && save(dropOldestPrice(next))) return
    toast.show('Salvataggio non riuscito', 'plain')
  }

  async function onReplace(file: File | undefined) {
    if (!file) return
    if (file.type.startsWith('image/')) {
      await onPhoto(file)
      return
    }
    const pageCount = file.type === 'application/pdf' ? pdfPageCount(await file.text()) : undefined
    const price: PriceFile = {
      id: crypto.randomUUID(),
      fileName: file.name,
      mime: file.type || 'application/octet-stream',
      byteSize: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl: await blobToDataUrl(file),
    }
    if (pageCount != null) price.pageCount = pageCount
    persist(price)
  }

  function onRemove(id: string) {
    if (!uid || !ready) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    if (!save(removePriceFile(settings, id))) toast.show('Salvataggio non riuscito', 'plain')
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await prepareListinoPhoto(file)
      persist({
        id: crypto.randomUUID(),
        fileName: file.name || 'foto.jpg',
        mime: 'image/jpeg',
        byteSize: dataUrlByteSize(dataUrl),
        uploadedAt: new Date().toISOString(),
        dataUrl,
      })
    } catch {
      toast.show('Foto non utilizzabile', 'plain')
    }
  }

  return (
    <ShellFrame>
      <Header title="Listino prezzi" subtitle={subtitle} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <IconTile tone="prim"><FileText size={16} strokeWidth={2} aria-hidden /></IconTile>
            <div style={{ minWidth: 0, flex: 1 }}>
              {settings.priceList ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{settings.priceList.fileName}</div>
                  <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{priceFileMeta(settings.priceList)}</div>
                </>
              ) : (
                <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun file</p>
              )}
            </div>
          </Row>
          <div style={{ display: 'flex', gap: 8, padding: '0 9px 9px', flexWrap: 'wrap' }}>
            {settings.priceList ? <Button size="sm" onClick={() => navigate('/listino/vedi')}>Apri</Button> : null}
            <Button size="sm" onClick={() => pdfRef.current?.click()}>PDF</Button>
            <Button size="sm" onClick={() => photoRef.current?.click()}>Foto</Button>
            <Button size="sm" onClick={() => replaceRef.current?.click()}>Sostituisci</Button>
            {settings.priceList ? <Button size="sm" variant="bad" onClick={() => onRemove(settings.priceList!.id)}>Elimina</Button> : null}
          </div>
          {settings.priceListHistory.map((version) => (
            <div
              key={version.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 9px',
                borderTop: '1px solid var(--line)',
                fontSize: TYPE.meta,
              }}
            >
              <Link
                to={`/listino/vedi?id=${encodeURIComponent(version.id)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                  minWidth: 0,
                  opacity: 0.72,
                  textDecoration: 'none',
                  color: 'var(--tx2)',
                }}
              >
                <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{version.fileName}</span>
                <Chip>Precedente</Chip>
              </Link>
              <Button size="sm" variant="bad" aria-label={`Elimina ${version.fileName}`} onClick={() => onRemove(version.id)}>Elimina</Button>
            </div>
          ))}
        </Card>
        <input
          ref={replaceRef}
          aria-label="Sostituisci"
          type="file"
          accept="application/pdf,image/*"
          hidden
          onChange={(event) => {
            const picked = event.target.files?.[0]
            event.currentTarget.value = ''
            return onReplace(picked)
          }}
        />
        <input
          ref={pdfRef}
          aria-label="PDF"
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(event) => {
            const picked = event.target.files?.[0]
            event.currentTarget.value = ''
            return onReplace(picked)
          }}
        />
        <input
          ref={photoRef}
          aria-label="Foto"
          type="file"
          accept="image/*"
          hidden
          onClick={(event) => guardCaptureClick(event, () => toast.show('Permesso foto negato', 'plain'))}
          onChange={(event) => {
            const picked = event.target.files?.[0]
            event.currentTarget.value = ''
            return onPhoto(picked)
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
