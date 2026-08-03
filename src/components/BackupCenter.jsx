import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { normalizeArchive, upper } from '../lib/archive'

const formatBytes = value => {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function BackupCenter({ archive, profile, canRestore, onRestore, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadBackups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('archive_backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error(error)
      window.alert('IMPOSSIBILE CARICARE I BACKUP: ' + error.message)
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadBackups()
    const channel = supabase
      .channel('acq-backups')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'archive_backups'},payload => {
        if (!payload.new) return
        setItems(current => [payload.new, ...current.filter(item => item.id !== payload.new.id)].slice(0,200))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    const text = upper(query)
    return items.filter(item =>
      (!text || upper([item.label,item.created_by_name,item.created_by_email,item.backup_type].join(' ')).includes(text))
      && (!type || item.backup_type === type)
    )
  }, [items, query, type])

  async function createManualBackup() {
    setCreating(true)
    try {
      const snapshot = normalizeArchive({...archive,updatedAt:new Date().toISOString()})
      const json = JSON.stringify(snapshot)
      const payload = {
        backup_type:'manual',
        label:`BACKUP MANUALE · ${new Date().toLocaleString('it-IT')}`,
        archive_data:snapshot,
        archive_size:new Blob([json]).size,
        created_by:profile.id,
        created_by_email:profile.email || '',
        created_by_name:upper([profile.first_name,profile.last_name].filter(Boolean).join(' ') || profile.email || ''),
        created_at:new Date().toISOString(),
      }
      const { error } = await supabase.from('archive_backups').insert(payload)
      if (error) throw error
      await loadBackups()
      window.alert('BACKUP CREATO CORRETTAMENTE.')
    } catch (error) {
      console.error(error)
      window.alert('CREAZIONE BACKUP NON RIUSCITA: ' + (error.message || 'ERRORE'))
    } finally {
      setCreating(false)
    }
  }

  async function restoreBackup(item) {
    if (!canRestore) {
      window.alert('SOLO DIRETTORE E COORDINATORE POSSONO RIPRISTINARE UN BACKUP.')
      return
    }
    const password = window.prompt('INSERISCI LA PASSWORD PER RIPRISTINARE IL BACKUP:')
    if (password !== 'vittoriout') {
      if (password !== null) window.alert('PASSWORD ERRATA.')
      return
    }
    if (!window.confirm(`RIPRISTINARE IL BACKUP DEL ${new Date(item.created_at).toLocaleString('it-IT')}?\n\nLO STATO ATTUALE VERRÀ SOSTITUITO.`)) return
    setBusyId(item.id)
    try {
      await onRestore(normalizeArchive(item.archive_data), item)
      window.alert('BACKUP RIPRISTINATO CORRETTAMENTE.')
      onClose()
    } catch (error) {
      console.error(error)
      window.alert('RIPRISTINO NON RIUSCITO: ' + (error.message || 'ERRORE'))
    } finally {
      setBusyId('')
    }
  }

  function downloadBackup(item) {
    const content = JSON.stringify(normalizeArchive(item.archive_data), null, 2)
    const blob = new Blob([content], { type:'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ACQ_BACKUP_${new Date(item.created_at).toISOString().replace(/[:.]/g,'-')}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function deleteBackup(item) {
    if (!canRestore) {
      window.alert('SOLO DIRETTORE E COORDINATORE POSSONO ELIMINARE I BACKUP.')
      return
    }
    const password = window.prompt('PASSWORD PER ELIMINARE IL BACKUP:')
    if (password !== 'vittoriout') {
      if (password !== null) window.alert('PASSWORD ERRATA.')
      return
    }
    if (!window.confirm('ELIMINARE DEFINITIVAMENTE QUESTO BACKUP?')) return

    setBusyId(item.id)
    const { error } = await supabase.from('archive_backups').delete().eq('id', item.id)
    setBusyId('')
    if (error) {
      console.error(error)
      window.alert('ELIMINAZIONE BACKUP NON RIUSCITA.')
      return
    }
    setItems(current => current.filter(row => row.id !== item.id))
  }

  return <Modal title="BACKUP E RIPRISTINO" onClose={onClose} wide>
    <div className="backup-center">
      <header className="backup-heading">
        <div>
          <small>PROTEZIONE ARCHIVIO · STAGIONE 2026/27</small>
          <h2>VERSIONI DELL’ARCHIVIO</h2>
          <p>I BACKUP AUTOMATICI VENGONO CREATI PERIODICAMENTE. PUOI ANCHE CREARNE UNO MANUALMENTE.</p>
        </div>
        <button type="button" onClick={createManualBackup} disabled={creating}>
          {creating ? 'CREAZIONE…' : 'CREA BACKUP ORA'}
        </button>
      </header>

      <section className="backup-filters">
        <input placeholder="CERCA PER DATA, AUTORE O ETICHETTA…" value={query} onChange={event => setQuery(event.target.value)}/>
        <select value={type} onChange={event => setType(event.target.value)}>
          <option value="">TUTTI I BACKUP</option>
          <option value="automatic">AUTOMATICI</option>
          <option value="manual">MANUALI</option>
          <option value="pre_restore">PRIMA DEL RIPRISTINO</option>
        </select>
        <button type="button" className="soft" onClick={()=>{setQuery('');setType('')}}>AZZERA</button>
        <button type="button" className="soft" onClick={loadBackups}>AGGIORNA</button>
      </section>

      <section className="backup-list">
        {loading && <div className="app-empty"><b>CARICAMENTO BACKUP…</b></div>}
        {!loading && !filtered.length && <div className="app-empty"><b>NESSUN BACKUP TROVATO</b><span>CREA IL PRIMO BACKUP MANUALE.</span></div>}

        {!loading && filtered.map(item => <article key={item.id}>
          <div className={`backup-type ${item.backup_type}`}>
            {item.backup_type === 'automatic' ? 'A' : item.backup_type === 'pre_restore' ? 'R' : 'M'}
          </div>

          <div className="backup-main">
            <header>
              <div>
                <b>{item.label || 'BACKUP ARCHIVIO'}</b>
                <span>{new Date(item.created_at).toLocaleString('it-IT')}</span>
              </div>
              <em>{formatBytes(item.archive_size)}</em>
            </header>
            <p>CREATO DA {item.created_by_name || item.created_by_email || 'SISTEMA'}</p>
            <footer>
              <span>{upper(item.backup_type)}</span>
              <span>{item.archive_data?.sessions?.length || 0} SESSIONI</span>
              <span>{item.archive_data?.exercises?.length || 0} ESERCITAZIONI</span>
              <span>{Object.values(item.archive_data?.matchesByCategory || {}).flat().filter(row => row.opponent || row.date).length} PARTITE</span>
            </footer>
          </div>

          <div className="backup-actions">
            <button type="button" className="soft" onClick={() => downloadBackup(item)}>SCARICA</button>
            {canRestore && <button type="button" onClick={() => restoreBackup(item)} disabled={busyId === item.id}>
              {busyId === item.id ? 'ATTENDI…' : 'RIPRISTINA'}
            </button>}
            {canRestore && <button type="button" className="danger" onClick={() => deleteBackup(item)} disabled={busyId === item.id}>ELIMINA</button>}
          </div>
        </article>)}
      </section>

      <footer className="backup-footer">
        <span>{items.length} BACKUP DISPONIBILI</span>
        <span>CONSERVAZIONE AUTOMATICA: 30 GIORNI</span>
      </footer>
    </div>
  </Modal>
}
