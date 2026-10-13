import '@fontsource/dancing-script/700.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/600.css'
import '@fontsource/oswald/700.css'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PriceIcon } from '../domain/PriceIcon'
import { breedsBySize, fitColumnScale, fitTitleScale, formatPricePaper, paginate } from '../../lib/priceSheet'
import type { DogSize } from '../../types/models'
import type { Breed, PriceKind, PriceSheet, SheetSectionId } from '../../types/priceSheet'
import './priceSheetPaper.css'

const TAGLIE: { id: DogSize; label: string }[] = [
  { id: 'piccola', label: 'Taglia piccola' },
  { id: 'media', label: 'Taglia media' },
  { id: 'grande', label: 'Taglia grande' },
]

type Split = Partial<Record<DogSize, number>>

export function paperLayoutSignature(sheet: PriceSheet, format: 'A4' | 'A3', logoSrc?: string): string {
  return JSON.stringify({
    format,
    logoSrc: logoSrc ?? '',
    intestazione: sheet.intestazione,
    razze: sheet.razze,
    noteTaglia: sheet.noteTaglia,
    bagnoTosatura: sheet.bagnoTosatura,
    extra: sheet.extra,
    compresi: sheet.compresi,
    info: sheet.info,
    avviso: sheet.avviso,
    saluto: sheet.saluto,
    sezioni: sheet.sezioni,
    scriviAPartireDa: sheet.opzioni.scriviAPartireDa,
  })
}

export function PriceSheetPaper({
  sheet,
  logoSrc,
  format,
}: {
  sheet: PriceSheet
  logoSrc?: string
  format: 'A4' | 'A3'
}) {
  const scale = format === 'A3' ? 1123 / 794 : 1
  const rootRef = useRef<HTMLDivElement>(null)
  const layoutKey = useRef('')
  const [pages, setPages] = useState<1 | 2>(1)
  const [split, setSplit] = useState<Split>({})
  const [fitOk, setFitOk] = useState(true)
  const [fontEpoch, setFontEpoch] = useState(0)

  useEffect(() => {
    const ready = document.fonts?.ready
    if (!ready) return
    let live = true
    void ready.then(() => {
      if (live) setFontEpoch((epoch) => epoch + 1)
    }).catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const key = paperLayoutSignature(sheet, format, logoSrc)
    if (layoutKey.current !== key) {
      layoutKey.current = key
      if (pages !== 1) {
        setPages(1)
        setSplit({})
        return
      }
    }

    const flies = [...root.querySelectorAll<HTMLElement>('.fly')]
    let allOk = true
    for (const fly of flies) {
      const { ok } = fitColumnScale((k) => {
        fly.style.setProperty('--k', String(k))
        return [...fly.querySelectorAll<HTMLElement>('.f-col .b')].some(
          (body) => body.scrollHeight > body.clientHeight + 1,
        )
      })
      if (!ok) allOk = false

      const titleBox = fly.querySelector<HTMLElement>('.f-title')
      if (!titleBox) continue
      fitTitleScale((k) => {
        titleBox.querySelectorAll<HTMLElement>('.t1, .t2').forEach((el) => {
          el.style.fontSize = `calc(${el.classList.contains('t1') ? 58 : 42}px * var(--s) * ${k})`
        })
        return [...titleBox.querySelectorAll<HTMLElement>('.t1, .t2')].some(
          (el) => el.scrollWidth > titleBox.clientWidth + 1,
        )
      })
    }
    setFitOk(allOk)

    if (pages === 1 && !allOk && flies[0]) {
      const next: Split = {}
      for (const col of flies[0].querySelectorAll<HTMLElement>('.f-col')) {
        const taglia = col.dataset.taglia as DogSize | undefined
        const body = col.querySelector<HTMLElement>('.b')
        if (!taglia || !body) continue
        const heights = [...body.querySelectorAll<HTMLElement>('.f-br')].map((el) => el.offsetHeight)
        next[taglia] = paginate(heights, body.clientHeight)
      }
      setSplit(next)
      setPages(2)
    }
  }, [sheet, format, logoSrc, pages, fontEpoch])

  const color = sheet.intestazione.colore
  const flyStyle = {
    '--s': scale,
    '--acc': color,
    '--tint': `${color}1F`,
    '--line': `${color}33`,
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      data-pages={pages === 2 ? '2' : '1'}
      data-fit-ok={fitOk}
      style={{ '--s': scale } as CSSProperties}
    >
      {pages === 1 ? (
        <Fly sheet={sheet} logoSrc={logoSrc} scale={scale} style={flyStyle} header="full" boxes saluto />
      ) : (
        <>
          <Fly
            sheet={sheet}
            logoSrc={logoSrc}
            scale={scale}
            style={flyStyle}
            header="full"
            split={split}
            page={1}
          />
          <Fly
            sheet={sheet}
            logoSrc={logoSrc}
            scale={scale}
            style={flyStyle}
            header="cont"
            split={split}
            page={2}
            boxes
            saluto
          />
        </>
      )}
    </div>
  )
}

function visible(sheet: PriceSheet, id: SheetSectionId): boolean {
  return sheet.sezioni.find((section) => section.id === id)?.visibile !== false
}

function PaperPrice({ item, da }: { item: { tipo: PriceKind; prezzo?: number }; da: boolean }) {
  const formatted = formatPricePaper(item, da)
  if ('text' in formatted) return formatted.text
  return (
    <>
      {formatted.lead}
      <b>{formatted.amount}</b> €
    </>
  )
}

function Paw({ color, size }: { color: string; size: number }) {
  return (
    <svg className="paw" width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <ellipse cx="5" cy="10" rx="2.3" ry="2.9" />
      <ellipse cx="9.4" cy="5.4" rx="2.3" ry="2.9" />
      <ellipse cx="14.6" cy="5.4" rx="2.3" ry="2.9" />
      <ellipse cx="19" cy="10" rx="2.3" ry="2.9" />
      <path d="M12 11.2c3.4 0 6.2 3.3 6.2 5.8 0 2-1.8 2.9-3.4 2.5-1.1-.3-1.8-.7-2.8-.7s-1.7.4-2.8.7c-1.6.4-3.4-.5-3.4-2.5 0-2.5 2.8-5.8 6.2-5.8z" />
    </svg>
  )
}

function Scissors({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1D1A1B" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M8.2 16 19 4M15.8 16 5 4" />
    </svg>
  )
}

function Pin({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1D1A1B" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

function Phone({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1D1A1B" aria-hidden="true">
      <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" />
    </svg>
  )
}

function Lines({ text }: { text: string }) {
  const parts = text.split('\n')
  return (
    <>
      {parts.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  )
}

function Fly({
  sheet,
  logoSrc,
  scale,
  style,
  header,
  split,
  page,
  boxes,
  saluto,
}: {
  sheet: PriceSheet
  logoSrc?: string
  scale: number
  style: CSSProperties
  header: 'full' | 'cont'
  split?: Split
  page?: 1 | 2
  boxes?: boolean
  saluto?: boolean
}) {
  const h = sheet.intestazione
  const da = sheet.opzioni.scriviAPartireDa
  const sizes = TAGLIE.filter((taglia) => visible(sheet, taglia.id)).filter((taglia) => {
    if (!split || !page) return true
    const razze = columnBreeds(sheet, taglia.id, split, page)
    const note = columnNote(sheet, taglia.id, split, page)
    return razze.length > 0 || Boolean(note)
  })

  return (
    <div className="fly" style={style}>
      <div className="frame" />
      {header === 'full' ? (
        <div className="f-top">
          <div className="f-logo">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" />
            ) : (
              <div className="ph">
                <Paw color="#1D1A1B" size={46 * scale} />
                <b>{h.nome}</b>
              </div>
            )}
          </div>
          <div className="f-title">
            <div className="t1">{h.titolo}</div>
            <div className="t2">
              <Paw color={h.colore} size={40 * scale} />
              {h.sottotitolo}
              <Paw color={h.colore} size={40 * scale} />
            </div>
            <div className="rule">
              <i />
              <Scissors size={26 * scale} />
              <i />
            </div>
          </div>
          <div className="f-info">
            <div className="n">{h.nome.toUpperCase()}</div>
            <div className="d">{h.descrizione}</div>
            <div className="a">
              <Pin size={17 * scale} />
              {h.indirizzo}
            </div>
            <div className="p">
              <Phone size={20 * scale} />
              {h.telefono}
            </div>
          </div>
        </div>
      ) : (
        <div className="f-top" style={{ gridTemplateColumns: '1fr' }}>
          <div className="f-info" style={{ borderLeft: 'none', paddingLeft: 0 }}>
            <div className="n">{h.nome.toUpperCase()}</div>
            <div className="d">LISTINO · segue</div>
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div className="f-cols">
          {sizes.map((taglia) => (
            <Column
              key={taglia.id}
              taglia={taglia.id}
              label={taglia.label}
              scale={scale}
              da={da}
              breeds={split && page ? columnBreeds(sheet, taglia.id, split, page) : breedsBySize(sheet, taglia.id)}
              note={split && page ? columnNote(sheet, taglia.id, split, page) : sheet.noteTaglia[taglia.id]}
            />
          ))}
        </div>
      )}
      {boxes ? <Boxes sheet={sheet} scale={scale} da={da} /> : null}
      {saluto && visible(sheet, 'saluto') ? (
        <div className="f-foot">
          <i />
          <Paw color={h.colore} size={22 * scale} />
          <b>{sheet.saluto}</b>
          <Paw color={h.colore} size={22 * scale} />
          <i />
        </div>
      ) : null}
    </div>
  )
}

function columnBreeds(sheet: PriceSheet, taglia: DogSize, split: Split, page: 1 | 2): Breed[] {
  const razze = breedsBySize(sheet, taglia)
  const at = split[taglia] ?? razze.length
  return page === 1 ? razze.slice(0, at) : razze.slice(at)
}

function columnNote(sheet: PriceSheet, taglia: DogSize, split: Split, page: 1 | 2): string {
  const razze = breedsBySize(sheet, taglia)
  const at = split[taglia] ?? razze.length
  const onLast = page === 1 ? at >= razze.length : at < razze.length
  return onLast ? sheet.noteTaglia[taglia] : ''
}

function Column({
  taglia,
  label,
  scale,
  da,
  breeds,
  note,
}: {
  taglia: DogSize
  label: string
  scale: number
  da: boolean
  breeds: Breed[]
  note: string
}) {
  return (
    <div className="f-col" data-taglia={taglia}>
      <div className="h">
        <Paw color="var(--acc)" size={20 * scale} />
        {label.toUpperCase()}
      </div>
      <div className="b">
        {breeds.map((breed) => (
          <div className="f-br" key={breed.id}>
            <div className="bn">
              <Paw color="#1D1A1B" size={13 * scale} />
              <span>Tipo {breed.nome}</span>
            </div>
            {breed.voci.map((voce) => (
              <div className="f-sv" key={voce.id}>
                <span>{voce.nome}</span>
                <span className="l" />
                <span className="pr">
                  <PaperPrice item={voce} da={da} />
                </span>
              </div>
            ))}
          </div>
        ))}
        {note ? (
          <div className="f-nota">
            <Paw color="#1D1A1B" size={13 * scale} />
            <span>
              <Lines text={note} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Boxes({ sheet, scale, da }: { sheet: PriceSheet; scale: number; da: boolean }) {
  const nodes: ReactNode[] = []
  for (const section of sheet.sezioni) {
    if (!section.visibile) continue
    if (section.id === 'bagnoTosatura') {
      nodes.push(
        <div className="f-box" key="bagnoTosatura" style={{ textAlign: 'left' }}>
          <h5 style={{ justifyContent: 'center', marginBottom: 0 }}>BAGNO + TOSATURA</h5>
          <div style={{ textAlign: 'center', fontSize: 'calc(11px * var(--s))', marginBottom: 'calc(4px * var(--s))' }}>
            {sheet.bagnoTosatura.sottotitolo}
          </div>
          {sheet.bagnoTosatura.voci.map((voce) => (
            <div className="x" key={voce.id}>
              <Paw color="#1D1A1B" size={12 * scale} />
              <span>{voce.nome}</span>
              <span className="l" />
              <span>
                {voce.tipo === 'da' ? 'da ' : ''}
                <b>{voce.prezzo}</b> €
              </span>
            </div>
          ))}
        </div>,
      )
    }
    if (section.id === 'extra') {
      nodes.push(
        <div className="f-box" key="extra">
          <h5 style={{ justifyContent: 'center' }}>
            <PriceIcon iconKey="dermatologico" size={20 * scale} /> SERVIZI EXTRA
          </h5>
          {sheet.extra.voci.map((voce) => (
            <Fragment key={voce.id}>
              <div className="x">
                <Paw color="#1D1A1B" size={12 * scale} />
                <span>{voce.nome}</span>
                {voce.sotto.length === 0 ? (
                  <>
                    <span className="l" />
                    <span>
                      <PaperPrice item={voce} da={da} />
                    </span>
                  </>
                ) : null}
              </div>
              {voce.sotto.map((sotto) => (
                <div
                  className="x"
                  key={sotto.id}
                  style={{
                    paddingLeft: 'calc(18px * var(--s))',
                    lineHeight: 'calc(19px * var(--s))',
                    fontSize: 'calc(10.5px * var(--s))',
                  }}
                >
                  <span>• {sotto.nome}</span>
                  <span className="l" />
                  <b style={{ fontSize: 'calc(12.5px * var(--s))' }}>{sotto.prezzo}</b> €
                </div>
              ))}
            </Fragment>
          ))}
        </div>,
      )
    }
    if (section.id === 'info') {
      nodes.push(
        <div className="f-box f-span" key="info" style={{ lineHeight: 1.45 }}>
          <h5>
            <span
              style={{
                width: 'calc(22px * var(--s))',
                height: 'calc(22px * var(--s))',
                borderRadius: '50%',
                background: sheet.intestazione.colore,
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'calc(14px * var(--s))',
              }}
            >
              i
            </span>
            {sheet.info.titolo.toUpperCase()}
          </h5>
          <div>{sheet.info.intro}</div>
          <ul>
            {sheet.info.punti.map((punto) => (
              <li key={punto}>{punto}</li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 'calc(6px * var(--s))', marginTop: 'calc(6px * var(--s))' }}>
            <span>→</span>
            <span>{sheet.info.chiusura}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'calc(8px * var(--s))' }}>
            <PriceIcon iconKey="bagno" size={40 * scale} />
          </div>
        </div>,
      )
    }
    if (section.id === 'avviso') {
      nodes.push(
        <div className="f-box f-warn" key="avviso" style={{ lineHeight: 1.35, fontSize: 'calc(10px * var(--s))' }}>
          <h5>
            <svg width={30 * scale} height={30 * scale} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 23 21H1z" fill={sheet.intestazione.colore} />
              <path d="M12 9v6M12 18h.01" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span>{sheet.avviso.titolo.toUpperCase()}</span>
          </h5>
          <div>{sheet.avviso.intro}</div>
          <ul>
            {sheet.avviso.punti.map((punto) => (
              <li key={punto}>{punto}</li>
            ))}
          </ul>
        </div>,
      )
    }
    if (section.id === 'compresi') {
      nodes.push(
        <div className="f-box" key="compresi">
          <h5>
            <svg width={30 * scale} height={30 * scale} viewBox="0 0 24 24" fill={sheet.intestazione.colore} aria-hidden="true">
              <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />
            </svg>
            {sheet.compresi.titolo.toUpperCase()}
          </h5>
          {sheet.compresi.voci.map((voce) => (
            <div
              key={voce.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'calc(10px * var(--s))',
                padding: 'calc(3px * var(--s)) calc(16px * var(--s))',
                fontSize: 'calc(12px * var(--s))',
              }}
            >
              <PriceIcon iconKey={voce.iconKey} size={20 * scale} />
              {voce.testo}
            </div>
          ))}
        </div>,
      )
    }
  }
  if (nodes.length === 0) return null
  return <div className="f-bot">{nodes}</div>
}
