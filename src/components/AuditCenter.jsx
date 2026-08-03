import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { CATEGORIES, upper } from '../lib/archive'

const ACTION_GROUPS = [
  ['','TUTTE LE OPERAZIONI'],
  ['CREA','CREAZIONI'],
  ['MODIFICA','MODIFICHE'],
  ['ELIMINA','ELIMINAZIONI'],
  ['CARICA','CARICAMENTI'],
  ['IMPORTA','IMPORTAZIONI'],
  ['ANNULLA','ANNULLAMENTI'],
  ['RIPRISTINA','RIPRISTINI'],
  ['ACCESSO','ACCESSI'],
]

const csvCell = value => `"${String(value ?? '').replace(/"/g,'""')}"`

export default function AuditCenter({ currentProfile, localItems = [], onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [category, setCategory] = useState('')
  const [userId, setUserId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function loadLogs() {
    setLoading(true)
    let request = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    const { data, error } = await request
    if (error) {
      console.error(error)
      setItems(localItems.map((item,index) => ({
        id: item.id || `local-${index}`,
        action: item.action || '',
        details: item.details || '',
        category: item.category || '',
        object_type: item.objectType || '',
        object_id: item.objectId || '',
        user_id: item.userId || '',
        user_email: item.userEmail || '',
        user_name: item.userName || '',
        user_role: item.userRole || '',
        created_at: item.at || new Date().toISOString(),
        source: 'locale',
      })))
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
    const channel = supabase
      .channel('acq-audit-center')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'audit_logs' }, payload => {
        if (payload.new) {
          setItems(current => [payload.new, ...current.filter(item => item.id !== payload.new.id)].slice(0,1000))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const users = useMemo(() => {
    const map = new Map()
    items.forEach(item => {
      const key = item.user_id || item.user_email
      if (key) map.set(key, item.user_name || item.user_email || 'UTENTE')
    })
    return [...map.entries()].sort((a,b) => a[1].localeCompare(b[1],'it'))
  }, [items])

  const filtered = useMemo(() => {
    const text = upper(query)
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER

    return items.filter(item => {
      const timestamp = new Date(item.created_at || 0).getTime()
      const selectedUser = item.user_id || item.user_email
      return (!text || upper([
          item.action,
          item.details,
          item.user_name,
          item.user_email,
          item.object_type,
          item.category,
        ].join(' ')).includes(text))
        && (!action || upper(item.action).startsWith(action))
        && (!category || item.category === category)
        && (!userId || selectedUser === userId)
        && timestamp >= from
        && timestamp <= to
    })
  }, [items, query, action, category, userId, dateFrom, dateTo])

  const summary = useMemo(() => ({
    total: filtered.length,
    users: new Set(filtered.map(item => item.user_id || item.user_email).filter(Boolean)).size,
    creations: filtered.filter(item => upper(item.action).startsWith('CREA')).length,
    deletions: filtered.filter(item => upper(item.action).startsWith('ELIMINA')).length,
  }), [filtered])

  function exportCsv() {
    const header = [
      'DATA E ORA','AZIONE','DETTAGLI','UTENTE','EMAIL','RUOLO',
      'CATEGORIA','TIPO OGGETTO','ID OGGETTO','DISPOSITIVO'
    ]
    const rows = filtered.map(item => [
      new Date(item.created_at).toLocaleString('it-IT'),
      item.action,
      item.details,
      item.user_name,
      item.user_email,
      item.user_role,
      item.category,
      item.object_type,
      item.object_id,
      item.device,
    ])
    const csv = '\ufeff' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ACQ_CRONOLOGIA_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function reset() {
    setQuery('')
    setAction('')
    setCategory('')
    setUserId('')
    setDateFrom('')
    setDateTo('')
  }

  return <Modal title="CRONOLOGIA MODIFICHE" onClose={onClose} wide>
    <div className="audit-center">
      <section className="audit-summary">
        <div><small>OPERAZIONI</small><b>{summary.total}</b></div>
        <div><small>UTENTI</small><b>{summary.users}</b></div>
        <div><small>CREAZIONI</small><b>{summary.creations}</b></div>
        <div><small>ELIMINAZIONI</small><b>{summary.deletions}</b></div>
      </section>

      <section className="audit-filters">
        <input placeholder="CERCA NELLA CRONOLOGIA…" value={query} onChange={event => setQuery(event.target.value)}/>
        <select value={action} onChange={event => setAction(event.target.value)}>
          {ACTION_GROUPS.map(([value,label]) => <option key={label} value={value}>{label}</option>)}
        </select>
        <select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">TUTTE LE CATEGORIE</option>
          {CATEGORIES.map(value => <option key={value}>{value}</option>)}
        </select>
        <select value={userId} onChange={event => setUserId(event.target.value)}>
          <option value="">TUTTI GLI UTENTI</option>
          {users.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label>DAL<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)}/></label>
        <label>AL<input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)}/></label>
        <button type="button" className="soft" onClick={reset}>AZZERA</button>
        <button type="button" onClick={exportCsv}>ESPORTA CSV</button>
      </section>

      <section className="audit-results">
        {loading && <div className="app-empty"><b>CARICAMENTO CRONOLOGIA…</b></div>}
        {!loading && !filtered.length && <div className="app-empty"><b>NESSUNA OPERAZIONE TROVATA</b><span>MODIFICA I FILTRI DI RICERCA.</span></div>}
        {!loading && filtered.map(item => <article key={item.id}>
          <div className="audit-icon">{upper(item.action || '?').slice(0,1)}</div>
          <div className="audit-main">
            <header>
              <b>{item.action || 'OPERAZIONE'}</b>
              <time>{new Date(item.created_at).toLocaleString('it-IT')}</time>
            </header>
            <p>{item.details || '—'}</p>
            <footer>
              <span>{item.user_name || item.user_email || 'UTENTE'}</span>
              {item.user_role && <span>{upper(item.user_role)}</span>}
              {item.category && <span>{item.category}</span>}
              {item.object_type && <span>{upper(item.object_type)}</span>}
              {item.source === 'locale' && <span>ARCHIVIO LOCALE</span>}
            </footer>
          </div>
        </article>)}
      </section>
    </div>
  </Modal>
}
