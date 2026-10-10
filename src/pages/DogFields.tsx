import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { TEMPERAMENT_ICONS } from '../assets/icons/icons'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { SectionHeader } from '../components/ui/SectionTitle'
import { applyBirthYear, completeYear, type AgeThresholds, type DogScreen } from '../lib/dogScreen'
import { dogFormSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { AgeCategory, ClientType, DogDraft, DogSize, Sex, Species, Temperament } from '../types/models'

const STICKER = 48
const PAIR_MIN = 164

export type ScreenErrors = Partial<Record<'name' | 'owner' | 'phone' | 'birthYear' | 'weight' | 'recurrence', string>>

const DETAIL_FIELDS = ['birthYear', 'weight', 'recurrence'] as const

export function weightOf(text: string): number | null {
  const raw = text.trim()
  if (raw === '') return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN
}

export function validYear(text: string, now: Date): boolean {
  return completeYear(text, now) !== null
}

export function screenErrors(value: DogScreen, requireOwner: boolean, now: Date): ScreenErrors {
  const errors: ScreenErrors = {}
  if (!value.name.trim()) errors.name = 'Il nome è obbligatorio'
  if (requireOwner && !value.owner.trim()) errors.owner = 'Il proprietario è obbligatorio'
  if (!value.phone.trim()) errors.phone = 'Il telefono è obbligatorio'
  if (value.birthYear.trim() !== '' && !validYear(value.birthYear.trim(), now)) {
    errors.birthYear = 'Anno di 4 cifre, non nel futuro'
  }
  const weight = weightOf(value.weight)
  if (weight !== null && Number.isNaN(weight)) errors.weight = 'Peso non valido'
  if (value.clientType === 'mensile' && !(Number.isInteger(value.recurrenceWeeks) && value.recurrenceWeeks >= 1 && value.recurrenceWeeks <= 52)) {
    errors.recurrence = 'Da 1 a 52 settimane'
  }
  return errors
}

export function draftOf(value: DogScreen): DogDraft | null {
  const parsed = dogFormSchema.safeParse({
    name: value.name,
    species: value.species,
    breed: value.breed,
    sex: value.sex ?? '',
    ageCategory: value.ageCategory,
    size: value.size,
    temperament: value.temperament,
    clientType: value.clientType,
    contactName: value.owner,
    phone: value.phone,
    notes: value.notes,
    criticalNote: value.criticalNote,
  })
  return parsed.success ? parsed.data : null
}

const labelStyle = { fontWeight: 600, fontSize: TYPE.base } as const

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export function HiddenLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} style={srOnly}>{children}</label>
}

export function Collapsible({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const panel = useId()
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minHeight: SIZES.row.minH, border: 0, borderTop: '1px solid var(--line)', background: 'transparent', color: 'var(--tx)', font: 'inherit', fontWeight: 700, textAlign: 'left', padding: 0 }}
      >
        <Icon size={16} strokeWidth={2} aria-hidden />
        {title}
      </button>
      {open ? <div id={panel} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div> : null}
    </section>
  )
}

function Pair({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${PAIR_MIN}px, 1fr))`, gap: 8, alignItems: 'start' }}>{children}</div>
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'visible' }}>
      <SectionHeader>{title}</SectionHeader>
      {children}
    </Card>
  )
}

function TemperamentPicker({ value, onChange }: { value: Temperament; onChange: (value: Temperament) => void }) {
  return (
    <div role="radiogroup" aria-label="Carattere" style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
      {(Object.keys(TEMPERAMENT_ICONS) as Temperament[]).map((kind) => {
        const selected = value === kind
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(kind)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative',
              border: selected ? '2px solid var(--pri)' : '2px solid transparent',
              boxShadow: selected ? '0 0 0 3px var(--focus)' : undefined,
              opacity: selected ? 1 : 0.85,
              borderRadius: 12,
              background: selected ? 'var(--surf)' : 'transparent',
              color: 'var(--tx)',
              font: 'inherit',
              fontSize: TYPE.rowSub,
              fontWeight: 600,
              padding: 4,
            }}
          >
            {selected ? <Check size={13} aria-hidden style={{ position: 'absolute', top: 2, right: 2 }} /> : null}
            <img alt="" src={TEMPERAMENT_ICONS[kind].src} width={STICKER} height={STICKER} />
            {TEMPERAMENT_ICONS[kind].label}
          </button>
        )
      })}
    </div>
  )
}

function textInputs(form: HTMLFormElement | null): HTMLInputElement[] {
  if (!form) return []
  return Array.from(form.querySelectorAll('input')).filter((item) => !['file', 'checkbox', 'radio', 'hidden', 'button', 'submit'].includes(item.type) && !item.disabled)
}

export interface DogFieldsProps {
  value: DogScreen
  onChange: (next: DogScreen) => void
  thresholds: AgeThresholds
  requireOwner: boolean
  onSubmit: (draft: DogDraft) => void
  top?: ReactNode
  details?: ReactNode
  prices?: ReactNode
  pricesError?: string | null
}

export function DogFields({ value, onChange, thresholds, requireOwner, onSubmit, top, details, prices, pricesError }: DogFieldsProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [pricesOpen, setPricesOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? screenErrors(value, requireOwner, new Date()) : {}

  useEffect(() => {
    const inputs = textInputs(formRef.current)
    inputs.forEach((item, index) => item.setAttribute('enterkeyhint', index === inputs.length - 1 ? 'done' : 'next'))
  })

  useEffect(() => {
    if (pricesError) setPricesOpen(true)
  }, [pricesError])

  function patch(next: Partial<DogScreen>) {
    onChange({ ...value, ...next })
  }

  function setYear(year: string) {
    onChange({ ...value, ...applyBirthYear(value, year, new Date(), thresholds) })
  }

  function setWeeks(text: string) {
    const digits = text.replace(/\D/g, '')
    patch({ recurrenceWeeks: digits === '' ? 0 : Number(digits) })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const found = screenErrors(value, requireOwner, new Date())
    if (Object.keys(found).length > 0) {
      if (DETAIL_FIELDS.some((key) => found[key])) setDetailsOpen(true)
      return
    }
    const draft = draftOf(value)
    if (draft) onSubmit(draft)
  }

  function next(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return
    const inputs = textInputs(formRef.current)
    const index = inputs.indexOf(event.target)
    if (index === -1 || index === inputs.length - 1) return
    event.preventDefault()
    inputs[index + 1].focus()
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} onKeyDown={next} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top}
      <FormCard title="Identità">
        <Input label="Nome" aria-required="true" autoCapitalize="words" autoComplete="off" value={value.name} onChange={(event) => patch({ name: event.target.value })} error={errors.name} />
        <Pair>
          <Input label="Razza" autoCapitalize="words" autoComplete="off" value={value.breed} onChange={(event) => patch({ breed: event.target.value })} />
          <Choice label="Taglia">
            <Segmented<DogSize> fill label="Taglia" value={value.size} onChange={(size) => patch({ size })} options={[{ value: 'piccola', label: 'Piccola' }, { value: 'media', label: 'Media' }, { value: 'grande', label: 'Grande' }]} />
          </Choice>
        </Pair>
      </FormCard>
      <FormCard title="Contatti">
        <Pair>
          <Input label="Proprietario" aria-required={requireOwner ? 'true' : undefined} autoCapitalize="words" autoComplete="off" value={value.owner} onChange={(event) => patch({ owner: event.target.value })} error={errors.owner} />
          <Input label="Telefono" type="tel" inputMode="tel" aria-required="true" autoComplete="off" value={value.phone} onChange={(event) => patch({ phone: event.target.value })} error={errors.phone} />
        </Pair>
      </FormCard>
      <FormCard title="Carattere">
        <TemperamentPicker value={value.temperament} onChange={(temperament) => patch({ temperament })} />
        <Input label="Avviso critico" autoCapitalize="sentences" autoComplete="off" value={value.criticalNote} onChange={(event) => patch({ criticalNote: event.target.value })} />
      </FormCard>
      <Collapsible title="Altri dettagli" open={detailsOpen} onToggle={() => setDetailsOpen((open) => !open)}>
        <Choice label="Specie">
          <Segmented<Species> label="Specie" value={value.species} onChange={(species) => patch({ species })} options={[{ value: 'cane', label: 'Cane' }, { value: 'gatto', label: 'Gatto' }, { value: 'altro', label: 'Altro' }]} />
        </Choice>
        <Choice label="Sesso">
          <Segmented<'' | Sex> label="Sesso" value={value.sex ?? ''} onChange={(sex) => patch({ sex: sex === '' ? undefined : sex })} options={[{ value: 'M', label: 'Maschio' }, { value: 'F', label: 'Femmina' }]} />
        </Choice>
        <Choice label="Età">
          <Segmented<AgeCategory> label="Età" value={value.ageCategory} onChange={(ageCategory) => patch({ ageCategory })} options={[{ value: 'cucciolo', label: 'Cucciolo' }, { value: 'giovane', label: 'Giovane' }, { value: 'adulto', label: 'Adulto' }, { value: 'anziano', label: 'Anziano' }]} />
        </Choice>
        <Pair>
          <Input label="Anno di nascita" inputMode="numeric" maxLength={4} autoComplete="off" value={value.birthYear} onChange={(event) => setYear(event.target.value)} error={errors.birthYear} />
          <Input label="Peso" inputMode="decimal" placeholder="kg" autoComplete="off" value={value.weight} onChange={(event) => patch({ weight: event.target.value })} error={errors.weight} />
        </Pair>
        <FormCard title="Cliente">
          <Choice label="Cliente">
            <Segmented<ClientType> label="Cliente" value={value.clientType} onChange={(clientType) => patch({ clientType })} options={[{ value: 'mensile', label: 'Mensile' }, { value: 'occasionale', label: 'Occasionale' }]} />
          </Choice>
          {value.clientType === 'mensile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.base }}>
                <label htmlFor="frequenza-settimane" style={labelStyle}>Frequenza: ogni</label>
                <input
                  id="frequenza-settimane"
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                  aria-invalid={errors.recurrence ? true : undefined}
                  value={value.recurrenceWeeks > 0 ? String(value.recurrenceWeeks) : ''}
                  onChange={(event) => setWeeks(event.target.value)}
                  style={{ width: 48, height: 34, borderRadius: 9, border: `1px solid ${errors.recurrence ? 'var(--bad)' : 'var(--line)'}`, background: 'var(--card)', color: 'var(--tx)', padding: '0 8px', font: 'inherit', textAlign: 'center' }}
                />
                <span>settimane</span>
              </div>
              {errors.recurrence ? <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{errors.recurrence}</span> : null}
            </div>
          ) : null}
        </FormCard>
        <FormCard title="Note e tag">
          <Input label="Nota" autoCapitalize="sentences" autoComplete="off" value={value.notes} onChange={(event) => patch({ notes: event.target.value })} />
          {details}
        </FormCard>
      </Collapsible>
      <Collapsible title="Prezzi personalizzati" open={pricesOpen} onToggle={() => setPricesOpen((open) => !open)}>
        {prices}
        {pricesError ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{pricesError}</p> : null}
      </Collapsible>
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          padding: `${SIZES.sheet.footer.padTop}px ${SIZES.sheet.footer.padX}px ${SIZES.sheet.footer.padBottom}px`,
          boxShadow: 'var(--sh-foot)',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          gap: SIZES.sheet.footer.gap,
        }}
      >
        <Button type="submit" style={{ width: '100%' }}>Salva</Button>
      </div>
    </form>
  )
}
