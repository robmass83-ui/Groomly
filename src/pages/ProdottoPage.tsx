import { useState, type CSSProperties, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { useProdotti } from '../hooks/useProdotti'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { CATEGORIE_PRODOTTO, ditteProposte, leggiQuantita, type CategoriaProdotto, type Prodotto, type UnitaProdotto } from '../lib/prodotti'
import { SIZES } from '../theme/sizes'
import { ETICHETTA_CATEGORIA } from './MagazzinoPage'

const ELENCO = '/altro/magazzino'

function chip(attivo: boolean): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 16px',
    borderRadius: 22,
    border: `1px solid ${attivo ? 'var(--pri-solid)' : 'var(--line)'}`,
    background: attivo ? 'var(--pri-solid)' : 'var(--card)',
    color: attivo ? 'var(--on-pri)' : 'var(--tx)',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  }
}

const proposta: CSSProperties = {
  minHeight: 36,
  padding: '0 12px',
  borderRadius: 18,
  border: '1px solid var(--line)',
  background: 'var(--surf)',
  color: 'var(--tx)',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}

export function ProdottoPage() {
  const { id } = useParams()
  const { gate } = useSession()
  const uid = gate.kind === 'in' ? gate.account.uid : ''
  const { prodotti, save, remove } = useProdotti(uid)
  const esistente = prodotti.find((item) => item.id === id)
  if (id && !esistente) return <Navigate to={ELENCO} replace />
  return (
    <SchedaProdotto
      key={id ?? 'nuovo'}
      esistente={esistente}
      prodotti={prodotti}
      save={save}
      remove={remove}
      elimina={!(gate.kind === 'in' && gate.account.role === 'collaboratore')}
    />
  )
}

function SchedaProdotto({ esistente, prodotti, save, remove, elimina }: {
  esistente: Prodotto | undefined
  prodotti: Prodotto[]
  save: (prodotto: Prodotto) => Promise<void>
  remove: (id: string) => Promise<void>
  elimina: boolean
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const navigate = useNavigate()
  const toast = useToast()
  const [nome, setNome] = useState(esistente?.nome ?? '')
  const [categoria, setCategoria] = useState<CategoriaProdotto>(esistente?.categoria ?? 'shampoo')
  const [quantita, setQuantita] = useState(esistente?.quantita === null || !esistente ? '' : new Intl.NumberFormat(lingua, { useGrouping: false }).format(esistente.quantita))
  const [unita, setUnita] = useState<UnitaProdotto>(esistente?.unita ?? 'l')
  const [ditta, setDitta] = useState(esistente?.ditta ?? '')
  const [codice, setCodice] = useState(esistente?.codice ?? '')
  const [erroreNome, setErroreNome] = useState<string>()
  const [erroreQuantita, setErroreQuantita] = useState<string>()
  const [conferma, setConferma] = useState(false)

  // Senza aspettare il cloud: offline la scrittura parte quando torna la rete.
  function nonRiuscito() {
    toast.show(frasi.authSalvataggio, 'plain')
  }

  function onSalva(event: FormEvent) {
    event.preventDefault()
    const letta = leggiQuantita(quantita)
    const nomeOk = nome.trim().length > 0
    setErroreNome(nomeOk ? undefined : frasi.magNomeManca)
    setErroreQuantita(letta === 'errore' ? frasi.magQuantitaErrore : undefined)
    if (!nomeOk || letta === 'errore') return
    const adesso = new Date()
    void save({
      id: esistente?.id ?? crypto.randomUUID(),
      nome: nome.trim(),
      categoria,
      quantita: letta,
      unita,
      ditta: ditta.trim(),
      codice: codice.trim(),
      createdAt: esistente?.createdAt ?? adesso,
      updatedAt: adesso,
    }).catch(nonRiuscito)
    navigate(ELENCO, { replace: true })
  }

  function onElimina() {
    if (!esistente) return
    void remove(esistente.id).catch(nonRiuscito)
    navigate(ELENCO, { replace: true })
  }

  return (
    <PhoneShell>
      <Header title={esistente ? frasi.magScheda : frasi.magNuovo} backTo={ELENCO} />
      <form noValidate onSubmit={onSalva} style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label={frasi.magCampoProdotto} value={nome} onChange={(event) => setNome(event.target.value)} error={erroreNome} maxLength={120} size="lg" />
        <div role="radiogroup" aria-label={frasi.magCampoCategoria} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.magCampoCategoria}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIE_PRODOTTO.map((item) => (
              <button key={item} type="button" role="radio" aria-checked={categoria === item} onClick={() => setCategoria(item)} style={chip(categoria === item)}>
                {frasi[ETICHETTA_CATEGORIA[item]]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignItems: 'start' }}>
          <Input label={frasi.magCampoQuantita} value={quantita} onChange={(event) => setQuantita(event.target.value)} error={erroreQuantita} inputMode="decimal" size="lg" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
            <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.magCampoUnita}</span>
            <Segmented fill label={frasi.magCampoUnita} value={unita} onChange={setUnita} options={[{ value: 'l', label: frasi.magLitri }, { value: 'ml', label: 'ml' }]} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input label={frasi.magCampoDitta} value={ditta} onChange={(event) => setDitta(event.target.value)} maxLength={120} autoComplete="off" size="lg" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ditteProposte(prodotti, ditta).map((item) => (
              <button key={item} type="button" onClick={() => setDitta(item)} style={proposta}>{item}</button>
            ))}
          </div>
        </div>
        <Input label={frasi.magCampoCodice} value={codice} onChange={(event) => setCodice(event.target.value)} maxLength={120} autoComplete="off" size="lg" />
        <Button type="submit" size="lg" style={{ width: '100%' }}>{frasi.magSalva}</Button>
        {esistente && elimina ? (
          <Button type="button" variant="bad" onClick={() => setConferma(true)} style={{ width: '100%' }}>{frasi.magElimina}</Button>
        ) : null}
      </form>
      {conferma && esistente ? (
        <Dialog open title={frasi.magEliminaDomanda.replace('{{nome}}', esistente.nome)} onClose={() => setConferma(false)}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setConferma(false)}>{frasi.homeAnnulla}</Button>
            <Button type="button" variant="bad" onClick={onElimina}>{frasi.magEliminaConferma}</Button>
          </div>
        </Dialog>
      ) : null}
    </PhoneShell>
  )
}
