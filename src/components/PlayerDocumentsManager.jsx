import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, uid, upper } from '../lib/archive'
import { removeCloudFile, uploadCloudFile } from '../lib/storage'

const TYPES = ['TESSERAMENTO','CERTIFICATO MEDICO','NULLA OSTA','ALTRO DOCUMENTO']

export default function PlayerDocumentsManager({ players, playerDocuments, onChange, currentUser, onClose }) {
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [documentType, setDocumentType] = useState(TYPES[0])
  const [expiryDate, setExpiryDate] = useState('')
  const [busy, setBusy] = useState(false)

  const visiblePlayers = useMemo(() => {
    const q = upper(query)
    return players
      .filter(player => player.active !== false)
      .filter(player => !category || player.category === category)
      .filter(player => !q || upper(`${player.firstName} ${player.lastName} ${player.category}`).includes(q))
      .sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'it'))
  }, [players, category, query])

  const selectedPlayer = players.find(player => player.id === selectedPlayerId)
  const documents = selectedPlayerId ? (playerDocuments[selectedPlayerId] || []) : []

  async function upload(file) {
    if (!selectedPlayer || !file) return
    setBusy(true)
    try {
      const uploaded = await uploadCloudFile(file, `tesserati/${selectedPlayer.category.toLowerCase().replace(/\s+/g,'-')}/${selectedPlayer.id}`)
      const item = {
        id:uid(),
        documentType,
        title:upper(file.name),
        expiryDate,
        storagePath:uploaded.storagePath,
        url:uploaded.url,
        name:uploaded.name,
        type:uploaded.type,
        size:uploaded.size,
        uploadedAt:new Date().toISOString(),
        uploadedBy:upper(currentUser || ''),
      }
      await onChange(selectedPlayer.id, [...documents,item], 'CARICA DOCUMENTO TESSERATO', `${selectedPlayer.lastName} ${selectedPlayer.firstName} · ${documentType}`)
      setExpiryDate('')
      window.alert('DOCUMENTO CARICATO E SALVATO NEL CLOUD.')
    } catch (error) {
      console.error(error)
      window.alert('CARICAMENTO NON RIUSCITO: ' + (error.message || 'ERRORE'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(item) {
    if (!confirm('ELIMINARE QUESTO DOCUMENTO?')) return
    setBusy(true)
    try {
      if (item.storagePath) await removeCloudFile(item.storagePath)
      await onChange(selectedPlayer.id, documents.filter(document => document.id !== item.id), 'ELIMINA DOCUMENTO TESSERATO', `${selectedPlayer.lastName} ${selectedPlayer.firstName} · ${item.documentType}`)
    } catch (error) {
      console.error(error)
      window.alert('ELIMINAZIONE NON RIUSCITA.')
    } finally {
      setBusy(false)
    }
  }

  const status = item => {
    if (!item.expiryDate) return {label:'SENZA SCADENZA',className:'neutral'}
    const days = Math.ceil((new Date(`${item.expiryDate}T23:59:59`) - new Date()) / 86400000)
    if (days < 0) return {label:'SCADUTO',className:'expired'}
    if (days <= 30) return {label:`SCADENZA ${days}GG`,className:'warning'}
    return {label:'VALIDO',className:'valid'}
  }

  return <Modal title="TESSERATI E DOCUMENTI" onClose={onClose} wide>
    <div className="secretary-documents">
      <section className="secretary-player-filters">
        <select value={category} onChange={event=>setCategory(event.target.value)}>
          <option value="">TUTTE LE CATEGORIE</option>
          {CATEGORIES.map(value=><option key={value}>{value}</option>)}
        </select>
        <input placeholder="CERCA TESSERATO…" value={query} onChange={event=>setQuery(event.target.value)}/>
      </section>

      <section className="secretary-doc-layout">
        <div className="secretary-player-list">
          {visiblePlayers.map(player=>{
            const docs=playerDocuments[player.id]||[]
            return <button type="button" key={player.id} className={selectedPlayerId===player.id?'active':''} onClick={()=>setSelectedPlayerId(player.id)}>
              <div><b>{player.lastName} {player.firstName}</b><span>{player.category}</span></div>
              <em>{docs.length} DOC</em>
            </button>
          })}
        </div>

        <div className="secretary-document-panel">
          {!selectedPlayer && <div className="app-empty"><b>SELEZIONA UN TESSERATO</b><span>APRI LA SCHEDA PER CARICARE E CONTROLLARE I DOCUMENTI.</span></div>}
          {selectedPlayer && <>
            <header>
              <div><small>SCHEDA TESSERATO</small><h2>{selectedPlayer.lastName} {selectedPlayer.firstName}</h2><p>{selectedPlayer.category}</p></div>
              <b>{documents.length} DOCUMENTI</b>
            </header>

            <div className="secretary-upload-row">
              <select value={documentType} onChange={event=>setDocumentType(event.target.value)}>{TYPES.map(value=><option key={value}>{value}</option>)}</select>
              <label>SCADENZA<input type="date" value={expiryDate} onChange={event=>setExpiryDate(event.target.value)}/></label>
              <label className="secretary-file-button">{busy?'CARICAMENTO…':'CARICA DOCUMENTO'}<input hidden type="file" disabled={busy} onChange={event=>upload(event.target.files?.[0])}/></label>
            </div>

            <div className="secretary-doc-list">
              {!documents.length && <div className="app-empty"><b>NESSUN DOCUMENTO</b><span>CARICA TESSERAMENTO, CERTIFICATO MEDICO, NULLA OSTA O ALTRI FILE.</span></div>}
              {documents.map(item=>{
                const current=status(item)
                return <article key={item.id}>
                  <div><b>{item.documentType}</b><span>{item.title}</span></div>
                  <time>{item.expiryDate ? `SCADENZA ${item.expiryDate.split('-').reverse().join('/')}` : 'NESSUNA SCADENZA'}</time>
                  <strong className={current.className}>{current.label}</strong>
                  <a href={item.url} target="_blank" rel="noreferrer">APRI</a>
                  <button type="button" disabled={busy} onClick={()=>remove(item)}>ELIMINA</button>
                </article>
              })}
            </div>
          </>}
        </div>
      </section>
    </div>
  </Modal>
}
