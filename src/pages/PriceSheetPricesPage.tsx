import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PriceIcon } from '../components/domain/PriceIcon'
import { PriceAmountInput } from '../components/priceSheet/PriceAmountInput'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import { applyBulk, breedsBySize, commitDraft, getPriceSheet, iconForName, PRICE_SHEET_UNREADABLE, savePriceSheet, type BulkOp } from '../lib/priceSheet'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { PriceIconKey } from '../assets/icons/icons'
import type { DogSize } from '../types/models'
import type { PriceItem, PriceSheet } from '../types/priceSheet'

type Scope = DogSize | 'extra'

const OPS: { id: BulkOp; label: '+5%' | '+10%' | '+1 €' | '−1 €' | 'round'; variant: 'tonal' | 'secondary' }[] = [
  { id: 'p5', label: '+5%', variant: 'tonal' },
  { id: 'p10', label: '+10%', variant: 'tonal' },
  { id: 'e+1', label: '+1 €', variant: 'tonal' },
  { id: 'e-1', label: '−1 €', variant: 'tonal' },
  { id: 'round', label: 'round', variant: 'secondary' },
]

function draftKey(parentId: string, itemId: string): string {
  return `${parentId}:${itemId}`
}

function amountText(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

type Group = {
  id: string
  nome: string
  tipoPrefix?: string
  iconKey?: PriceIconKey
  voci: Array<Pick<PriceItem, 'id' | 'nome' | 'tipo' | 'prezzo'> & { iconKey?: PriceIconKey }>
}

function groupsFor(sheet: PriceSheet, scope: Scope, tipo: string, bagno: string): Group[] {
  if (scope !== 'extra') {
    return breedsBySize(sheet, scope).map((breed) => ({
      id: breed.id,
      nome: breed.nome,
      tipoPrefix: tipo,
      voci: breed.voci,
    }))
  }
  return [
    {
      id: 'bagnoTosatura',
      nome: bagno,
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
  prezzoDi,
  prezzoDiTaglia,
  da,
  valutazione,
}: {
  parentId: string
  parentNome: string
  extra: boolean
  item: Pick<PriceItem, 'id' | 'nome' | 'tipo' | 'prezzo'>
  draft: Record<string, number>
  onChange: (key: string, value: number | undefined) => void
  prezzoDi: string
  prezzoDiTaglia: string
  da: string
  valutazione: string
}) {
  if (item.tipo === 'valutazione') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 44,
          padding: '0 8px',
          borderRadius: 7,
          border: '1px dashed var(--warn)',
          background: 'var(--warn-s)',
          color: 'var(--warn)',
          fontSize: TYPE.meta,
          fontWeight: 700,
        }}
      >
        {valutazione}
      </span>
    )
  }

  const key = draftKey(parentId, item.id)
  const changed = key in draft
  const current = draft[key] ?? item.prezzo ?? 0
  const label = extra ? prezzoDi.replace('{{nome}}', item.nome) : prezzoDiTaglia.replace('{{nome}}', item.nome).replace('{{taglia}}', parentNome)

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
          height: 44,
          padding: '0 7px',
          borderRadius: 7,
          border: changed ? '1.5px solid var(--pri)' : '1px solid var(--line2)',
          background: changed ? 'var(--pri-s)' : 'var(--card)',
          color: changed ? 'var(--pri-ink)' : 'var(--tx)',
        }}
      >
        {item.tipo === 'da' ? <span style={{ fontSize: TYPE.meta, color: 'inherit' }}>{da}</span> : null}
        <PriceAmountInput
          aria-label={label}
          value={current}
          onCommit={(parsed) => {
            if (parsed < 0) return
            onChange(key, item.prezzo != null && parsed === item.prezzo ? undefined : parsed)
          }}
          style={{
            width: 52,
            height: 44,
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
  const frasi = useFrasi()
  const navigate = useNavigate()
  const toast = useToast()
  const { settings, save } = useSettings()
  const sheet = getPriceSheet(settings)
  const [scope, setScope] = useState<Scope>('piccola')
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const dirty = Object.keys(draft).length
  const groups = groupsFor(sheet, scope, frasi.lisTipoSpazio, frasi.lisBagnoIndicativo)
  const extra = scope === 'extra'

  function setDraftValue(key: string, value: number | undefined) {
    if (value != null && value < 0) return
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
    const message = savePriceSheet(settings, commitDraft(sheet, draft), save)
    if (message) {
      toast.show(message === PRICE_SHEET_UNREADABLE ? frasi.lisIlleggibile : message, 'plain')
      return
    }
    setDraft({})
    toast.show(frasi.lisPrezziSalvati, 'ok')
  }

  function confirmLeave() {
    setLeaveOpen(false)
    navigate('/listino')
  }

  function confirmClear() {
    setDraft({})
    setClearOpen(false)
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
          title={frasi.lisAggiornaPrezzi}
          subtitle={frasi.lisAggiornaSottotitolo}
          backTo="/listino"
          action={(
            <Button variant="ghost" size="sm" onClick={() => setClearOpen(true)}>
              {frasi.lisAnnullaTutto}
            </Button>
          )}
        />
        <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 7, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {([
              { id: 'piccola' as const, label: frasi.lisPiccola },
              { id: 'media' as const, label: frasi.lisMedia },
              { id: 'grande' as const, label: frasi.lisGrande },
              { id: 'extra' as const, label: frasi.servExtra },
            ]).map((item) => (
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
            <span style={{ fontWeight: 700, fontSize: TYPE.meta, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tx3)' }}>{frasi.lisTutti}</span>
            {OPS.map((op) => (
              <Button key={op.id} size="sm" variant={op.variant} onClick={() => apply(op.id)}>
                {op.label === 'round' ? frasi.lisArrotonda : op.label}
              </Button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 16px' }}>
          <Card>
            {groups.map((group) => (
              <div key={group.id}>
                <div style={{ padding: '7px 9px 2px', fontWeight: 700, background: 'var(--surf)', borderTop: '1px solid var(--line)', ...USER_TEXT }}>
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
                    <span style={{ flex: 1, ...USER_TEXT }}>{voce.nome}</span>
                    <PriceField
                      parentId={group.id}
                      parentNome={group.nome}
                      extra={extra}
                      item={voce}
                      draft={draft}
                      onChange={setDraftValue}
                      prezzoDi={frasi.lisPrezzoDi}
                      prezzoDiTaglia={frasi.lisPrezzoDiTaglia}
                      da={frasi.lisDa}
                      valutazione={frasi.lisSuValutazione}
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
              {dirty === 1 ? frasi.lisPrezzoUno : frasi.lisPrezziN}
            </b>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{frasi.lisFoglioSolo}</div>
          </div>
          <Button disabled={dirty === 0} onClick={persist} style={dirty === 0 ? { opacity: 0.5 } : undefined}>
            {frasi.schedaSalva}
          </Button>
        </div>
      </div>
      <Dialog open={clearOpen} title={frasi.lisAnnullaModifiche} onClose={() => setClearOpen(false)}>
        <Button onClick={confirmClear}>{frasi.lisConferma}</Button>
        <Button variant="ghost" onClick={() => setClearOpen(false)}>{frasi.homeAnnulla}</Button>
      </Dialog>
      <Dialog open={leaveOpen} title={frasi.lisEsci} onClose={() => setLeaveOpen(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          {frasi.lisModifichePerse}
        </p>
        <Button onClick={confirmLeave}>{frasi.lisConferma}</Button>
        <Button variant="ghost" onClick={() => setLeaveOpen(false)}>{frasi.homeAnnulla}</Button>
      </Dialog>
    </PhoneShell>
  )
}
