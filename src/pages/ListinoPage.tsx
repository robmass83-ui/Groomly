import { format } from 'date-fns'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/layout/Toast'
import { Header } from '../components/layout/Header'
import { SectionTitle } from '../components/ui/SectionTitle'
import { blankSettings, dropOldestPrice, getSettings, pdfPageCount, priceFileMeta, replacePriceFile, type PriceFile, type SettingsMain } from '../data/local/settings'
import { useServices } from '../hooks/useServices'
import { storageKeys, writeJson } from '../data/local/storage'
import { useSession } from '../hooks/useSession'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { IT_DATE } from '../lib/format'
import { listinoView } from '../lib/listino'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const cell = { padding: '6px 4px', verticalAlign: 'top' } as const

const fileAction = {
  border: 0,
  background: 'transparent',
  padding: 0,
  fontSize: TYPE.meta,
  fontWeight: 700,
  color: 'var(--pri)',
} as const

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
  const session = useSession()
  const toast = useToast()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { services } = useServices(uid)
  const [settings, setSettings] = useState<SettingsMain>(() => (uid ? getSettings(uid) : blankSettings('auto', '')))
  const replaceRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const view = listinoView(uid ? services : [])
  const subtitle = settings.priceList
    ? `Aggiornato ${format(new Date(settings.priceList.uploadedAt), 'd MMM yyyy', IT_DATE)}`
    : view.updatedAt == null ? undefined : `Aggiornato ${format(view.updatedAt, 'd MMM yyyy', IT_DATE)}`

  function persist(file: PriceFile) {
    if (!uid) return
    const previous = settings
    const next = replacePriceFile(previous, file)
    const key = storageKeys.settings(uid)
    setSettings(next)
    try {
      writeJson(key, next)
      return
    } catch {
      const trimmed = dropOldestPrice(next)
      setSettings(trimmed)
      try {
        writeJson(key, trimmed)
      } catch {
        toast.show('Salvataggio non riuscito', 'plain')
        setSettings(previous)
      }
    }
  }

  async function onReplace(file: File | undefined) {
    if (!file) return
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

  async function onPhoto(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await prepareDogPhoto(file)
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {settings.priceList ? (
              <>
                <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{settings.priceList.fileName}</div>
                <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{priceFileMeta(settings.priceList)}</div>
              </>
            ) : (
              <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun file</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={() => replaceRef.current?.click()} style={fileAction}>Sostituisci</button>
            <button type="button" onClick={() => photoRef.current?.click()} style={fileAction}>Foto</button>
          </div>
        </div>
        {settings.priceList ? (
          <Link to="/listino/vedi" style={{ fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)', textDecoration: 'none' }}>Apri</Link>
        ) : null}
        {settings.priceListHistory.map((version) => (
          <Link key={version.id} to={`/listino/vedi?id=${encodeURIComponent(version.id)}`} style={{ fontSize: TYPE.meta, color: 'var(--tx2)', textDecoration: 'none' }}>
            {version.fileName}
          </Link>
        ))}
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
          ref={photoRef}
          aria-label="Foto"
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const picked = event.target.files?.[0]
            event.currentTarget.value = ''
            return onPhoto(picked)
          }}
        />
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
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta }}>I prezzi in scheda cane hanno priorità sul listino.</p>
      </div>
    </ShellFrame>
  )
}
