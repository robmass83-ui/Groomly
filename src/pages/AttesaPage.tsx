import { useState, type CSSProperties } from 'react'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { SectionHeader } from '../components/ui/SectionTitle'
import { SPECIE_ATTESA, TAGLIE_ATTESA } from '../data/local/attesa'
import { useAttesa } from '../hooks/useAttesa'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { nomeServizioVisibile } from '../i18n/servizioVisibile'
import { scegliCatalogo, type VoceCatalogo } from '../lib/catalogoPrenotazione'
import { iscrizioneManualeValida, type SpecieAttesa, type TagliaAttesa } from '../lib/listaAttesa'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Service } from '../types/models'
import { ShellFrame } from './ShellFrame'

const selectStyle: CSSProperties = {
  height: SIZES.field.h,
  boxSizing: 'border-box',
  width: '100%',
  borderRadius: SIZES.field.radius,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '0 10px',
  font: 'inherit',
}

/** Il catalogo come lo vede il sito: i servizi attivi con minuti e prezzi per taglia. */
function catalogoDa(servizi: readonly Service[]): VoceCatalogo[] {
  return servizi
    .filter((servizio) => servizio.active)
    .map((servizio) => ({
      id: servizio.id,
      nome: servizio.name,
      kind: servizio.kind,
      minuti: servizio.durationMin,
      prezzo: servizio.price,
    }))
}

export function AttesaPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { iscritti, aggiungi, togli } = useAttesa(uid)
  const { services } = useServices(uid)
  const [nome, setNome] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nomeCane, setNomeCane] = useState('')
  const [specie, setSpecie] = useState<SpecieAttesa>(SPECIE_ATTESA[0])
  const [taglia, setTaglia] = useState<TagliaAttesa>(TAGLIE_ATTESA[1])
  const [servizioId, setServizioId] = useState('')
  const [incompleto, setIncompleto] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const etichetteSpecie: Record<SpecieAttesa, string> = { cane: frasi.schedaCane, gatto: frasi.schedaGatto, altro: frasi.schedaAltro }
  const etichetteTaglia: Record<TagliaAttesa, string> = { piccola: frasi.schedaPiccola, media: frasi.schedaMedia, grande: frasi.schedaGrande }
  const principali = services.filter((servizio) => servizio.active && servizio.kind === 'principale')

  async function salva() {
    if (inCorso) return
    const servizio = principali.find((item) => item.id === servizioId)
    const scelta = servizio ? scegliCatalogo(catalogoDa(services), [servizioId], taglia) : null
    const valido = iscrizioneManualeValida({ nome, phone, email, nomeCane, servizioId, taglia, specie })
    if (!valido || !servizio || !scelta) {
      setIncompleto(true)
      return
    }
    setInCorso(true)
    try {
      await aggiungi({
        nome: nome.trim(),
        phone: phone.trim(),
        email: email.trim(),
        nomeCane: nomeCane.trim(),
        specie,
        taglia,
        servizioId,
        trattamento: servizio.name,
        durataMin: scelta.durataMin,
      })
      setNome('')
      setPhone('')
      setEmail('')
      setNomeCane('')
      setServizioId('')
      setIncompleto(false)
    } finally {
      setInCorso(false)
    }
  }

  return (
    <ShellFrame>
      <Header title={frasi.listaAttesa} subtitle={frasi.attSottotitolo.replace('{{n}}', String(iscritti.length))} backTo="/animali" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {iscritti.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', ...USER_TEXT }}>{frasi.attVuoto}</p>
        ) : (
          <Card style={{ overflow: 'visible' }}>
            <ul aria-label={frasi.attChi} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {iscritti.map((iscritto, index) => (
                <li key={iscritto.id}>
                  <Row style={{ minHeight: 56, ...(index === 0 ? { borderTop: 'none' } : {}) }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, ...USER_TEXT }}>{iscritto.nomeCane}</span>
                      <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.rowSub, ...USER_TEXT }}>{iscritto.trattamento}</span>
                    </span>
                    <Button variant="secondary" onClick={() => { void togli(iscritto.id) }} style={{ minHeight: 44, minWidth: 44, flexShrink: 0 }}>
                      {frasi.attTogli}
                    </Button>
                  </Row>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <SectionHeader>{frasi.attAggiungiTitolo}</SectionHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void salva()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Input label={frasi.attNome} value={nome} autoComplete="off" onChange={(event) => setNome(event.target.value)} />
          <Input label={frasi.schedaTelefono} type="tel" value={phone} autoComplete="off" onChange={(event) => setPhone(event.target.value)} />
          <Input label={frasi.authEmail} type="email" value={email} autoComplete="off" onChange={(event) => setEmail(event.target.value)} />
          <Input label={frasi.attNomeCane} value={nomeCane} autoComplete="off" onChange={(event) => setNomeCane(event.target.value)} />
          <Segmented<SpecieAttesa>
            fill
            label={frasi.schedaSpecie}
            value={specie}
            onChange={setSpecie}
            options={SPECIE_ATTESA.map((value) => ({ value, label: etichetteSpecie[value] }))}
          />
          <Segmented<TagliaAttesa>
            fill
            label={frasi.schedaTaglia}
            value={taglia}
            onChange={setTaglia}
            options={TAGLIE_ATTESA.map((value) => ({ value, label: etichetteTaglia[value] }))}
          />
          <label htmlFor="attesa-trattamento" style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap, margin: 0, fontSize: TYPE.base }}>
            <span style={{ fontSize: SIZES.field.label, fontWeight: 600, margin: 0, color: 'var(--tx2)' }}>{frasi.attTrattamento}</span>
            <select id="attesa-trattamento" value={servizioId} onChange={(event) => setServizioId(event.target.value)} style={selectStyle}>
              <option value="">{frasi.attScegli}</option>
              {principali.map((servizio) => (
                <option key={servizio.id} value={servizio.id}>{nomeServizioVisibile(lingua, servizio.name)}</option>
              ))}
            </select>
          </label>
          {incompleto ? <p role="alert" style={{ margin: 0, color: 'var(--bad)', fontSize: TYPE.meta }}>{frasi.attCompila}</p> : null}
          <Button type="submit" disabled={inCorso} style={{ width: '100%' }}>{frasi.schedaSalva}</Button>
        </form>
      </div>
    </ShellFrame>
  )
}
