import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import type { PriceFile, SettingsMain } from '../data/local/settings'
import { readFileBlob, useFileState } from '../hooks/useFileSrc'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { isFileRef } from '../lib/fileBytes'
import { openPdf, openPdfBlob } from '../lib/openDocument'
import { clampPan, pinchScale } from '../lib/pinchScale'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

function findPrice(settings: SettingsMain | null, id: string | null): PriceFile | undefined {
  if (!settings) return undefined
  if (!id) return settings.priceList
  if (settings.priceList?.id === id) return settings.priceList
  return settings.priceListHistory.find((item) => item.id === id)
}

function fingerDistance(touches: ArrayLike<{ clientX: number; clientY: number }>): number {
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

const noteStyle = { margin: 0, color: 'var(--tx3)', fontSize: TYPE.base } as const

export function PriceViewPage() {
  const [params] = useSearchParams()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { settings: stored } = useSettings()
  const settings = uid ? stored : null
  const file = findPrice(settings, params.get('id'))
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [imageBroken, setImageBroken] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const scaleRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<HTMLButtonElement>(null)
  const gesture = useRef({ distance: 0, scale: 1 })
  const drag = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  useEffect(() => {
    scaleRef.current = 1
    panRef.current = { x: 0, y: 0 }
    gesture.current = { distance: 0, scale: 1 }
    setScale(1)
    setPan({ x: 0, y: 0 })
    setImageBroken(false)
    setPdfError(null)
  }, [file?.id, file?.dataUrl, file?.mime])

  useEffect(() => {
    if (!file || file.mime !== 'application/pdf') return
    let active = true
    const { dataUrl, fileName } = file
    const opening = isFileRef(dataUrl)
      ? readFileBlob(dataUrl).then(
        (blob) => openPdfBlob(blob, fileName),
        () => {
          throw new Error('File non apribile')
        },
      )
      : openPdf(dataUrl)
    opening.catch((error: unknown) => {
      if (!active) return
      setPdfError(error instanceof Error ? error.message : 'File non apribile')
    })
    return () => {
      active = false
    }
  }, [file?.dataUrl, file?.mime])

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

  const image = file?.mime.startsWith('image/') === true
  const pdf = file?.mime === 'application/pdf'
  const { src: shownImage, failed: imageFailed } = useFileState(image ? file?.dataUrl : undefined, 'full')
  return (
    <ShellFrame>
      <Header title="Listino" backTo="/listino" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px` }}>
        {!file ? (
          <p style={noteStyle}>Nessun file</p>
        ) : image ? (
          imageBroken || imageFailed ? (
            <p style={noteStyle}>File non apribile</p>
          ) : !shownImage ? (
            <p style={noteStyle}>Apertura…</p>
          ) : (
            <button
              ref={frameRef}
              type="button"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              style={{ display: 'block', width: '100%', overflow: 'hidden', border: 'none', padding: 0, background: 'transparent', touchAction: 'none' }}
            >
              <img
                alt={file.fileName}
                src={shownImage}
                onError={() => setImageBroken(true)}
                style={{ width: '100%', transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center' }}
              />
            </button>
          )
        ) : pdf ? (
          <p style={noteStyle}>{pdfError ?? file.fileName}</p>
        ) : (
          <p style={noteStyle}>File non apribile</p>
        )}
      </div>
    </ShellFrame>
  )
}
