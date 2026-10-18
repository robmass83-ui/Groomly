import { format } from 'date-fns'
import { Eye, FileText, PawPrint, Pencil, Share2, SlidersVertical, Trash2 } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PriceIcon } from '../components/domain/PriceIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Dialog } from '../components/layout/Dialog'
import { useToast } from '../components/layout/Toast'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { SectionTitle } from '../components/ui/SectionTitle'
import { addPriceFile, dropOldestPrice, listPriceFiles, pdfPageCount, priceFileMeta, removePriceFile, renamePriceFile, type PriceFile } from '../data/local/settings'
import { useFileSrc } from '../hooks/useFileSrc'
import { useLocalData } from '../hooks/useLocalData'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { breakAfterPlus } from '../lib/breakAfterPlus'
import { prepareListinoPhoto } from '../lib/dogPhoto'
import { FILE_MAX_BYTES, FILE_TOO_LARGE } from '../lib/fileBytes'
import { guardCaptureClick } from '../lib/photoCapture'
import { IT_DATE } from '../lib/format'
import { listinoView } from '../lib/listino'
import { breedsBySize, formatPriceApp, getPriceSheet } from '../lib/priceSheet'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { DogSize, ServiceIconKey } from '../types/models'
import type { ExtraItem, PriceItem, PriceSheet, SheetSectionId } from '../types/priceSheet'
import { ShellFrame } from './ShellFrame'

const cell: CSSProperties = { padding: '6px 4px', verticalAlign: 'top', ...USER_TEXT }
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

const nameField: CSSProperties = {
  width: '100%',
  minHeight: SIZES.field.h,
  height: 'auto',
  borderRadius: SIZES.field.radius,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '8px',
  font: 'inherit',
  boxSizing: 'border-box',
  ...USER_TEXT,
}

const SIZE_TABS: { id: DogSize; label: string; title: string }[] = [
  { id: 'piccola', label: 'Piccola', title: 'TAGLIA PICCOLA' },
  { id: 'media', label: 'Media', title: 'TAGLIA MEDIA' },
  { id: 'grande', label: 'Grande', title: 'TAGLIA GRANDE' },
]

const JUMP_TABS = [
  ...SIZE_TABS.map((tab) => ({ id: tab.id, label: tab.label })),
  { id: 'extra', label: 'Extra' },
  { id: 'info', label: 'Info' },
] as const

function visibleSection(sheet: PriceSheet, id: SheetSectionId): boolean {
  return sheet.sezioni.some((section) => section.id === id && section.visibile)
}

function PriceLine({ item, indent }: { item: Pick<PriceItem, 'nome' | 'tipo' | 'prezzo'> & { iconKey?: PriceItem['iconKey'] }; indent?: boolean }) {
  const price = formatPriceApp(item)
  const warn = item.tipo === 'valutazione'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: TYPE.meta, color: 'var(--tx2)', lineHeight: '20px', padding: indent ? '0 9px 0 30px' : '0 9px' }}>
      {item.iconKey ? (
        <IconTile tone={item.iconKey} size="sm">
          <PriceIcon iconKey={item.iconKey} size={14} />
        </IconTile>
      ) : null}
      <span style={USER_TEXT}>{indent ? `· ${item.nome}` : item.nome}</span>
      <span aria-hidden style={{ flex: 1, borderBottom: '1.5px dotted var(--line2)', transform: 'translateY(2px)', minWidth: 8 }} />
      <span style={{ flexShrink: 0, fontWeight: warn ? 600 : 700, color: warn ? 'var(--warn)' : 'var(--tx)' }}>{price}</span>
    </div>
  )
}

function ExtraLine({ item }: { item: ExtraItem }) {
  if (item.sotto.length === 0) return <PriceLine item={item} />
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: TYPE.meta, color: 'var(--tx2)', lineHeight: '20px', padding: '0 9px' }}>
        <IconTile tone={item.iconKey} size="sm">
          <PriceIcon iconKey={item.iconKey} size={14} />
        </IconTile>
        <span style={USER_TEXT}>{item.nome}</span>
      </div>
      {item.sotto.map((sub) => (
        <PriceLine key={sub.id} item={sub} indent />
      ))}
    </>
  )
}

function BreedSheet({ sheet }: { sheet: PriceSheet }) {
  const logoSrc = useFileSrc(sheet.intestazione.logo, 'full')
  const [tab, setTab] = useState<string>('piccola')
  const { nome, descrizione, indirizzo, telefono, colore } = sheet.intestazione

  function jump(id: string) {
    setTab(id)
    document.getElementById(`listino-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, marginBottom: -2 }}>
        <SectionTitle>Listino per razza</SectionTitle>
        <Link to="/listino/gestione" style={{ flexShrink: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)' }}>Gestisci</Link>
      </div>
      <div style={{ display: 'flex', gap: 2, margin: '0 -12px', padding: '0 10px', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--line)' }}>
        {JUMP_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => jump(item.id)}
            style={{
              height: 34,
              border: 0,
              background: 'transparent',
              padding: '0 9px',
              fontSize: 12,
              fontWeight: tab === item.id ? 700 : 500,
              color: tab === item.id ? 'var(--pri)' : 'var(--tx3)',
              borderBottom: tab === item.id ? '2.5px solid var(--pri)' : '2.5px solid transparent',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Card style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 9 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            border: `2px solid ${colore}`,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            background: '#fff',
            flex: 'none',
          }}
        >
          {logoSrc ? (
            <img src={logoSrc} alt="Logo" style={{ width: '88%', height: '88%', objectFit: 'contain' }} />
          ) : (
            <PawPrint size={22} strokeWidth={2} aria-hidden color="#1D1A1B" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, ...USER_TEXT }}>{nome}</div>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{descrizione}</div>
          <div style={{ fontSize: 11, marginTop: 2, ...USER_TEXT }}>{indirizzo} · {telefono}</div>
        </div>
      </Card>
      {SIZE_TABS.map((size) => {
        if (!visibleSection(sheet, size.id)) return null
        const razze = breedsBySize(sheet, size.id)
        const note = sheet.noteTaglia[size.id]
        return (
          <Card key={size.id} id={`listino-${size.id}`} style={{ scrollMarginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', background: 'var(--pri-s)', borderBottom: '1px solid var(--line)' }}>
              <PawPrint size={14} strokeWidth={2} aria-hidden style={{ color: 'var(--pri-ink)' }} />
              <b style={{ flex: 1, fontSize: 11, letterSpacing: '0.06em', color: 'var(--pri-ink)' }}>{size.title}</b>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: SIZES.sectionBar.countH,
                  padding: '0 6px',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  background: 'var(--surf3)',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {razze.length}
              </span>
            </div>
            {razze.map((breed) => (
              <div key={breed.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, padding: '0 9px 4px', ...USER_TEXT }}>Tipo {breed.nome}</div>
                {breed.voci.map((voce) => (
                  <PriceLine key={voce.id} item={voce} />
                ))}
              </div>
            ))}
            {note ? (
              <div style={{ margin: '8px 9px 9px', padding: '8px 10px', borderRadius: 9, background: 'var(--warn-s)', color: 'var(--tx)', fontSize: TYPE.meta, lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                {note}
              </div>
            ) : null}
          </Card>
        )
      })}
      <div id="listino-extra" style={{ display: 'flex', flexDirection: 'column', gap: 8, scrollMarginTop: 40 }}>
        {visibleSection(sheet, 'bagnoTosatura') ? (
          <Card style={{ padding: '9px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 9px 6px', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
              <IconTile tone="bagno_taglio" size="sm">
                <PriceIcon iconKey="bagno_taglio" size={14} />
              </IconTile>
              {sheet.bagnoTosatura.titolo.toUpperCase()}
              <span style={{ letterSpacing: 0, fontWeight: 500, color: 'var(--tx3)', fontSize: TYPE.meta }}>{sheet.bagnoTosatura.sottotitolo.replace(/^\(|\)$/g, '')}</span>
            </div>
            {sheet.bagnoTosatura.voci.map((voce) => (
              <PriceLine key={voce.id} item={voce} />
            ))}
          </Card>
        ) : null}
        {visibleSection(sheet, 'extra') ? (
          <Card style={{ padding: '9px 0 8px' }}>
            <div style={{ padding: '0 9px 6px', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>{sheet.extra.titolo.toUpperCase()}</div>
            {sheet.extra.voci.map((voce) => (
              <ExtraLine key={voce.id} item={voce} />
            ))}
          </Card>
        ) : null}
        {visibleSection(sheet, 'compresi') ? (
          <Card style={{ padding: 9 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', marginBottom: 8 }}>{sheet.compresi.titolo.toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {sheet.compresi.voci.map((voce) => (
                <span
                  key={voce.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    minHeight: 28,
                    height: 'auto',
                    padding: '4px 9px 4px 4px',
                    borderRadius: 999,
                    background: 'var(--surf)',
                    border: '1px solid var(--line)',
                    fontWeight: 600,
                    fontSize: 11.5,
                    ...USER_TEXT,
                  }}
                >
                  <PriceIcon iconKey={voce.iconKey} size={20} />
                  {voce.testo}
                </span>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
      <div id="listino-info" style={{ display: 'flex', flexDirection: 'column', gap: 8, scrollMarginTop: 40 }}>
        {visibleSection(sheet, 'info') ? (
          <Card style={{ padding: 9, fontSize: TYPE.meta, lineHeight: 1.45 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', marginBottom: 6 }}>{sheet.info.titolo.toUpperCase()}</div>
            <div>{sheet.info.intro}</div>
            <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
              {sheet.info.punti.map((punto) => (
                <li key={punto}>{punto}</li>
              ))}
            </ul>
            <b style={{ color: 'var(--pri-ink)' }}>→ {sheet.info.chiusura}</b>
          </Card>
        ) : null}
        {visibleSection(sheet, 'avviso') ? (
          <Card style={{ padding: 9, fontSize: TYPE.meta, lineHeight: 1.45, background: 'var(--bad-s)' }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', marginBottom: 6, color: 'var(--bad)' }}>{sheet.avviso.titolo.toUpperCase()}</div>
            <div>{sheet.avviso.intro}</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {sheet.avviso.punti.map((punto) => (
                <li key={punto}>{punto}</li>
              ))}
            </ul>
          </Card>
        ) : null}
        {visibleSection(sheet, 'saluto') ? (
          <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 22, color: colore, padding: '4px 0' }}>
            {sheet.saluto}
          </div>
        ) : null}
      </div>
    </>
  )
}

export function ListinoPage() {
  const session = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { services } = useServices(uid)
  const { settings, save, ready } = useSettings()
  const local = useLocalData()
  const sheet = getPriceSheet(settings)
  const addRef = useRef<HTMLInputElement>(null)
  const skipRename = useRef(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{ id: string; fileName: string } | null>(null)
  const view = listinoView(uid ? services : [])
  const iconById = Object.fromEntries(services.map((service) => [service.id, service.iconKey])) as Record<string, ServiceIconKey | undefined>
  const files = listPriceFiles(settings)
  const latest = files.reduce<PriceFile | undefined>((best, file) => (!best || file.uploadedAt > best.uploadedAt ? file : best), undefined)
  const subtitle = latest
    ? `Aggiornato ${format(new Date(latest.uploadedAt), 'd MMM yyyy', IT_DATE)}`
    : view.updatedAt == null ? undefined : `Aggiornato ${format(view.updatedAt, 'd MMM yyyy', IT_DATE)}`

  async function priceFrom(file: File): Promise<PriceFile | null> {
    if (file.type.startsWith('image/')) {
      let dataUrl: string
      try {
        dataUrl = await prepareListinoPhoto(file)
      } catch {
        toast.show('Foto non utilizzabile', 'plain')
        return null
      }
      if (dataUrlByteSize(dataUrl) > FILE_MAX_BYTES) {
        toast.show(FILE_TOO_LARGE, 'plain')
        return null
      }
      return {
        id: crypto.randomUUID(),
        fileName: file.name || 'foto.jpg',
        mime: 'image/jpeg',
        byteSize: dataUrlByteSize(dataUrl),
        uploadedAt: new Date().toISOString(),
        dataUrl,
      }
    }
    if (file.size > FILE_MAX_BYTES) {
      toast.show(FILE_TOO_LARGE, 'plain')
      return null
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

  function confirmRemoveFile() {
    if (!removeTarget) return
    const id = removeTarget.id
    setRemoveTarget(null)
    onRemove(id)
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
        <div style={{ display: 'flex', gap: 6 }}>
          <IconButton label="Gestione listino" onClick={() => navigate('/listino/gestione')}>
            <SlidersVertical size={16} strokeWidth={2} aria-hidden />
          </IconButton>
          <IconButton label="Aggiorna prezzi" onClick={() => navigate('/listino/prezzi')}>
            <Pencil size={16} strokeWidth={2} aria-hidden />
          </IconButton>
          <IconButton label="Stampa e condividi" onClick={() => navigate('/listino/stampa')} style={{ background: 'var(--pri-s)', color: 'var(--pri-ink)' }}>
            <Share2 size={16} strokeWidth={2} aria-hidden />
          </IconButton>
        </div>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '9px' }}>
            <Button size="sm" onClick={() => addRef.current?.click()}>Aggiungi file</Button>
          </div>
          {files.length === 0 ? (
            <Row>
              <IconTile tone="prim"><FileText size={16} strokeWidth={2} aria-hidden /></IconTile>
              <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun file</p>
            </Row>
          ) : files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 9px',
                borderTop: '1px solid var(--line)',
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
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 700,
                        fontSize: TYPE.rowTitle,
                        color: 'var(--tx)',
                        textDecoration: 'none',
                        ...USER_TEXT,
                      }}
                    >
                      <span style={USER_TEXT}>{file.fileName}</span>
                      <Eye size={14} strokeWidth={2} aria-hidden style={{ flex: 'none', color: 'var(--tx3)' }} />
                    </Link>
                    <IconButton label={`Rinomina ${file.fileName}`} onClick={() => startRename(file)} style={{ width: 32, height: 32, flex: 'none', background: 'transparent' }}>
                      <Pencil size={14} strokeWidth={2} aria-hidden />
                    </IconButton>
                  </span>
                )}
                <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{priceFileMeta(file)}</div>
              </div>
              <IconButton label={`Elimina ${file.fileName}`} onClick={() => setRemoveTarget({ id: file.id, fileName: file.fileName })} style={{ flex: 'none', marginLeft: 'auto', color: 'var(--bad)', background: 'transparent' }}>
                <Trash2 size={16} strokeWidth={2} aria-hidden />
              </IconButton>
            </div>
          ))}
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
        <BreedSheet sheet={sheet} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, marginBottom: -2 }}>
          <SectionTitle>Prezzi e tempi standard</SectionTitle>
          <Link to="/impostazioni/servizi" style={{ flexShrink: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)' }}>Modifica</Link>
        </div>
        {view.rows.length === 0 && view.extras.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun servizio</p>
        ) : null}
        {view.rows.length > 0 ? (
          <Card>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: TYPE.base }}>
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                        <IconTile tone={iconById[row.id] ?? 'prim'} size="sm">
                          <ServiceIcon iconKey={iconById[row.id]} size={SIZES.chip.serviceIconInChip} />
                        </IconTile>
                        <div style={{ flex: 1, ...USER_TEXT }}>
                          <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, ...USER_TEXT }}>{breakAfterPlus(row.name)}</div>
                          <div style={{ color: 'var(--tx3)', ...USER_TEXT }}>{row.duration}</div>
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
                <li key={row.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, minHeight: 44, padding: '6px 4px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                    <IconTile tone={iconById[row.id] ?? 'prim'} size="sm">
                      <ServiceIcon iconKey={iconById[row.id]} size={SIZES.chip.serviceIconInChip} />
                    </IconTile>
                    <span style={USER_TEXT}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: TYPE.rowTitle, ...USER_TEXT }}>{breakAfterPlus(row.name)}</span>
                      <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{row.duration}</span>
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
      <Dialog open={removeTarget !== null} title="Eliminare questo file?" onClose={() => setRemoveTarget(null)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, lineHeight: 1.4, ...USER_TEXT }}>{removeTarget?.fileName}</p>
        <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Annulla</Button>
        <Button variant="bad" onClick={confirmRemoveFile}>Elimina</Button>
      </Dialog>
    </ShellFrame>
  )
}
