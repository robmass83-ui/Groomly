import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PriceIcon } from '../components/domain/PriceIcon'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { useSettings } from '../hooks/useSettings'
import { applyBulk, breedsBySize, commitDraft, getPriceSheet, iconForName, type BulkOp } from '../lib/priceSheet'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { PriceIconKey } from '../assets/icons/icons'
import type { DogSize } from '../types/models'
import type { PriceItem, PriceSheet } from '../types/priceSheet'

type Scope = DogSize | 'extra'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'piccola', label: 'Piccola' },
  { id: 'media', label: 'Media' },
  { id: 'grande', label: 'Grande' },
  { id: 'extra', label: 'Extra' },
]

const OPS: { id: BulkOp; label: string; variant: 'tonal' | 'secondary' }[] = [
  { id: 'p5', label: '+5%', variant: 'tonal' },
  { id: 'p10', label: '+10%', variant: 'tonal' },
  { id: 'e+1', label: '+1 €', variant: 'tonal' },
  { id: 'e-1', label: '−1 €', variant: 'tonal' },
  { id: 'round', label: 'Arrotonda', variant: 'secondary' },
]

function draftKey(parentId: string, itemId: string): string {
  return `${parentId}:${itemId}`
}

function amountText(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

function parseAmount(raw: string): number | null {
  const parsed = Number(raw.replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : null
}

type Group = {
  id: string
  nome: string
  tipoPrefix?: string
  iconKey?: PriceIconKey
  voci: Array<Pick<PriceItem, 'id' | 'nome' | 'tipo' | 'prezzo'> & { iconKey?: PriceIconKey }>
}

function groupsFor(sheet: PriceSheet, scope: Scope): Group[] {
  if (scope !== 'extra') {
    return breedsBySize(sheet, scope).map((breed) => ({
      id: breed.id,
      nome: breed.nome,
      tipoPrefix: 'Tipo ',
      voci: breed.voci,
    }))
  }
  return [
    {
      id: 'bagnoTosatura',
      nome: 'Bagno + tosatura (indicativo)',
      iconKey: iconForName('Bagno + tosatura'),
      voci: sheet.bagnoTosatura.voci,
    },
    ...sheet.extra.voci.map((extra) => ({
      id: extra.id,
      nome: extra.nome,
      iconKey: extra.iconKey,
      voci: extra.sotto.length > 0 ? extra.sotto : [extra],
    })),
  ]
}

function PriceField({
  parentId,
  parentNome,
  extra,
  item,
  draft,
  onChange,
}: {
  parentId: string
  parentNome: string
  extra: boolean
  item: Pick<PriceItem, 'id' | 'nome' | 'tipo' | 'prezzo'>
  draft: Record<string, number>
  onChange: (key: string, value: number | undefined) => void
}) {
  if (item.tipo === 'valutazione') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 30,
          padding: '0 8px',
          borderRadius: 7,
          border: '1px dashed var(--warn)',
          background: 'var(--warn-s)',
          color: 'var(--warn)',
          fontSize: TYPE.meta,
          fontWeight: 700,
        }}
      >
        su valutazione
      </span>
    )
  }

  const key = draftKey(parentId, item.id)
  const changed = key in draft
  const current = draft[key] ?? item.prezzo ?? 0
  const label = extra ? `Prezzo ${item.nome}` : `Prezzo ${item.nome} ${parentNome}`

  return (
    <>
      {changed && item.prezzo != null ? (
        <span style={{ fontSize: TYPE.meta, color: 'var(--tx3)', textDecoration: 'line-through' }}>{amountText(item.prezzo)}</span>
      ) : null}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 30,
          padding: '0 7px',
          borderRadius: 7,
          border: changed ? '1.5px solid var(--pri)' : '1px solid var(--line2)',
          background: changed ? 'var(--pri-s)' : 'var(--card)',
          color: changed ? 'var(--pri-ink)' : 'var(--tx)',
        }}
      >
        {item.tipo === 'da' ? <span style={{ fontSize: TYPE.meta, color: 'inherit' }}>da</span> : null}
        <input
          inputMode="decimal"
          aria-label={label}
          value={amountText(current)}
          onChange={(event) => {
            const parsed = parseAmount(event.target.value)
            if (parsed == null) return
            onChange(key, item.prezzo != null && parsed === item.prezzo ? undefined : parsed)
          }}
          style={{
            width: 34,
            height: 30,
            border: 0,
            outline: 0,
            background: 'transparent',
            color: 'inherit',
            textAlign: 'right',
            fontWeight: 700,
            fontSize: TYPE.base,
            padding: 0,
            font: 'inherit',
          }}
        />
        <span style={{ fontWeight: 600 }}>€</span>
      </label>
    </>
  )
}

export function PriceSheetPricesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { settings, save } = useSettings()
  const sheet = getPriceSheet(settings)
  const [scope, setScope] = useState<Scope>('piccola')
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [leaveOpen, setLeaveOpen] = useState(false)
  const dirty = Object.keys(draft).length
  const groups = groupsFor(sheet, scope)
  const extra = scope === 'extra'

  function setDraftValue(key: string, value: number | undefined) {
    setDraft((current) => {
      const next = { ...current }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }

  function apply(op: BulkOp) {
    setDraft(applyBulk(sheet, scope, op, draft))
  }

  function persist() {
    if (!save({ ...settings, priceSheet: commitDraft(sheet, draft) })) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    setDraft({})
    toast.show('Prezzi salvati', 'ok')
  }

  function confirmLeave() {
    setLeaveOpen(false)
    navigate('/listino')
  }

  function guardBack(event: MouseEvent) {
    if (dirty === 0) return
    const target = event.target
    if (!(target instanceof Element)) return
    if (!target.closest('a[aria-label="Indietro"]')) return
    event.preventDefault()
    event.stopPropagation()
    setLeaveOpen(true)
  }

  return (
    <PhoneShell>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }} onClickCapture={guardBack}>
        <Header
          title="Aggiorna prezzi"
          subtitle="Tocca un prezzo per cambiarlo"
          backTo="/listino"
          action={(
            <Button variant="ghost" size="sm" onClick={() => setDraft({})}>
              Annulla tutto
            </Button>
          )}
        />
        <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 7, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {SCOPES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={scope === item.id}
                onClick={() => setScope(item.id)}
                style={{
                  height: SIZES.filterChip.h,
                  padding: `0 ${SIZES.filterChip.padX}px`,
                  borderRadius: 999,
                  fontSize: SIZES.filterChip.font,
                  fontWeight: 600,
                  border: scope === item.id ? '1px solid transparent' : '1px solid var(--line2)',
                  background: scope === item.id ? 'var(--pri-s)' : 'var(--card)',
                  color: scope === item.id ? 'var(--pri-ink)' : 'var(--tx2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: TYPE.meta, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tx3)' }}>Tutti</span>
            {OPS.map((op) => (
              <Button key={op.id} size="sm" variant={op.variant} onClick={() => apply(op.id)}>
                {op.label}
              </Button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 16px' }}>
          <Card>
            {groups.map((group) => (
              <div key={group.id}>
                <div style={{ padding: '7px 9px 2px', fontWeight: 700, background: 'var(--surf)', borderTop: '1px solid var(--line)' }}>
                  {group.tipoPrefix}
                  {group.nome}
                </div>
                {group.voci.map((voce) => (
                  <div
                    key={voce.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 42,
                      padding: '5px 9px',
                    }}
                  >
                    <IconTile tone={voce.iconKey ?? group.iconKey ?? iconForName(voce.nome)} size="sm">
                      <PriceIcon iconKey={voce.iconKey ?? group.iconKey ?? iconForName(voce.nome)} size={14} />
                    </IconTile>
                    <span style={{ flex: 1 }}>{voce.nome}</span>
                    <PriceField
                      parentId={group.id}
                      parentNome={group.nome}
                      extra={extra}
                      item={voce}
                      draft={draft}
                      onChange={setDraftValue}
                    />
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>
        <div
          style={{
            background: 'var(--card)',
            borderTop: '1px solid var(--line)',
            boxShadow: 'var(--sh-foot)',
            padding: `${SIZES.sheet.footer.padTop}px ${SIZES.sheet.footer.padX}px ${SIZES.sheet.footer.padBottom}px`,
            display: 'flex',
            gap: SIZES.sheet.footer.gap,
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, lineHeight: 1.3 }}>
            <b>
              {dirty}
              {' '}
              {dirty === 1 ? 'prezzo modificato' : 'prezzi modificati'}
            </b>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>Il foglio di stampa si aggiorna da solo</div>
          </div>
          <Button disabled={dirty === 0} onClick={persist} style={dirty === 0 ? { opacity: 0.5 } : undefined}>
            Salva
          </Button>
        </div>
      </div>
      <Dialog open={leaveOpen} title="Uscire senza salvare?" onClose={() => setLeaveOpen(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          Le modifiche non salvate andranno perse.
        </p>
        <Button onClick={confirmLeave}>Conferma</Button>
        <Button variant="ghost" onClick={() => setLeaveOpen(false)}>Annulla</Button>
      </Dialog>
    </PhoneShell>
  )
}
