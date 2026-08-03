import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, CLOUD_STATE_ID } from './lib/supabase'
import {
  ADMIN_PASSWORD, CATEGORIES, COACHES, PHASES, emptyArchive, makeAuditEntry,
  normalizeArchive, readLegacyArchive, upper
} from './lib/archive'
import Login from './components/Login'
import SessionModal from './components/SessionModal'
import ExerciseModal from './components/ExerciseModal'
import Matches from './components/Matches'
import DocumentLibrary from './components/DocumentLibrary'
import Modal from './components/Modal'
import { removeCloudFile, uploadCloudFile } from './lib/storage'
import './styles.css'

const HISTORY_LIMIT = 100
const LOCAL_CACHE_KEY = 'acq-v24-cloud-cache'

export default function App() {
  const [auth, setAuth] = useState(undefined)
  const [archive, setArchive] = useState(emptyArchive)
  const [status, setStatus] = useState('CONNESSIONE…')
  const [hydrated, setHydrated] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [view, setView] = useState('sessions')
  const [search, setSearch] = useState('')
  const [coach, setCoach] = useState('')
  const [phase, setPhase] = useState('')
  const [rating, setRating] = useState('')
  const [sort, setSort] = useState('recent')
  const [sessionModal, setSessionModal] = useState(null)
  const [exerciseModal, setExerciseModal] = useState(null)
  const [documentModal, setDocumentModal] = useState(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toast, setToast] = useState('')
  const saveTimer = useRef(null)
  const applyingRemote = useRef(false)
  const undoStack = useRef([])
  const redoStack = useRef([])
  const fileInput = useRef(null)
  const legacyArchive = useMemo(() => readLegacyArchive(), [])

  const showToast = useCallback(message => {
    setToast(message)
    window.clearTimeout(showToast.timer)
    showToast.timer = window.setTimeout(() => setToast(''), 2200)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setAuth(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuth(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const online = () => { setIsOnline(true); setStatus('CONNESSIONE RIPRISTINATA') }
    const offline = () => { setIsOnline(false); setStatus('MODALITÀ OFFLINE') }
    const beforeInstall = event => { event.preventDefault(); setInstallPrompt(event) }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) {
      showToast('SU IPAD/IPHONE: CONDIVIDI → AGGIUNGI ALLA SCHERMATA HOME')
      return
    }
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  useEffect(() => {
    if (!auth) return
    let channel
    async function start() {
      setHydrated(false)
      setStatus(navigator.onLine ? 'CARICAMENTO CLOUD…' : 'MODALITÀ OFFLINE')
      try {
        if (!navigator.onLine) throw new Error('offline')
        const { data, error } = await supabase.from('app_state').select('data').eq('id', CLOUD_STATE_ID).maybeSingle()
        if (error) throw error
        const cloud = data?.data && Object.keys(data.data).length ? normalizeArchive(data.data) : emptyArchive()
        applyingRemote.current = true
        setArchive(cloud)
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cloud))
        undoStack.current = []
        redoStack.current = []
        applyingRemote.current = false
        setHydrated(true)
        setStatus('ARCHIVIO SINCRONIZZATO')
      } catch (error) {
        console.error(error)
        const cached = localStorage.getItem(LOCAL_CACHE_KEY)
        applyingRemote.current = true
        setArchive(cached ? normalizeArchive(JSON.parse(cached)) : emptyArchive())
        applyingRemote.current = false
        setHydrated(true)
        setStatus(cached ? 'MODALITÀ OFFLINE · COPIA LOCALE' : 'ERRORE CLOUD')
      }

      channel = supabase.channel('acq-v24').on('postgres_changes',{event:'*',schema:'public',table:'app_state',filter:`id=eq.${CLOUD_STATE_ID}`}, payload => {
        if (!payload.new || !payload.new.data || applyingRemote.current) return
        const next = normalizeArchive(payload.new.data)
        setArchive(current => {
          if (current.updatedAt && next.updatedAt && current.updatedAt === next.updatedAt) return current
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(next))
          return next
        })
        setStatus('AGGIORNATO DA ALTRO DISPOSITIVO')
        window.setTimeout(() => setStatus('ARCHIVIO SINCRONIZZATO'), 1800)
      }).subscribe()
    }
    start()
    return () => { if(channel) supabase.removeChannel(channel) }
  }, [auth])

  useEffect(() => {
    if (!auth || !hydrated || applyingRemote.current) return
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(archive))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setStatus('MODALITÀ OFFLINE · MODIFICHE IN ATTESA')
        return
      }
      setStatus('SALVATAGGIO…')
      const data = { ...archive, updatedAt: new Date().toISOString() }
      const { error } = await supabase.from('app_state').upsert({ id:CLOUD_STATE_ID, data, updated_at:new Date().toISOString(), updated_by:auth.user.email },{onConflict:'id'})
      setStatus(error ? 'ERRORE SALVATAGGIO' : 'ARCHIVIO SINCRONIZZATO')
      if(error) console.error(error)
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [archive, auth, hydrated])

  useEffect(() => {
    if (!auth || !hydrated || !isOnline) return
    const timer = window.setTimeout(() => setArchive(current => ({...current})), 250)
    return () => window.clearTimeout(timer)
  }, [isOnline, auth, hydrated])

  const commit = useCallback((updater, action = 'MODIFICA ARCHIVIO', details = '') => {
    setArchive(previous => {
      const nextRaw = typeof updater === 'function' ? updater(previous) : updater
      const next = normalizeArchive({
        ...nextRaw,
        audit: [...(nextRaw.audit || []), makeAuditEntry(action, details)].slice(-200),
        updatedAt: new Date().toISOString(),
      })
      if (JSON.stringify(previous) === JSON.stringify(next)) return previous
      undoStack.current.push(previous)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      redoStack.current = []
      return next
    })
  }, [])

  const undo = useCallback(() => {
    if (!undoStack.current.length) { showToast('NESSUNA OPERAZIONE DA ANNULLARE'); return }
    setArchive(current => {
      redoStack.current.push(current)
      const previous = undoStack.current.pop()
      showToast('OPERAZIONE ANNULLATA · ⌘Z')
      return previous
    })
  }, [showToast])

  const redo = useCallback(() => {
    if (!redoStack.current.length) { showToast('NESSUNA OPERAZIONE DA RIPRISTINARE'); return }
    setArchive(current => {
      undoStack.current.push(current)
      const next = redoStack.current.pop()
      showToast('OPERAZIONE RIPRISTINATA · ⇧⌘Z')
      return next
    })
  }, [showToast])

  useEffect(() => {
    const handler = event => {
      const target = event.target
      const editing = Boolean(target && ((target.matches && target.matches('input,textarea,select')) || target.isContentEditable))
      if (editing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      event.shiftKey ? redo() : undo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const sessionById = useMemo(() => new Map(archive.sessions.map(s => [s.id, s])), [archive.sessions])
  const categorySessions = useMemo(() => archive.sessions.filter(s => (!selectedCategory || s.category === selectedCategory) && (!coach || s.coach === coach)), [archive.sessions, selectedCategory, coach])
  const filteredExercises = useMemo(() => {
    let list = archive.exercises.filter(e => {
      const linkedSession = sessionById.get(e.sessionId)
      return (!selectedCategory || e.category === selectedCategory)
        && (!coach || linkedSession?.coach === coach)
        && (!phase || e.phase === phase)
        && (!rating || Number(e.rating) === Number(rating))
    })
    const q = upper(search)
    if(q) list = list.filter(e => {
      const linkedSession = sessionById.get(e.sessionId)
      return upper([e.title,e.objective,e.description,e.equipment,linkedSession?.coach,linkedSession?.objective].join(' ')).includes(q)
    })
    if(sort==='az') list.sort((a,b)=>a.title.localeCompare(b.title,'it'))
    if(sort==='players') list.sort((a,b)=>(b.players||0)-(a.players||0))
    if(sort==='recent') list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
    return list
  },[archive.exercises,selectedCategory,coach,phase,rating,search,sort,sessionById])
  const visibleSessions = categorySessions.filter(s => !search || upper([s.coach,s.objective].join(' ')).includes(upper(search)) || filteredExercises.some(e=>e.sessionId===s.id))

  useEffect(() => {
    if (view === 'matches' && !selectedCategory) setView('sessions')
  }, [selectedCategory, view])

  function resetFilters() {
    setSearch('')
    setCoach('')
    setSelectedCategory('')
    setPhase('')
    setRating('')
    setSort('recent')
    setView('sessions')
  }

  function authorize(message = 'INSERISCI LA PASSWORD:') {
    const password = window.prompt(message)
    if (password === null) return false
    if (password !== ADMIN_PASSWORD) { window.alert('PASSWORD ERRATA. OPERAZIONE ANNULLATA.'); return false }
    return true
  }

  async function persistArchiveImmediately(nextArchive, successMessage = 'ARCHIVIO SINCRONIZZATO') {
    const normalized = normalizeArchive({ ...nextArchive, updatedAt: new Date().toISOString() })
    applyingRemote.current = true
    setArchive(normalized)
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalized))
    applyingRemote.current = false

    if (!navigator.onLine) {
      setStatus('MODALITÀ OFFLINE · MODIFICHE IN ATTESA')
      showToast('ESERCITAZIONE SALVATA IN LOCALE')
      return normalized
    }

    setStatus('SALVATAGGIO CLOUD…')
    const { error } = await supabase.from('app_state').upsert({
      id: CLOUD_STATE_ID,
      data: normalized,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.email,
    }, { onConflict: 'id' })

    if (error) {
      console.error('Immediate archive save error', error)
      setStatus('ERRORE SALVATAGGIO CLOUD')
      throw error
    }

    setStatus(successMessage)
    return normalized
  }

  function openNewExercise(session) {
    if (!session || !session.id) {
      showToast('SESSIONE NON ANCORA DISPONIBILE. ATTENDI UN ISTANTE E RIPROVA.')
      return
    }
    setExerciseModal({ session: { ...session } })
  }

  function saveSession(item) {
    const exists = archive.sessions.some(s => s.id === item.id)
    commit(a => ({...a,sessions:exists?a.sessions.map(s=>s.id===item.id?item:s):[...a.sessions,item]}), exists ? 'MODIFICA SESSIONE' : 'CREA SESSIONE', item.coach)
    setSessionModal(null)
  }

  function deleteSession(id) {
    const session = archive.sessions.find(s => s.id === id)
    const count = archive.exercises.filter(e => e.sessionId === id).length
    if(!confirm(`ELIMINARE LA SESSIONE E LE ${count} ESERCITAZIONI AL SUO INTERNO?`)) return
    if(!authorize('PASSWORD PER ELIMINARE LA SESSIONE:')) return
    commit(a=>({...a,sessions:a.sessions.filter(s=>s.id!==id),exercises:a.exercises.filter(e=>e.sessionId!==id)}), 'ELIMINA SESSIONE', session?.coach)
  }

  async function saveExercise(item, initial) {
    const linkedSession = archive.sessions.find(session => String(session.id) === String(item.sessionId))
    if (!linkedSession) {
      window.alert('LA SESSIONE COLLEGATA NON È STATA TROVATA. CHIUDI LA FINESTRA, RICARICA LA PAGINA E RIPROVA.')
      throw new Error('SESSIONE COLLEGATA NON TROVATA')
    }

    const previous = archive.exercises.find(exercise => String(exercise.id) === String(item.id))
    const ratingChanged = Number(item.rating || 0) !== Number((previous && previous.rating) || 0)
    if (ratingChanged && Number(item.rating || 0) > 0 && !authorize('PASSWORD PER SALVARE LA VALUTAZIONE:')) {
      throw new Error('VALUTAZIONE NON AUTORIZZATA')
    }

    let image = item.image || (previous && previous.image) || ''
    let imagePath = item.imagePath || (previous && previous.imagePath) || ''

    if (item.removeImage && imagePath) {
      await removeCloudFile(imagePath)
      image = ''
      imagePath = ''
    }

    if (item.imageFile) {
      if (imagePath) await removeCloudFile(imagePath)
      const folderCategory = String(linkedSession.category || 'generale').toLowerCase().replace(/\s+/g, '-')
      const uploaded = await uploadCloudFile(item.imageFile, `esercitazioni/${folderCategory}`)
      image = uploaded.url
      imagePath = uploaded.storagePath
    }

    const clean = {
      ...item,
      sessionId: linkedSession.id,
      category: linkedSession.category,
      image,
      imagePath,
      title: upper(item.title),
      equipment: upper(item.equipment),
      objective: upper(item.objective),
      description: upper(item.description),
      createdAt: Number(item.createdAt) || Date.now(),
    }
    delete clean.imageFile
    delete clean.removeImage

    const exists = Boolean(previous)
    const nextExercises = exists
      ? archive.exercises.map(exercise => String(exercise.id) === String(clean.id) ? clean : exercise)
      : [...archive.exercises, clean]

    const nextArchive = normalizeArchive({
      ...archive,
      exercises: nextExercises,
      audit: [...(archive.audit || []), makeAuditEntry(exists ? 'MODIFICA ESERCITAZIONE' : 'CREA ESERCITAZIONE', clean.title)].slice(-200),
      updatedAt: new Date().toISOString(),
    })

    undoStack.current.push(archive)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []

    await persistArchiveImmediately(nextArchive)
    setExerciseModal(null)
    showToast(exists ? 'ESERCITAZIONE MODIFICATA' : 'ESERCITAZIONE CREATA')
  }

  async function deleteExercise(id) {
    const item = archive.exercises.find(e => e.id === id)
    if(!confirm('ELIMINARE QUESTA ESERCITAZIONE?')) return
    if(!authorize("PASSWORD PER ELIMINARE L'ESERCITAZIONE:")) return
    try { if(item?.imagePath) await removeCloudFile(item.imagePath) } catch(error){ console.error(error) }
    commit(a=>({...a,exercises:a.exercises.filter(e=>e.id!==id)}), 'ELIMINA ESERCITAZIONE', item?.title)
  }

  function addDocuments(type, items){
    commit(a=>({...a,documents:{...a.documents,[type]:[...(a.documents[type]||[]),...items]}}),'CARICA DOCUMENTI',type)
  }

  async function deleteDocument(type,item){
    if(!authorize('PASSWORD PER ELIMINARE IL FILE:')) return
    try{ if(item.storagePath) await removeCloudFile(item.storagePath) }catch(error){console.error(error);alert('FILE RIMOSSO DALL’ARCHIVIO, MA NON DALLO STORAGE.')}
    commit(a=>({...a,documents:{...a.documents,[type]:(a.documents[type]||[]).filter(x=>x.id!==item.id)}}),'ELIMINA DOCUMENTO',item.title)
  }

  function exportArchive() {
    const payload = JSON.stringify({ ...archive, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ACQ_ARCHIVIO_${new Date().toISOString().slice(0,10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    showToast('BACKUP ESPORTATO')
  }

  async function importArchive(file) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const next = normalizeArchive(parsed)
      if (!confirm(`IMPORTARE ${next.sessions.length} SESSIONI E ${next.exercises.length} ESERCITAZIONI? L'OPERAZIONE È ANNULLABILE CON ⌘Z.`)) return
      if (!authorize('PASSWORD PER IMPORTARE IL BACKUP:')) return
      commit(next, 'IMPORTA ARCHIVIO', file.name)
      showToast('ARCHIVIO IMPORTATO')
    } catch (error) {
      console.error(error)
      alert('FILE NON VALIDO O DANNEGGIATO.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function migrateLegacy() {
    if (!legacyArchive) return
    if (!confirm(`MIGRARE ${legacyArchive.sessions.length} SESSIONI E ${legacyArchive.exercises.length} ESERCITAZIONI DALLA V23?`)) return
    if (!authorize('PASSWORD PER MIGRARE I DATI V23:')) return
    commit(legacyArchive, 'MIGRAZIONE V23', 'LOCALSTORAGE')
    showToast('DATI V23 MIGRATI NEL CLOUD')
  }

  if(auth===undefined) return <div className="loading">CARICAMENTO…</div>
  if(!auth) return <Login />

  return <div className="app-shell">
    <header className="hero"><div><small>ARCHIVIO METODOLOGICO ACQUACETOSA</small><h1>SCUOLA CALCIO<br/>ACQUACETOSA</h1></div><img src={`${import.meta.env.BASE_URL}logo-acquacetosa.png`}/><b>2026/27</b><nav><button onClick={()=>setSessionModal({})}>＋ SESSIONE ALLENAMENTO</button><button onClick={()=>setDocumentModal('meetings')}>RIUNIONI TECNICHE</button><button onClick={()=>setDocumentModal('teaching')}>MATERIALE DIDATTICO</button><button className="glass" onClick={exportArchive}>ESPORTA</button><button className="glass" onClick={()=>fileInput.current?.click()}>IMPORTA</button>{legacyArchive && <button className="glass" onClick={migrateLegacy}>MIGRA V23</button>}<button className="glass" onClick={installApp}>INSTALLA APP</button><button className="glass" onClick={()=>supabase.auth.signOut()}>ESCI</button><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e=>importArchive(e.target.files?.[0])}/></nav></header>
    <section className="history-bar"><button onClick={undo} disabled={!undoStack.current.length}>↶ ANNULLA</button><button onClick={redo} disabled={!redoStack.current.length}>↷ RIPRISTINA</button><button onClick={()=>setAuditOpen(true)}>CRONOLOGIA</button><span>⌘Z / CTRL+Z · CRONOLOGIA FINO A 100 MODIFICHE</span></section>
    <section className="filters"><input placeholder="CERCA PER TITOLO, OBIETTIVO O PAROLA CHIAVE…" value={search} onChange={e=>setSearch(e.target.value)}/><select value={coach} onChange={e=>setCoach(e.target.value)}><option value="">ALLENATORI</option>{COACHES.map(v=><option key={v}>{v}</option>)}</select><select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}><option value="">CATEGORIE</option>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select><select value={rating} onChange={e=>setRating(e.target.value)}><option value="">VALUTAZIONI</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} STELLE</option>)}</select><select value={phase} onChange={e=>setPhase(e.target.value)}><option value="">FASE ALLENAMENTO</option>{PHASES.map(v=><option key={v}>{v}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">PIÙ RECENTI</option><option value="az">A-Z</option><option value="players">N° GIOCATORI</option></select><button className="reset-filters" onClick={resetFilters}>AZZERA FILTRI</button></section>
    <section className="category-strip"><button className={!selectedCategory?'active':''} onClick={()=>setSelectedCategory('')}><span>▦</span><b>ARCHIVIO COMPLETO</b><small>{archive.sessions.length}SS / {archive.exercises.length}ES</small></button>{CATEGORIES.map(c=>{const ss=archive.sessions.filter(s=>s.category===c).length,es=archive.exercises.filter(e=>e.category===c).length;return <button key={c} className={selectedCategory===c?'active':''} onClick={()=>setSelectedCategory(c)}><span>⚽</span><b>{c}</b><small>{ss}SS / {es}ES</small></button>})}</section>
    <nav className="view-tabs"><button className={view==='sessions'?'active':''} onClick={()=>setView('sessions')}>SESSIONI ALLENAMENTO</button><button className={view==='library'?'active':''} onClick={()=>setView('library')}>LIBRERIA ESERCITAZIONI</button>{selectedCategory&&<button className={view==='matches'?'active':''} onClick={()=>setView('matches')}>PARTITE</button>}</nav>
    {view==='sessions' && <main>{!visibleSessions.length && <EmptyState title="NESSUNA SESSIONE TROVATA" text="MODIFICA I FILTRI O CREA UNA NUOVA SESSIONE."/>}{visibleSessions.map(s=><section className="session-card" key={s.id}><header><div><small>ALLENATORE</small><h2>{s.coach}</h2><p>{s.category} · {s.date} · {archive.exercises.filter(e=>e.sessionId===s.id).length} ESERCITAZIONI · {s.duration}'</p></div><div><button onClick={()=>openNewExercise(s)}>＋ ESERCITAZIONE</button><button className="soft" onClick={()=>setSessionModal(s)}>MODIFICA</button><button className="soft" onClick={()=>deleteSession(s.id)}>ELIMINA</button></div></header><p className="objective"><b>OBIETTIVO:</b> {s.objective}</p><div className="exercise-grid">{filteredExercises.filter(e=>e.sessionId===s.id).map(e=><ExerciseCard e={e} key={e.id} onEdit={()=>setExerciseModal({session:s,initial:e})} onDelete={()=>deleteExercise(e.id)}/>)}</div></section>)}</main>}
    {view==='library' && <main><div className="section-title"><div><h2>LIBRERIA ESERCITAZIONI</h2><p>TUTTE LE ESERCITAZIONI DELL’ARCHIVIO.</p></div><b>{filteredExercises.length} ESERCITAZIONI</b></div>{!filteredExercises.length && <EmptyState title="NESSUNA ESERCITAZIONE TROVATA" text="MODIFICA I FILTRI O AGGIUNGI UNA ESERCITAZIONE."/>}<div className="exercise-grid library">{filteredExercises.map(e=>{const s=archive.sessions.find(x=>x.id===e.sessionId);return <ExerciseCard e={e} key={e.id} onEdit={()=>s&&setExerciseModal({session:s,initial:e})} onDelete={()=>deleteExercise(e.id)}/>})}</div></main>}
    {view==='matches' && selectedCategory && <main><Matches category={selectedCategory} matches={archive.matchesByCategory[selectedCategory]||[]} onChange={items=>commit(a=>({...a,matchesByCategory:{...a.matchesByCategory,[selectedCategory]:items}}),'MODIFICA PARTITE',selectedCategory)}/></main>}
    <div className="build-badge">HOTFIX 2</div><div className={`cloud-pill ${isOnline ? "" : "offline"}`}>● {status}</div>
    {toast && <div className="action-toast">{toast}</div>}
    {auditOpen && <AuditModal items={archive.audit||[]} onClose={()=>setAuditOpen(false)}/>}
    {sessionModal && <SessionModal initial={sessionModal.id?sessionModal:null} onSave={saveSession} onClose={()=>setSessionModal(null)}/>} 
    {exerciseModal && <ExerciseModal session={exerciseModal.session} initial={exerciseModal.initial} onSave={saveExercise} onClose={()=>setExerciseModal(null)}/>} 
    {documentModal && <DocumentLibrary type={documentModal} items={archive.documents[documentModal]||[]} onAdd={items=>addDocuments(documentModal,items)} onDelete={item=>deleteDocument(documentModal,item)} onClose={()=>setDocumentModal(null)}/>} 
  </div>
}

function ExerciseCard({e,onEdit,onDelete}){return <article className="exercise-card"><div className="exercise-cover" style={e.image?{backgroundImage:`linear-gradient(rgba(5,25,50,.28),rgba(5,25,50,.55)),url(${e.image})`}:{}}><div><span>{e.category}</span><span>{e.phase}</span></div><h3>{e.title}</h3></div><div className="exercise-body"><div className="stats"><div><small>GIOCATORI</small><b>{e.players}</b></div><div><small>DURATA</small><b>{e.duration}'</b></div><div><small>SPAZIO</small><b>{e.space||'—'}</b></div></div><div className="rating">{'★'.repeat(e.rating||0)}{'☆'.repeat(5-(e.rating||0))}</div><p>{e.objective}</p><footer><button onClick={onEdit}>MODIFICA</button><button className="danger" onClick={onDelete}>ELIMINA</button></footer></div></article>}


function EmptyState({title,text}) {
  return <div className="app-empty"><b>{title}</b><span>{text}</span></div>
}

function AuditModal({items,onClose}) {
  const ordered=[...items].reverse()
  return <Modal title="CRONOLOGIA OPERAZIONI" onClose={onClose} wide>
    <div className="audit-list">
      {ordered.length ? ordered.map((item,index)=><article key={`${item.at}-${index}`}>
        <b>{item.action||'OPERAZIONE'}</b>
        <span>{item.details||'—'}</span>
        <small>{new Date(item.at||Date.now()).toLocaleString('it-IT')}</small>
      </article>) : <EmptyState title="NESSUNA OPERAZIONE REGISTRATA" text="LA CRONOLOGIA COMPARIRÀ QUI."/>}
    </div>
  </Modal>
}
