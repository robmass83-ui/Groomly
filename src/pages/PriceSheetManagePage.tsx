import { ChevronDown, ChevronUp, Eye, EyeOff, Image, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type CSSProperties, type ChangeEvent } from 'react'
import { PRICE_ICONS, type PriceIconKey } from '../assets/icons/icons'
import { PriceIcon } from '../components/domain/PriceIcon'
import { PriceAmountInput } from '../components/priceSheet/PriceAmountInput'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { SectionTitle } from '../components/ui/SectionTitle'
import { useFileSrc } from '../hooks/useFileSrc'
import { useSettings } from '../hooks/useSettings'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { prepareLogo } from '../lib/dogPhoto'
import { guardCaptureClick } from '../lib/photoCapture'
import {
  breedsBySize,
  duplicateBreed,
  getPriceSheet,
  iconForName,
  NOME_SERVIZIO_NUOVO,
  PRICE_SHEET_NOT_SAVED,
  PRICE_SHEET_UNREADABLE,
  savePriceSheet,
  moveBreed,
  moveSection,
  removeBreed,
  toggleSection,
  upsertBreed,
} from '../lib/priceSheet'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { TAGLIA_GRANDE, TAGLIA_MEDIA, TAGLIA_PICCOLA } from '../lib/dogList'
import type { DogSize } from '../types/models'
import type { Breed, PriceItem, PriceKind, PriceSheet, SheetSectionId } from '../types/priceSheet'

const COLORS = ['#B8285E', '#3A5BA0', '#15905B', '#B4561E', '#1D1A1B'] as const
const SIZES_UI: DogSize[] = [TAGLIA_PICCOLA, TAGLIA_MEDIA, TAGLIA_GRANDE]
const SECTION_LABEL: Partial<Record<SheetSectionId, string>> = {
  bagnoTosatura: 'Bagno + tosatura',
  info: 'Informazioni importanti',
  avviso: 'Avviso pulci e zecche',
  compresi: 'Compresi nel bagno',
  saluto: 'Saluto finale',
}
const CATALOGO = ['Bagno', 'Bagno + tosatura', 'Bagno + sistemazione', 'Pelo corto', 'Pelo lungo', 'Tosatura'] as const
const PICK: PriceIconKey[] = [
  'bagno', 'bagno_taglio', 'bagno_sistemazione', 'taglio', 'pelo_corto', 'pelo_lungo',
  'nodi', 'unghie', 'dermatologico', 'antiparassitario', 'shampoo', 'orecchie', 'occhi',
]
const KIND_OPTIONS: { value: PriceKind; label: string }[] = [
  { value: 'da', label: 'da' },
  { value: 'fisso', label: 'fisso' },
  { value: 'valutazione', label: 'valutaz.' },
]

type DraftVoce = PriceItem & { iconaScelta?: boolean }
type DraftBreed = Omit<Breed, 'voci'> & { nuova?: boolean; voci: DraftVoce[] }

function newId(): string {
  return crypto.randomUUID()
}

function defaultVoce(nome = 'Bagno'): DraftVoce {
  return { id: newId(), nome, iconKey: iconForName(nome), tipo: 'da', prezzo: 0 }
}

function sectionBlurb(sheet: PriceSheet, id: SheetSectionId): string {
  if (id === TAGLIA_PICCOLA || id === TAGLIA_MEDIA || id === TAGLIA_GRANDE) {
    const n = breedsBySize(sheet, id).length
    return id === TAGLIA_GRANDE && sheet.noteTaglia.grande ? `${n} razze + nota` : `${n} razze`
  }
  if (id === 'bagnoTosatura') return `${sheet.bagnoTosatura.voci.length} prezzi indicativi`
  if (id === 'extra') return sheet.extra.voci.map((item) => item.nome.split(' ')[0]).join(' · ')
  if (id === 'info') return `${sheet.info.punti.length} punti + supplemento`
  if (id === 'avviso') return `${sheet.avviso.punti.length} punti · riquadro`
  if (id === 'compresi') return sheet.compresi.voci.map((item) => item.testo).join(' · ')
  return sheet.saluto
}

function FieldArea({ label, value, rows = 2, onChange, onBlur }: { label: string; value: string; rows?: number; onChange: (value: string) => void; onBlur?: (value: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap, margin: 0, fontSize: TYPE.base }}>
      <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
        style={{
          minHeight: SIZES.field.areaMin,
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: SIZES.field.radius,
          border: '1px solid var(--line2)',
          background: 'var(--card)',
          color: 'var(--tx)',
          padding: 8,
          font: 'inherit',
          resize: 'vertical',
          ...USER_TEXT,
        }}
      />
    </label>
  )
}

function chipStyle(dashed?: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minHeight: 26,
    height: 'auto',
    padding: dashed ? '4px 8px' : '4px 8px 4px 5px',
    borderRadius: 999,
    border: dashed ? '1px dashed var(--pri)' : '1px solid var(--line)',
    background: 'var(--card)',
    color: dashed ? 'var(--pri)' : 'var(--tx)',
    fontSize: 11,
    fontWeight: 600,
    ...USER_TEXT,
  }
}

export function PriceSheetManagePage() {
  const frasi = useFrasi()
  function nomeSezione(id: SheetSectionId): string {
    if (id === TAGLIA_PICCOLA) return frasi.manTagliaPiccola
    if (id === TAGLIA_MEDIA) return frasi.manTagliaMedia
    if (id === TAGLIA_GRANDE) return frasi.manTagliaGrande
    if (id === 'extra') return frasi.manServiziExtra
    return SECTION_LABEL[id] ?? ''
  }
  const { lingua } = useLingua()
  const toast = useToast()
  const { settings, save } = useSettings()
  const sheet = getPriceSheet(settings)
  const logoSrc = useFileSrc(sheet.intestazione.logo, 'full')
  const logoRef = useRef<HTMLInputElement>(null)
  const [edit, setEdit] = useState<DraftBreed | null>(null)
  const [iconPick, setIconPick] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function persist(next: PriceSheet): boolean {
    const message = savePriceSheet(settings, next, save)
    if (message) {
      toast.show(message === PRICE_SHEET_UNREADABLE ? frasi.lisIlleggibile : message === PRICE_SHEET_NOT_SAVED ? frasi.manNonSalvato : message, 'plain')
      return false
    }
    return true
  }

  function patchHeader(partial: Partial<PriceSheet['intestazione']>) {
    persist({ ...sheet, intestazione: { ...sheet.intestazione, ...partial } })
  }

  async function onLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      patchHeader({ logo: await prepareLogo(file) })
    } catch {
      toast.show(frasi.schedaFotoGrande, 'plain')
    }
  }

  function openNew() {
    setIconPick(null)
    setEdit({ id: newId(), nuova: true, taglia: TAGLIA_PICCOLA, nome: '', voci: [defaultVoce()] })
  }

  function openEdit(breed: Breed) {
    setIconPick(null)
    setConfirmDelete(false)
    setEdit({ ...breed, voci: breed.voci.map((voce) => ({ ...voce })) })
  }

  function saveBreed() {
    if (!edit) return
    const nome = edit.nome.trim()
    if (!nome) {
      toast.show(frasi.manNomeVuoto, 'plain')
      return
    }
    const voci = edit.voci.map(({ iconaScelta: _chosen, ...voce }) => ({ ...voce, nome: voce.nome.trim() }))
    const negative = voci.some((voce) => voce.prezzo != null && voce.prezzo < 0)
    if (voci.length === 0 || voci.some((voce) => voce.nome.length === 0) || negative) {
      toast.show(frasi.manNonSalvato, 'plain')
      return
    }
    const breed: Breed = { id: edit.id, taglia: edit.taglia, nome, voci }
    if (!persist(upsertBreed(sheet, breed))) return
    setEdit(null)
  }

  function confirmRemove() {
    if (!edit) return
    if (!persist(removeBreed(sheet, edit.id))) return
    setConfirmDelete(false)
    setEdit(null)
  }

  function onDuplicate() {
    if (!edit) return
    if (!persist(duplicateBreed(sheet, edit.id, newId))) return
    setEdit(null)
  }

  function setVoce(index: number, patch: Partial<DraftVoce>) {
    if (!edit) return
    setEdit({
      ...edit,
      voci: edit.voci.map((voce, i) => {
        if (i !== index) return voce
        const next = { ...voce, ...patch }
        if (patch.nome != null && !voce.iconaScelta && patch.iconKey == null) next.iconKey = iconForName(patch.nome)
        return next
      }),
    })
  }

  function addVoce(nome: string) {
    if (!edit) return
    setEdit({ ...edit, voci: [...edit.voci, defaultVoce(nome)] })
  }

  const isNew = !!edit?.nuova
  const { nome, descrizione, indirizzo, telefono, colore, logo } = sheet.intestazione

  return (
    <PhoneShell>
      <Header title={frasi.lisGestione} subtitle={frasi.manSottotitolo} backTo="/listino" />
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionTitle>Intestazione e logo</SectionTitle>
        <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
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
                <Image size={22} strokeWidth={2} aria-hidden color="var(--tx3)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              <Button variant="tonal" size="md" onClick={() => logoRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Image size={14} strokeWidth={2} aria-hidden />
                {logo ? 'Cambia logo' : 'Carica logo'}
              </Button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                hidden
                aria-label={logo ? 'Cambia logo' : 'Carica logo'}
                onClick={(event) => guardCaptureClick(event, () => toast.show(frasi.schedaPermessoFoto, 'plain'))}
                onChange={onLogo}
              />
              {logo ? (
                <Button variant="ghost" size="sm" onClick={() => persist({ ...sheet, intestazione: { ...sheet.intestazione, logo: undefined } })} style={{ color: 'var(--bad)', alignSelf: 'flex-start' }}>
                  Rimuovi logo
                </Button>
              ) : (
                <span style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>PNG o JPG · meglio quadrato con sfondo trasparente</span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input label="Nome salone" value={nome} onChange={(event) => patchHeader({ nome: event.target.value })} style={USER_TEXT} />
            <Input label="Descrizione" value={descrizione} onChange={(event) => patchHeader({ descrizione: event.target.value })} style={USER_TEXT} />
            <Input label={frasi.authIndirizzo} value={indirizzo} onChange={(event) => patchHeader({ indirizzo: event.target.value })} style={USER_TEXT} />
            <Input label={frasi.schedaTelefono} value={telefono} onChange={(event) => patchHeader({ telefono: event.target.value })} style={USER_TEXT} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>Colore del foglio</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Colore ${hex}`}
                  onClick={() => patchHeader({ colore: hex })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    border: 0,
                    background: hex,
                    boxShadow: colore === hex ? `0 0 0 2px var(--card), 0 0 0 4px ${hex}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <span style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>Nome, indirizzo e telefono partono da Impostazioni › Attività.</span>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
          <div style={{ flex: 1 }}><SectionTitle>Razze</SectionTitle></div>
          <Button size="sm" onClick={openNew} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Plus size={14} strokeWidth={2} aria-hidden />
            {frasi.manRazza}
          </Button>
        </div>

        {SIZES_UI.map((size) => {
          const razze = breedsBySize(sheet, size)
          const titolo = size === TAGLIA_PICCOLA ? frasi.lisTagliaPiccola : size === TAGLIA_MEDIA ? frasi.lisTagliaMedia : frasi.lisTagliaGrande
          const regione = size === TAGLIA_PICCOLA ? frasi.manTagliaPiccola : size === TAGLIA_MEDIA ? frasi.manTagliaMedia : frasi.manTagliaGrande
          return (
            <section key={size} aria-label={regione}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', background: 'var(--pri-s)' }}>
                  <b style={{ flex: 1, fontSize: 11, letterSpacing: '0.06em', color: 'var(--pri-ink)' }}>{titolo}</b>
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
                {razze.map((breed, index) => (
                  <div key={breed.id} style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '4px 4px 4px 9px', borderTop: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => openEdit(breed)}
                      style={{ flex: 1, border: 0, background: 'transparent', textAlign: 'left', padding: 0, color: 'inherit', ...USER_TEXT }}
                    >
                      <b style={{ fontSize: TYPE.rowTitle, ...USER_TEXT }}>{breed.nome}</b>
                      <span style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)', ...USER_TEXT }}>{breed.voci.map((voce) => voce.nome).join(' · ')}</span>
                    </button>
                    <span style={{ display: 'flex', gap: 2, flex: 'none' }}>
                      {breed.voci.slice(0, 4).map((voce) => (
                        <PriceIcon key={voce.id} iconKey={voce.iconKey} size={16} />
                      ))}
                    </span>
                    <IconButton label={`Sposta su ${breed.nome}`} disabled={index === 0} onClick={() => persist(moveBreed(sheet, breed.id, -1))} style={{ background: 'transparent' }}>
                      <ChevronUp size={16} strokeWidth={2} aria-hidden />
                    </IconButton>
                    <IconButton label={`Sposta giù ${breed.nome}`} disabled={index === razze.length - 1} onClick={() => persist(moveBreed(sheet, breed.id, 1))} style={{ background: 'transparent' }}>
                      <ChevronDown size={16} strokeWidth={2} aria-hidden />
                    </IconButton>
                  </div>
                ))}
                <div style={{ padding: '7px 9px', borderTop: '1px solid var(--line)' }}>
                  <FieldArea
                    label="Nota sotto la taglia"
                    rows={2}
                    value={sheet.noteTaglia[size]}
                    onChange={(value) => persist({ ...sheet, noteTaglia: { ...sheet.noteTaglia, [size]: value } })}
                  />
                </div>
              </Card>
            </section>
          )
        })}

        <SectionTitle>Sezioni del foglio</SectionTitle>
        <Card>
          {sheet.sezioni.map((section, index) => (
            <div key={section.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 4px 3px 9px', minHeight: 44, borderTop: index ? '1px solid var(--line)' : 0 }}>
              <span style={{ flex: 1, minWidth: 0, color: section.visibile ? undefined : 'var(--tx3)' }}>
                <b>{nomeSezione(section.id)}</b>
                <span style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{sectionBlurb(sheet, section.id)}</span>
              </span>
              <IconButton label={`Sposta su ${nomeSezione(section.id)}`} disabled={index === 0} onClick={() => persist(moveSection(sheet, index, -1))} style={{ background: 'transparent' }}>
                <ChevronUp size={16} strokeWidth={2} aria-hidden />
              </IconButton>
              <IconButton label={`Sposta giù ${nomeSezione(section.id)}`} disabled={index === sheet.sezioni.length - 1} onClick={() => persist(moveSection(sheet, index, 1))} style={{ background: 'transparent' }}>
                <ChevronDown size={16} strokeWidth={2} aria-hidden />
              </IconButton>
              <IconButton
                label={t(lingua, section.visibile ? 'manNascondi' : 'manMostra', { nome: section.id === 'extra' ? frasi.manServiziExtra : nomeSezione(section.id) })}
                onClick={() => persist(toggleSection(sheet, section.id))}
                style={{ background: 'transparent', color: section.visibile ? 'var(--pri)' : 'var(--tx3)' }}
              >
                {section.visibile ? <Eye size={16} strokeWidth={2} aria-hidden /> : <EyeOff size={16} strokeWidth={2} aria-hidden />}
              </IconButton>
            </div>
          ))}
        </Card>

        <SectionTitle>Testi</SectionTitle>
        <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldArea label="Informazioni importanti · frase iniziale" value={sheet.info.intro} onChange={(intro) => persist({ ...sheet, info: { ...sheet.info, intro } })} />
          <FieldArea
            label={frasi.manPunti}
            rows={4}
            value={sheet.info.punti.join('\n')}
            onChange={(value) => persist({ ...sheet, info: { ...sheet.info, punti: value.split('\n') } })}
            onBlur={(value) => persist({ ...sheet, info: { ...sheet.info, punti: value.split('\n').map((line) => line.trim()).filter(Boolean) } })}
          />
          <FieldArea label="Frase finale" value={sheet.info.chiusura} onChange={(chiusura) => persist({ ...sheet, info: { ...sheet.info, chiusura } })} />
          <Input label="Avviso · titolo" value={sheet.avviso.titolo} onChange={(event) => persist({ ...sheet, avviso: { ...sheet.avviso, titolo: event.target.value } })} />
          <FieldArea
            label="Avviso · punti (uno per riga)"
            rows={3}
            value={sheet.avviso.punti.join('\n')}
            onChange={(value) => persist({ ...sheet, avviso: { ...sheet.avviso, punti: value.split('\n') } })}
            onBlur={(value) => persist({ ...sheet, avviso: { ...sheet.avviso, punti: value.split('\n').map((line) => line.trim()).filter(Boolean) } })}
          />
          <Input label="Saluto finale" value={sheet.saluto} onChange={(event) => persist({ ...sheet, saluto: event.target.value })} />
        </Card>
      </div>

      <Sheet
        open={edit !== null}
        title={isNew ? frasi.manNuovaRazza : frasi.manModificaRazza}
        onClose={() => { setEdit(null); setIconPick(null) }}
        closeButton
        footer={(
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isNew ? (
              <>
                <Button variant="bad" size="md" aria-label={frasi.manEliminaRazza} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} strokeWidth={2} aria-hidden />
                </Button>
                <Button variant="secondary" size="md" onClick={onDuplicate}>{frasi.manDuplica}</Button>
              </>
            ) : null}
            <span style={{ flex: 1 }} />
            <Button size="md" onClick={saveBreed} style={{ minWidth: 110 }}>{frasi.schedaSalva}</Button>
          </div>
        )}
      >
        {edit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input
              id="breed-name"
              label={frasi.manNomeListino}
              value={edit.nome}
              placeholder="Es. Barboncino toy"
              onChange={(event) => setEdit({ ...edit, nome: event.target.value })}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.manTaglia}</span>
              <Segmented
                label={frasi.manTaglia}
                fill
                value={edit.taglia}
                onChange={(taglia) => setEdit({ ...edit, taglia })}
                options={SIZES_UI.map((size) => ({ value: size, label: size === TAGLIA_PICCOLA ? frasi.lisPiccola : size === TAGLIA_MEDIA ? frasi.lisMedia : frasi.lisGrande }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>Servizi e prezzi</span>
              <Card style={{ boxShadow: 'none' }}>
                {edit.voci.map((voce, index) => (
                  <div key={voce.id} style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', padding: '5px 4px 5px 7px', borderTop: index ? '1px solid var(--line)' : 0 }}>
                    <button type="button" aria-label={frasi.manCambiaIcona} onClick={() => setIconPick(iconPick === index ? null : index)} style={{ border: 0, background: 'transparent', padding: 0, width: 44, height: 44, display: 'grid', placeItems: 'center' }}>
                      <IconTile tone={voce.iconKey} size="sm">
                        <PriceIcon iconKey={voce.iconKey} size={16} />
                      </IconTile>
                    </button>
                    <input
                      value={voce.nome}
                      aria-label={t(lingua, 'manNomeServizio', { n: index + 1 })}
                      onChange={(event) => setVoce(index, { nome: event.target.value })}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 7,
                        border: '1px solid var(--line2)',
                        padding: '0 7px',
                        background: 'var(--card)',
                        color: 'var(--tx)',
                        font: 'inherit',
                        ...USER_TEXT,
                      }}
                    />
                    <select
                      value={voce.tipo}
                      aria-label={t(lingua, 'lisTipo', { nome: voce.nome })}
                      onChange={(event) => setVoce(index, { tipo: event.target.value as PriceKind })}
                      style={{ width: 74, height: 44, borderRadius: 7, border: '1px solid var(--line2)', background: 'var(--card)', fontSize: 12, padding: '0 2px', color: 'var(--tx)' }}
                    >
                      {KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {voce.tipo === 'valutazione' ? null : (
                      <label style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 6px', borderRadius: 7, border: '1px solid var(--line2)' }}>
                        <PriceAmountInput
                          aria-label={t(lingua, 'lisPrezzoDi', { nome: voce.nome })}
                          value={voce.prezzo ?? 0}
                          onCommit={(prezzo) => setVoce(index, { prezzo })}
                          style={{ width: 52, height: 44, border: 0, background: 'transparent', color: 'var(--tx)', font: 'inherit', padding: 0 }}
                        />
                        <span>€</span>
                      </label>
                    )}
                    <IconButton label={frasi.manTogli} onClick={() => setEdit({ ...edit, voci: edit.voci.filter((_, i) => i !== index) })} style={{ background: 'transparent', color: 'var(--bad)', width: 44, height: 44 }}>
                      ×
                    </IconButton>
                    {iconPick === index ? (
                      <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: 5, padding: '6px 0 2px' }}>
                        {PICK.map((key) => (
                          <button
                            key={key}
                            type="button"
                            title={PRICE_ICONS[key].label}
                            aria-label={PRICE_ICONS[key].label}
                            onClick={() => { setVoce(index, { iconKey: key, iconaScelta: true }); setIconPick(null) }}
                            style={{
                              border: voce.iconKey === key ? '2px solid var(--pri)' : '1px solid var(--line)',
                              background: 'var(--card)',
                              borderRadius: 8,
                              minWidth: 44,
                              minHeight: 44,
                              display: 'grid',
                              placeItems: 'center',
                              padding: 0,
                            }}
                          >
                            <PriceIcon iconKey={key} size={22} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </Card>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>Aggiungi servizio</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {CATALOGO.map((nomeServizio) => (
                  <button key={nomeServizio} type="button" onClick={() => addVoce(nomeServizio)} style={chipStyle()}>
                    <PriceIcon iconKey={iconForName(nomeServizio)} size={16} />
                    {nomeServizio}
                  </button>
                ))}
                <button type="button" onClick={() => addVoce(NOME_SERVIZIO_NUOVO)} style={chipStyle(true)}>{frasi.manPersonalizzato}</button>
              </div>
            </div>
          </div>
        ) : null}
      </Sheet>

      <Dialog open={confirmDelete} title={frasi.manEliminaDomanda} onClose={() => setConfirmDelete(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          {frasi.manRazzaSparisce}
        </p>
        <Button variant="bad" onClick={confirmRemove}>{frasi.lisElimina}</Button>
        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{frasi.homeAnnulla}</Button>
      </Dialog>
    </PhoneShell>
  )
}
