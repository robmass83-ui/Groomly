import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { callImpostaFunzione, callImpostaPiano, listSalonDirectory } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { funzioneAccesa, type FunzioniMappa, type LivelloElenco } from '../lib/funzioniPiano'
import { accountSummary, salonSummary, type DirectoryEntry, type SalonDirectory } from '../lib/salonDirectory'
import { isOperator } from '../lib/salonPath'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { ShellFrame } from './ShellFrame'

type ProItem = {
  uid: string
  salonId: string
  enabled: boolean
  livello?: LivelloElenco
  funzioni?: FunzioniMappa
}

const CHIAVI_FUNZIONE = [
  'messaggi',
  'affidabilita',
  'noteVocali',
  'prenotazioni',
  'listaAttesa',
  'fedelta',
  'recensioni',
  'pagella',
  'statistiche',
  'team',
] as const

function proItems(directory: SalonDirectory): ProItem[] {
  const listed = Array.isArray(directory.pro) ? directory.pro : []
  return listed.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (typeof item.uid !== 'string' || typeof item.salonId !== 'string') return []
    return [{ uid: item.uid, salonId: item.salonId, enabled: item.enabled === true }]
  })
}

type SalonRow = {
  salonId: string
  ownerName: string
  salonName: string
  livello: LivelloElenco
  funzioni: FunzioniMappa
}

function ownerOf(entries: DirectoryEntry[], salonId: string, memberUids: ReadonlySet<string>): DirectoryEntry | undefined {
  return entries.find((entry) => entry.uid === salonId) ?? entries.find((entry) => memberUids.has(entry.uid))
}

function salonRows(directory: SalonDirectory, senzaNome: string): SalonRow[] {
  const items = proItems(directory)
  const rows: SalonRow[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.salonId.trim() === '' || item.salonId === 'shared' || item.salonId.includes('/')) continue
    if (seen.has(item.salonId)) continue
    seen.add(item.salonId)
    const memberUids = new Set(items.filter((candidate) => candidate.salonId === item.salonId).map((candidate) => candidate.uid))
    const owner = ownerOf(directory.entries, item.salonId, memberUids)
    rows.push({
      salonId: item.salonId,
      ownerName: owner?.ownerName ?? senzaNome,
      salonName: owner?.salonName ?? '',
      livello: item.livello ?? (item.enabled ? 'salone' : 'base'),
      funzioni: item.funzioni ?? {},
    })
  }
  return rows
}

export function UsersPage() {
  const frasi = useFrasi()
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const operator = isOperator(email)
  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [error, setError] = useState(false)
  const [turned, setTurned] = useState<Record<string, boolean>>({})
  const [forzate, setForzate] = useState<Record<string, FunzioniMappa>>({})
  const [aperte, setAperte] = useState<Record<string, boolean>>({})
  const [denied, setDenied] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!operator) return
    let active = true
    void listSalonDirectory()
      .then((result) => {
        if (active) setDirectory(result)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [operator])

  if (!operator) return <Navigate to="/impostazioni" replace />

  const rows = directory ? salonRows(directory, frasi.uteSenzaNome) : []

  function pulisci(salonId: string) {
    setDenied((current) => {
      const copy = { ...current }
      delete copy[salonId]
      return copy
    })
  }

  async function piano(salonId: string, azione: 'prova' | 'pro' | 'salone' | 'base', livello: LivelloElenco) {
    pulisci(salonId)
    if (livello === 'vip' && azione !== 'salone') {
      setDenied((current) => ({ ...current, [salonId]: frasi.uteVipResta }))
      return
    }
    try {
      await callImpostaPiano(salonId, azione)
      if (azione === 'salone' || azione === 'base') setTurned((current) => ({ ...current, [salonId]: azione === 'salone' }))
    } catch (error) {
      const message = error instanceof Error && error.message !== '' ? error.message : frasi.uteNegato
      setDenied((current) => ({ ...current, [salonId]: message }))
    }
  }

  async function cambiaPiano(salonId: string, next: boolean, livello: LivelloElenco) {
    await piano(salonId, next ? 'salone' : 'base', livello)
  }

  async function cambiaFunzione(salonId: string, chiave: string, next: boolean) {
    pulisci(salonId)
    try {
      await callImpostaFunzione(salonId, chiave, next)
      setForzate((current) => ({ ...current, [salonId]: { ...current[salonId], [chiave]: next } }))
    } catch (error) {
      const message = error instanceof Error && error.message !== '' ? error.message : frasi.uteNegato
      setDenied((current) => ({ ...current, [salonId]: message }))
    }
  }

  return (
    <ShellFrame>
      <Header title={frasi.uteTitolo} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {error ? <p style={{ margin: 0 }}>Elenco non disponibile</p> : null}
        {!error && !directory ? <p style={{ margin: 0 }}>Caricamento…</p> : null}
        {directory ? (
          <>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, ...USER_TEXT }}>
              {`${accountSummary(directory.accountCount)} · ${salonSummary(directory.salonCount)}`}
            </p>
            {directory.entries.length === 0 ? <p style={{ margin: 0 }}>Nessuna toelettatura</p> : null}
            <SectionTitle>Servizio Pro</SectionTitle>
            <Card>
              {rows.map((row, index) => {
                const livello: LivelloElenco = row.salonId in turned
                  ? (row.livello === 'vip' ? 'vip' : (turned[row.salonId] ? 'salone' : 'base'))
                  : row.livello
                const funzioni = { ...row.funzioni, ...forzate[row.salonId] }
                const acceso = livello !== 'base'
                const problem = denied[row.salonId] ?? ''
                const etichette: Record<(typeof CHIAVI_FUNZIONE)[number], string> = {
                  messaggi: frasi.strumMessaggi,
                  affidabilita: frasi.strumAffidabilita,
                  noteVocali: frasi.strumNoteVocali,
                  prenotazioni: frasi.prenotazioniOnline,
                  listaAttesa: frasi.listaAttesa,
                  fedelta: frasi.tesseraFedelta,
                  recensioni: frasi.recensione,
                  pagella: frasi.pagella,
                  statistiche: frasi.statistiche,
                  team: frasi.team,
                }
                const nome = livello === 'vip' ? frasi.uteVip : livello === 'pro' ? frasi.utePro : livello === 'salone' ? frasi.uteSalone : frasi.uteGratis
                return (
                  <div key={row.salonId}>
                    <Row style={index === 0 ? { borderTop: 'none' } : undefined}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, ...USER_TEXT }}>{row.ownerName}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--tx3)', ...USER_TEXT }}>{row.salonName}</div>
                        <div style={{ ...USER_TEXT, color: acceso ? 'var(--ok)' : 'var(--tx3)' }}>{nome}</div>
                      </div>
                      <Toggle
                        checked={acceso}
                        label={frasi.servizioProPer.replace('{{nome}}', row.ownerName)}
                        onChange={(next) => { void cambiaPiano(row.salonId, next, livello) }}
                      />
                    </Row>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
                      <button type="button" onClick={() => { void piano(row.salonId, 'prova', livello) }}>{frasi.perPersona.replace('{{etichetta}}', frasi.prova30).replace('{{nome}}', row.ownerName)}</button>
                      <button type="button" onClick={() => { void piano(row.salonId, 'pro', livello) }}>{frasi.perPersona.replace('{{etichetta}}', frasi.proOmaggio).replace('{{nome}}', row.ownerName)}</button>
                      <button type="button" onClick={() => { void piano(row.salonId, 'salone', livello) }}>{frasi.perPersona.replace('{{etichetta}}', frasi.saloneOmaggio).replace('{{nome}}', row.ownerName)}</button>
                      <button type="button" onClick={() => { void piano(row.salonId, 'base', livello) }}>{frasi.perPersona.replace('{{etichetta}}', frasi.tornaBase).replace('{{nome}}', row.ownerName)}</button>
                      <button type="button" aria-expanded={aperte[row.salonId] === true} onClick={() => setAperte((current) => ({ ...current, [row.salonId]: current[row.salonId] !== true }))}>{frasi.uteFunzioni}</button>
                    </div>
                    {aperte[row.salonId] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
                        {CHIAVI_FUNZIONE.map((chiave) => (
                          <div key={chiave} style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 12 }}>
                            <span style={{ flex: 1 }}>{etichette[chiave]}</span>
                            <Toggle
                              checked={funzioneAccesa(livello, funzioni, chiave)}
                              label={etichette[chiave]}
                              onChange={(next) => { void cambiaFunzione(row.salonId, chiave, next) }}
                            />
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
                          <span style={{ flex: 1 }}>{frasi.waAuto}</span>
                          <span>{frasi.daSviluppare}</span>
                        </div>
                      </div>
                    ) : null}
                    {problem !== '' ? <p style={{ margin: 0, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>{problem}</p> : null}
                  </div>
                )
              })}
            </Card>
          </>
        ) : null}
      </div>
    </ShellFrame>
  )
}
