import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { TEMPERAMENT_ICONS } from '../assets/icons/icons'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { SectionHeader } from '../components/ui/SectionTitle'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import type { Lingua } from '../i18n/lingua'
import { SPECIE_ALTRO, SPECIE_CANE, SPECIE_GATTO, TAGLIE } from '../lib/dogList'
import { applyBirthYear, completeBirthday, completeYear, type AgeThresholds, type DogScreen } from '../lib/dogScreen'
import { dogFormSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { AgeCategory, ClientType, DogDraft, DogSize, Sex, Species, Temperament } from '../types/models'

const STICKER = 32

export type ScreenErrors = Partial<Record<'name' | 'owner' | 'phone' | 'birthYear' | 'compleanno' | 'weight' | 'recurrence', string>>

const DETAIL_FIELDS = ['birthYear', 'compleanno', 'weight', 'recurrence'] as const

export function weightOf(text: string): number | null {
  const raw = text.trim()
  if (raw === '') return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN
}

export function validYear(text: string, now: Date): boolean {
  return completeYear(text, now) !== null
}

export function screenErrors(value: DogScreen, requireOwner: boolean, now: Date, lingua: Lingua = 'it'): ScreenErrors {
  const errors: ScreenErrors = {}
  if (!value.name.trim()) errors.name = t(lingua, 'schedaNomeObbligatorio')
  if (requireOwner && !value.owner.trim()) errors.owner = t(lingua, 'schedaProprietarioObbligatorio')
  if (!value.phone.trim()) errors.phone = t(lingua, 'schedaTelefonoObbligatorio')
  if (value.birthYear.trim() !== '' && !validYear(value.birthYear.trim(), now)) {
    errors.birthYear = t(lingua, 'schedaAnnoInvalido')
  }
  const anno = completeYear(value.birthYear.trim(), now)
  if (completeBirthday(value.birthMonth, value.birthDay, anno) === 'invalido') {
    errors.compleanno = t(lingua, 'schedaDataInvalida')
  }
  const weight = weightOf(value.weight)
  if (weight !== null && Number.isNaN(weight)) errors.weight = t(lingua, 'schedaPesoInvalido')
  if (value.clientType === 'mensile' && !(Number.isInteger(value.recurrenceWeeks) && value.recurrenceWeeks >= 1 && value.recurrenceWeeks <= 52)) {
    errors.recurrence = t(lingua, 'schedaSettimaneInvalide')
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
  return parsed.success ? { ...parsed.data, contact: { ...parsed.data.contact, ...(value.email?.trim() ? { email: value.email.trim() } : {}) } } : null
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
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, alignItems: 'start' }}>{children}</div>
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
    <Card style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'visible' }}>
      <SectionHeader>{title}</SectionHeader>
      {children}
    </Card>
  )
}

function TemperamentPicker({ value, onChange }: { value: Temperament; onChange: (value: Temperament) => void }) {
  const frasi = useFrasi()
  const etichetta = { bravo: frasi.schedaBravo, agitato: frasi.schedaAgitato, mordace: frasi.schedaMordace }
  return (
    <div role="radiogroup" aria-label={frasi.schedaCarattere} style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
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
              minHeight: 44,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
              padding: '4px 2px',
            }}
          >
            {selected ? <Check size={13} aria-hidden style={{ position: 'absolute', top: 2, right: 2 }} /> : null}
            <img alt="" src={TEMPERAMENT_ICONS[kind].src} width={STICKER} height={STICKER} />
            {etichetta[kind]}
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
  contattiExtra?: ReactNode
  note?: ReactNode
  prices?: ReactNode
  pricesError?: string | null
  mostraEmail?: boolean
}

export function DogFields({ value, onChange, thresholds, requireOwner, onSubmit, top, details, contattiExtra, note, prices, pricesError, mostraEmail = false }: DogFieldsProps) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const formRef = useRef<HTMLFormElement>(null)
  const writingTimer = useRef<number | undefined>(undefined)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [pricesOpen, setPricesOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [writing, setWriting] = useState(false)
  const errors = submitted ? screenErrors(value, requireOwner, new Date(), lingua) : {}

  useEffect(() => () => {
    if (writingTimer.current !== undefined) window.clearTimeout(writingTimer.current)
  }, [])

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
    const found = screenErrors(value, requireOwner, new Date(), lingua)
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

  function textField(node: EventTarget | null): node is HTMLElement {
    return node instanceof HTMLElement && node.matches('input, textarea')
  }

  function onFormFocus(event: FocusEvent<HTMLFormElement>) {
    if (!textField(event.target)) return
    if (writingTimer.current !== undefined) window.clearTimeout(writingTimer.current)
    setWriting(true)
  }

  function onFormBlur(event: FocusEvent<HTMLFormElement>) {
    const form = event.currentTarget
    if (writingTimer.current !== undefined) window.clearTimeout(writingTimer.current)
    writingTimer.current = window.setTimeout(() => {
      const active = document.activeElement
      setWriting(active instanceof HTMLElement && form.contains(active) && active.matches('input, textarea'))
    }, 0)
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} onKeyDown={next} onFocus={onFormFocus} onBlur={onFormBlur} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {top}
      <FormCard title={frasi.schedaIdentita}>
        <Pair>
          <Input label={frasi.schedaNome} aria-required="true" autoCapitalize="words" autoComplete="off" value={value.name} onChange={(event) => patch({ name: event.target.value })} error={errors.name} />
          <Input label={frasi.schedaRazza} autoCapitalize="words" autoComplete="off" value={value.breed} onChange={(event) => patch({ breed: event.target.value })} />
        </Pair>
        <Choice label={frasi.schedaTaglia}>
          <Segmented<DogSize> fill label={frasi.schedaTaglia} value={value.size} onChange={(size) => patch({ size })} options={TAGLIE.map((taglia) => ({ value: taglia, label: ({ piccola: frasi.schedaPiccola, media: frasi.schedaMedia, grande: frasi.schedaGrande })[taglia] }))} />
        </Choice>
      </FormCard>
      <FormCard title={frasi.schedaContatti}>
        <Pair>
          <Input label={frasi.schedaProprietario} aria-required={requireOwner ? 'true' : undefined} autoCapitalize="words" autoComplete="off" value={value.owner} onChange={(event) => patch({ owner: event.target.value })} error={errors.owner} />
          <Input label={frasi.schedaTelefono} type="tel" inputMode="tel" aria-required="true" autoComplete="off" value={value.phone} onChange={(event) => patch({ phone: event.target.value })} error={errors.phone} />
        </Pair>
        {mostraEmail ? <Input label={frasi.emailContatto} type="email" autoComplete="off" value={value.email ?? ''} onChange={(event) => patch({ email: event.target.value })} /> : null}
      </FormCard>
      <FormCard title={frasi.schedaCarattere}>
        <TemperamentPicker value={value.temperament} onChange={(temperament) => patch({ temperament })} />
        <Input label={frasi.schedaAvvisoCritico} autoCapitalize="sentences" autoComplete="off" value={value.criticalNote} onChange={(event) => patch({ criticalNote: event.target.value })} />
      </FormCard>
      <Collapsible title={frasi.schedaAltriDettagli} open={detailsOpen} onToggle={() => setDetailsOpen((open) => !open)}>
        <Choice label={frasi.schedaSpecie}>
          <Segmented<Species> label={frasi.schedaSpecie} value={value.species} onChange={(species) => patch({ species })} options={[{ value: SPECIE_CANE, label: frasi.schedaCane }, { value: SPECIE_GATTO, label: frasi.schedaGatto }, { value: SPECIE_ALTRO, label: frasi.schedaAltro }]} />
        </Choice>
        <Choice label={frasi.schedaSesso}>
          <Segmented<'' | Sex> label={frasi.schedaSesso} value={value.sex ?? ''} onChange={(sex) => patch({ sex: sex === '' ? undefined : sex })} options={[{ value: 'M', label: frasi.schedaMaschio }, { value: 'F', label: frasi.schedaFemmina }]} />
        </Choice>
        <Choice label={frasi.schedaEta}>
          <Segmented<AgeCategory> label={frasi.schedaEta} value={value.ageCategory} onChange={(ageCategory) => patch({ ageCategory })} options={[{ value: 'cucciolo', label: frasi.etaCucciolo }, { value: 'giovane', label: frasi.etaGiovane }, { value: 'adulto', label: frasi.etaAdulto }, { value: 'anziano', label: frasi.etaAnziano }]} />
        </Choice>
        <Pair>
          <Input label={frasi.schedaAnno} inputMode="numeric" maxLength={4} autoComplete="off" value={value.birthYear} onChange={(event) => setYear(event.target.value)} error={errors.birthYear} />
          <Input label={frasi.schedaPeso} inputMode="decimal" placeholder="kg" autoComplete="off" value={value.weight} onChange={(event) => patch({ weight: event.target.value })} error={errors.weight} />
        </Pair>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 650 }}>{frasi.schedaCompleanno}</span>
          <Pair>
            <Input label={frasi.schedaGiorno} inputMode="numeric" maxLength={2} autoComplete="off" value={value.birthDay} onChange={(event) => patch({ birthDay: event.target.value.replace(/\D/g, '') })} error={errors.compleanno} />
            <Input label={frasi.schedaMese} inputMode="numeric" maxLength={2} autoComplete="off" value={value.birthMonth} onChange={(event) => patch({ birthMonth: event.target.value.replace(/\D/g, '') })} />
          </Pair>
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.schedaCompleannoAiuto}</p>
        </div>
        <FormCard title={frasi.schedaCliente}>
          <Choice label={frasi.schedaCliente}>
            <Segmented<ClientType> label={frasi.schedaCliente} value={value.clientType} onChange={(clientType) => patch({ clientType })} options={[{ value: 'mensile', label: frasi.schedaMensile }, { value: 'occasionale', label: frasi.schedaOccasionale }]} />
          </Choice>
          {value.clientType === 'mensile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.base }}>
                <label htmlFor="frequenza-settimane" style={labelStyle}>{frasi.schedaFrequenza}</label>
                <input
                  id="frequenza-settimane"
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                  aria-invalid={errors.recurrence ? true : undefined}
                  aria-describedby={errors.recurrence ? 'frequenza-settimane-errore' : undefined}
                  value={value.recurrenceWeeks > 0 ? String(value.recurrenceWeeks) : ''}
                  onChange={(event) => setWeeks(event.target.value)}
                  style={{ width: 48, height: 44, borderRadius: 9, border: `1px solid ${errors.recurrence ? 'var(--bad)' : 'var(--line)'}`, background: 'var(--card)', color: 'var(--tx)', padding: '0 8px', font: 'inherit', textAlign: 'center' }}
                />
                <span>{frasi.schedaSettimane}</span>
              </div>
              {errors.recurrence ? <span id="frequenza-settimane-errore" role="alert" style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{errors.recurrence}</span> : null}
            </div>
          ) : null}
        </FormCard>
        {contattiExtra ? <FormCard title={frasi.schedaAltriContatti}>{contattiExtra}</FormCard> : null}
        {note ? <FormCard title={frasi.schedaNoteElenco}>{note}</FormCard> : null}
        {details}
      </Collapsible>
      <Collapsible title={frasi.schedaPrezziPers} open={pricesOpen} onToggle={() => setPricesOpen((open) => !open)}>
        {prices}
        {pricesError ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{pricesError}</p> : null}
      </Collapsible>
      <div
        style={{
          position: writing ? 'static' : 'sticky',
          bottom: writing ? undefined : 'calc(72px + env(safe-area-inset-bottom, 0px))',
          padding: `${SIZES.sheet.footer.padTop}px ${SIZES.sheet.footer.padX}px ${SIZES.sheet.footer.padBottom}px`,
          boxShadow: writing ? undefined : 'var(--sh-foot)',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          gap: SIZES.sheet.footer.gap,
        }}
      >
        <Button type="submit" style={{ width: '100%' }}>{frasi.schedaSalva}</Button>
      </div>
    </form>
  )
}
