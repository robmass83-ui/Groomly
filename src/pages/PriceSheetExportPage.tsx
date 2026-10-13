import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Download, Maximize2, Printer, Share2, X } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { PriceSheetPaper } from '../components/priceSheet/PriceSheetPaper'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { useFileSrc } from '../hooks/useFileSrc'
import { useSettings } from '../hooks/useSettings'
import { openPdfBlob } from '../lib/openDocument'
import { clampPan, pinchScale } from '../lib/pinchScale'
import { getPriceSheet } from '../lib/priceSheet'
import { buildSheetFile, renderSheetJpegs } from '../lib/priceSheetExport'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { PriceSheet } from '../types/priceSheet'

const SWITCH_LABEL = 'Scrivi "a partire da" sui prezzi'
const PREVIEW_W = 236

type Action = 'share' | 'download' | 'print'

function paperSize(format: 'A4' | 'A3') {
  return format === 'A3' ? { w: 1123, h: 1587 } : { w: 794, h: 1123 }
}

function fingerDistance(touches: ArrayLike<{ clientX: number; clientY: number }>): number {
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function downloadAnchor(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

async function shareFiles(files: { blob: Blob; name: string }[]) {
  const uris: string[] = []
  for (const file of files) {
    const written = await Filesystem.writeFile({
      path: file.name,
      data: await blobBase64(file.blob),
      directory: Directory.Cache,
    })
    uris.push(written.uri)
  }
  await Share.share({ files: uris, title: 'Listino prezzi' })
}

async function writeDocuments(files: { blob: Blob; name: string }[]) {
  for (const file of files) {
    await Filesystem.writeFile({
      path: `Groomly/${file.name}`,
      data: await blobBase64(file.blob),
      directory: Directory.Documents,
      recursive: true,
    })
  }
}

function preparingToast(format: 'A4' | 'A3', tipoFile: 'pdf' | 'jpeg') {
  return tipoFile === 'pdf' ? `Preparo il PDF ${format}…` : `Preparo l'immagine ${format}…`
}

export function fitCaption(
  paper: { pages: string | null; fitOk: string | null } | null,
  format: 'A4' | 'A3',
  k: number,
): string | null {
  if (!paper) return null
  if (paper.pages === '2' || paper.fitOk !== 'true') {
    return 'Il listino non entra in 1 pagina: verrà diviso su 2 pagine'
  }
  return `Tutto in 1 pagina ${format} · testo al ${Math.round(k * 100)}%`
}

function useFitStatus(host: HTMLElement | null, sheet: PriceSheet, format: 'A4' | 'A3') {
  const [fit, setFit] = useState<{ paper: { pages: string | null; fitOk: string | null } | null; k: number }>({
    paper: null,
    k: 1,
  })
  useEffect(() => {
    if (!host) return
    const read = () => {
      const paper = host.querySelector('[data-pages], [data-fit-ok]')
      const fly = host.querySelector<HTMLElement>('.fly')
      if (!paper) return
      const k = fly ? Number.parseFloat(getComputedStyle(fly).getPropertyValue('--k')) : 1
      setFit({
        paper: {
          pages: paper.getAttribute('data-pages'),
          fitOk: paper.getAttribute('data-fit-ok'),
        },
        k: Number.isFinite(k) ? k : 1,
      })
    }
    const observer = new MutationObserver(read)
    observer.observe(host, { attributes: true, subtree: true, attributeFilter: ['data-fit-ok', 'data-pages', 'style'] })
    const frame = requestAnimationFrame(read)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [host, sheet, format])
  return fitCaption(fit.paper, format, fit.k)
}

export function PriceSheetExportPage() {
  const toast = useToast()
  const { settings, save } = useSettings()
  const sheet = getPriceSheet(settings)
  const logoSrc = useFileSrc(sheet.intestazione.logo, 'full')
  const format = sheet.opzioni.formato
  const tipoFile = sheet.opzioni.tipoFile
  const { w: paperW, h: paperH } = paperSize(format)
  const previewScale = PREVIEW_W / paperW
  const [busy, setBusy] = useState(false)
  const [full, setFull] = useState(false)
  const [exportHost, setExportHost] = useState<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<HTMLButtonElement>(null)
  const gesture = useRef({ distance: 0, scale: 1 })
  const drag = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const fit = useFitStatus(exportHost, sheet, format)

  function persistOpzioni(patch: Partial<PriceSheet['opzioni']>) {
    save({ ...settings, priceSheet: { ...sheet, opzioni: { ...sheet.opzioni, ...patch } } })
  }

  function rememberScale(next: number) {
    scaleRef.current = next
    setScale(next)
    if (next <= 1) rememberPan({ x: 0, y: 0 })
  }

  function rememberPan(next: { x: number; y: number }) {
    panRef.current = next
    setPan(next)
  }

  function frameSize() {
    const box = frameRef.current?.getBoundingClientRect()
    return { width: box?.width ?? 0, height: box?.height ?? 0 }
  }

  function onTouchStart(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length >= 2) {
      const distance = fingerDistance(event.touches)
      gesture.current = { distance, scale: scaleRef.current }
      rememberScale(pinchScale(distance, distance, scaleRef.current))
      return
    }
    const touch = event.touches[0]
    if (!touch || scaleRef.current <= 1) return
    drag.current = { x: touch.clientX, y: touch.clientY, panX: panRef.current.x, panY: panRef.current.y }
  }

  function onTouchMove(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length >= 2) {
      if (gesture.current.distance <= 0) {
        gesture.current = { distance: fingerDistance(event.touches), scale: scaleRef.current }
      }
      const next = pinchScale(gesture.current.distance, fingerDistance(event.touches), gesture.current.scale)
      rememberScale(next)
      const box = frameSize()
      rememberPan(clampPan(panRef.current.x, panRef.current.y, next, box.width, box.height))
      return
    }
    const touch = event.touches[0]
    if (!touch || scaleRef.current <= 1) return
    const box = frameSize()
    rememberPan(clampPan(
      drag.current.panX + (touch.clientX - drag.current.x),
      drag.current.panY + (touch.clientY - drag.current.y),
      scaleRef.current,
      box.width,
      box.height,
    ))
  }

  async function run(kind: Action) {
    if (busy) return
    setBusy(true)
    const tipo = kind === 'print' ? 'pdf' : tipoFile
    toast.show(preparingToast(format, tipo), 'plain')
    try {
      const host = exportHost
      if (!host) throw new Error('foglio assente')
      const pages = await renderSheetJpegs(host, format)
      const files = await buildSheetFile({
        title: 'Listino ' + sheet.intestazione.nome,
        nome: sheet.intestazione.nome,
        format,
        tipoFile: tipo,
        pages,
      })
      if (kind === 'print') {
        const pdf = files[0]
        if (pdf) await openPdfBlob(pdf.blob, pdf.name)
        return
      }
      if (kind === 'download' && !Capacitor.isNativePlatform()) {
        for (const file of files) downloadAnchor(file.blob, file.name)
        return
      }
      if (kind === 'download') {
        try {
          await writeDocuments(files)
          toast.show('Salvato in Documenti/Groomly', 'ok')
        } catch {
          await shareFiles(files)
          toast.show('Scegli dove salvarlo', 'plain')
        }
        return
      }
      await shareFiles(files)
    } catch {
      toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneShell>
      <Header title="Stampa e condividi" subtitle="Il foglio è sempre uguale al listino cartaceo" backTo="/listino" />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          ref={setExportHost}
          aria-hidden
          style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
        >
          <PriceSheetPaper sheet={sheet} logoSrc={logoSrc} format={format} />
        </div>
        <div style={{ background: '#D5DAE2', borderRadius: 12, padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: PREVIEW_W, height: paperH * previewScale, overflow: 'hidden', boxShadow: '0 8px 20px -8px rgba(0,0,0,.4)', background: '#fff' }}>
            <div style={{ width: paperW, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              <PriceSheetPaper sheet={sheet} logoSrc={logoSrc} format={format} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              rememberScale(1)
              rememberPan({ x: 0, y: 0 })
              setFull(true)
            }}
            style={{ border: 0, background: 'transparent', color: 'var(--pri)', fontWeight: 600, fontSize: TYPE.base, display: 'inline-flex', gap: 4, alignItems: 'center' }}
          >
            <Maximize2 size={14} strokeWidth={2} aria-hidden />
            Apri a schermo intero
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
          <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>Formato carta</span>
          <Segmented
            label="Formato carta"
            fill
            value={format}
            onChange={(formato) => persistOpzioni({ formato })}
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'A3', label: 'A3' },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
          <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>Tipo di file</span>
          <Segmented
            label="Tipo di file"
            fill
            value={tipoFile}
            onChange={(next) => persistOpzioni({ tipoFile: next })}
            options={[
              { value: 'pdf', label: 'PDF' },
              { value: 'jpeg', label: 'JPEG (immagine)' },
            ]}
          />
        </div>
        <Card>
          <Row style={{ borderTop: 0 }}>
            <span style={{ flex: 1 }}>{SWITCH_LABEL}</span>
            <Toggle
              checked={sheet.opzioni.scriviAPartireDa}
              onChange={(scriviAPartireDa) => persistOpzioni({ scriviAPartireDa })}
              label={SWITCH_LABEL}
            />
          </Row>
        </Card>
        <div style={{ textAlign: 'center', fontSize: TYPE.meta, color: 'var(--tx3)' }}>
          {fit}
        </div>
      </div>
      <div
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--line)',
          boxShadow: 'var(--sh-foot)',
          padding: `${SIZES.sheet.footer.padTop}px ${SIZES.sheet.footer.padX}px ${SIZES.sheet.footer.padBottom}px`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.3fr',
          gap: SIZES.sheet.footer.gap,
        }}
      >
        <Button variant="secondary" disabled={busy} onClick={() => void run('print')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Printer size={14} strokeWidth={2} aria-hidden />
          Stampa
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void run('download')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Download size={14} strokeWidth={2} aria-hidden />
          Scarica
        </Button>
        <Button disabled={busy} onClick={() => void run('share')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={14} strokeWidth={2} aria-hidden />
          Condividi
        </Button>
      </div>
      {full ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#111', display: 'flex', flexDirection: 'column' }}>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setFull(false)}
            style={{ alignSelf: 'flex-end', margin: 10, border: 0, background: 'rgba(255,255,255,.12)', color: '#fff', width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center' }}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
          <button
            ref={frameRef}
            type="button"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            style={{ flex: 1, overflow: 'hidden', border: 0, padding: 0, background: 'transparent', touchAction: 'none' }}
          >
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center', display: 'flex', justifyContent: 'center' }}>
              <PriceSheetPaper sheet={sheet} logoSrc={logoSrc} format={format} />
            </div>
          </button>
        </div>
      ) : null}
    </PhoneShell>
  )
}
