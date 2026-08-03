import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, CLOUD_STATE_ID } from './lib/supabase'
import { CATEGORIES, COACHES, PHASES, emptyArchive, normalizeArchive, upper } from './lib/archive'
import Login from './components/Login'
import SessionModal from './components/SessionModal'
import ExerciseModal from './components/ExerciseModal'
import Matches from './components/Matches'
import './styles.css'

export default function App() {
  const [auth, setAuth] = useState(undefined)
  const [archive, setArchive] = useState(emptyArchive)
  const [status, setStatus] = useState('CONNESSIONE…')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [view, setView] = useState('sessions')
  const [search, setSearch] = useState('')
  const [coach, setCoach] = useState('')
  const [phase, setPhase] = useState('')
  const [rating, setRating] = useState('')
  const [sort, setSort] = useState('recent')
  const [sessionModal, setSessionModal] = useState(null)
  const [exerciseModal, setExerciseModal] = useState(null)
  const saveTimer = useRef(null)
  const applyingRemote = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setAuth(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuth(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!auth) return
    let channel
    async function start() {
      setStatus('CARICAMENTO CLOUD…')
      const { data, error } = await supabase.from('app_state').select('data').eq('id', CLOUD_STATE_ID).maybeSingle()
      if (error) { setStatus('ERRORE CLOUD'); console.error(error); return }
      const cloud = data?.data && Object.keys(data.data).length ? normalizeArchive(data.data) : emptyArchive()
      applyingRemote.current = true; setArchive(cloud); applyingRemote.current = false
      setStatus('ARCHIVIO SINCRONIZZATO')
      channel = supabase.channel('acq-v24').on('postgres_changes',{event:'*',schema:'public',table:'app_state',filter:`id=eq.${CLOUD_STATE_ID}`}, payload => {
        if (payload.new?.data) { applyingRemote.current=true; setArchive(normalizeArchive(payload.new.data)); applyingRemote.current=false; setStatus('AGGIORNATO DA ALTRO DISPOSITIVO') }
      }).subscribe()
    }
    start()
    return () => { if(channel) supabase.removeChannel(channel) }
  }, [auth])

  useEffect(() => {
    if (!auth || applyingRemote.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setStatus('SALVATAGGIO…')
      const data = { ...archive, updatedAt: new Date().toISOString() }
      const { error } = await supabase.from('app_state').upsert({ id:CLOUD_STATE_ID, data, updated_at:new Date().toISOString(), updated_by:auth.user.email },{onConflict:'id'})
      setStatus(error ? 'ERRORE SALVATAGGIO' : 'ARCHIVIO SINCRONIZZATO')
      if(error) console.error(error)
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [archive, auth])

  const categorySessions = useMemo(() => archive.sessions.filter(s => !selectedCategory || s.category === selectedCategory), [archive.sessions, selectedCategory])
  const filteredExercises = useMemo(() => {
    let list = archive.exercises.filter(e => (!selectedCategory || e.category === selectedCategory) && (!phase || e.phase === phase) && (!rating || Number(e.rating) === Number(rating)))
    const q = upper(search)
    if(q) list = list.filter(e => upper([e.title,e.objective,e.description,e.equipment].join(' ')).includes(q))
    if(sort==='az') list.sort((a,b)=>a.title.localeCompare(b.title,'it'))
    if(sort==='players') list.sort((a,b)=>(b.players||0)-(a.players||0))
    if(sort==='recent') list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
    return list
  },[archive.exercises,selectedCategory,phase,rating,search,sort])
  const visibleSessions = categorySessions.filter(s => (!coach || s.coach===coach) && (!search || upper([s.coach,s.objective].join(' ')).includes(upper(search)) || filteredExercises.some(e=>e.sessionId===s.id)))

  function saveSession(item) { setArchive(a => ({...a,sessions:a.sessions.some(s=>s.id===item.id)?a.sessions.map(s=>s.id===item.id?item:s):[...a.sessions,item]})); setSessionModal(null) }
  function deleteSession(id) { if(!confirm('ELIMINARE LA SESSIONE E TUTTE LE ESERCITAZIONI AL SUO INTERNO?'))return; setArchive(a=>({...a,sessions:a.sessions.filter(s=>s.id!==id),exercises:a.exercises.filter(e=>e.sessionId!==id)})) }
  function saveExercise(item) { setArchive(a=>({...a,exercises:a.exercises.some(e=>e.id===item.id)?a.exercises.map(e=>e.id===item.id?item:e):[...a.exercises,item]}));setExerciseModal(null) }
  function deleteExercise(id){if(confirm('ELIMINARE QUESTA ESERCITAZIONE?'))setArchive(a=>({...a,exercises:a.exercises.filter(e=>e.id!==id)}))}

  if(auth===undefined) return <div className="loading">CARICAMENTO…</div>
  if(!auth) return <Login />

  return <div className="app-shell">
    <header className="hero"><div><small>ARCHIVIO METODOLOGICO ACQUACETOSA</small><h1>SCUOLA CALCIO<br/>ACQUACETOSA</h1></div><img src={`${import.meta.env.BASE_URL}logo-acquacetosa.png`}/><b>2026/27</b><nav><button onClick={()=>setSessionModal({})}>＋ SESSIONE ALLENAMENTO</button><button>RIUNIONI TECNICHE</button><button>MATERIALE DIDATTICO</button><button className="glass" onClick={()=>supabase.auth.signOut()}>ESCI</button></nav></header>
    <section className="filters"><input placeholder="CERCA PER TITOLO, OBIETTIVO O PAROLA CHIAVE…" value={search} onChange={e=>setSearch(e.target.value)}/><select value={coach} onChange={e=>setCoach(e.target.value)}><option value="">ALLENATORI</option>{COACHES.map(v=><option key={v}>{v}</option>)}</select><select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}><option value="">CATEGORIE</option>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select><select value={rating} onChange={e=>setRating(e.target.value)}><option value="">VALUTAZIONI</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} STELLE</option>)}</select><select value={phase} onChange={e=>setPhase(e.target.value)}><option value="">FASE ALLENAMENTO</option>{PHASES.map(v=><option key={v}>{v}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">PIÙ RECENTI</option><option value="az">A-Z</option><option value="players">N° GIOCATORI</option></select></section>
    <section className="category-strip"><button className={!selectedCategory?'active':''} onClick={()=>setSelectedCategory('')}><span>▦</span><b>ARCHIVIO COMPLETO</b><small>{archive.sessions.length}SS / {archive.exercises.length}ES</small></button>{CATEGORIES.map(c=>{const ss=archive.sessions.filter(s=>s.category===c).length,es=archive.exercises.filter(e=>e.category===c).length;return <button key={c} className={selectedCategory===c?'active':''} onClick={()=>setSelectedCategory(c)}><span>⚽</span><b>{c}</b><small>{ss}SS / {es}ES</small></button>})}</section>
    <nav className="view-tabs"><button className={view==='sessions'?'active':''} onClick={()=>setView('sessions')}>SESSIONI ALLENAMENTO</button><button className={view==='library'?'active':''} onClick={()=>setView('library')}>LIBRERIA ESERCITAZIONI</button>{selectedCategory&&<button className={view==='matches'?'active':''} onClick={()=>setView('matches')}>PARTITE</button>}</nav>
    {view==='sessions' && <main>{visibleSessions.map(s=><section className="session-card" key={s.id}><header><div><small>ALLENATORE</small><h2>{s.coach}</h2><p>{s.category} · {s.date} · {archive.exercises.filter(e=>e.sessionId===s.id).length} ESERCITAZIONI · {s.duration}'</p></div><div><button onClick={()=>setExerciseModal({session:s})}>＋ ESERCITAZIONE</button><button className="soft" onClick={()=>setSessionModal(s)}>MODIFICA</button><button className="soft" onClick={()=>deleteSession(s.id)}>ELIMINA</button></div></header><p className="objective"><b>OBIETTIVO:</b> {s.objective}</p><div className="exercise-grid">{filteredExercises.filter(e=>e.sessionId===s.id).map(e=><ExerciseCard e={e} key={e.id} onEdit={()=>setExerciseModal({session:s,initial:e})} onDelete={()=>deleteExercise(e.id)}/>)}</div></section>)}</main>}
    {view==='library' && <main><div className="section-title"><div><h2>LIBRERIA ESERCITAZIONI</h2><p>TUTTE LE ESERCITAZIONI DELL’ARCHIVIO.</p></div><b>{filteredExercises.length} ESERCITAZIONI</b></div><div className="exercise-grid library">{filteredExercises.map(e=>{const s=archive.sessions.find(x=>x.id===e.sessionId);return <ExerciseCard e={e} key={e.id} onEdit={()=>s&&setExerciseModal({session:s,initial:e})} onDelete={()=>deleteExercise(e.id)}/>})}</div></main>}
    {view==='matches' && selectedCategory && <main><Matches category={selectedCategory} matches={archive.matchesByCategory[selectedCategory]||[]} onChange={items=>setArchive(a=>({...a,matchesByCategory:{...a.matchesByCategory,[selectedCategory]:items}}))}/></main>}
    <div className="cloud-pill">● {status}</div>
    {sessionModal && <SessionModal initial={sessionModal.id?sessionModal:null} onSave={saveSession} onClose={()=>setSessionModal(null)}/>} 
    {exerciseModal && <ExerciseModal session={exerciseModal.session} initial={exerciseModal.initial} onSave={saveExercise} onClose={()=>setExerciseModal(null)}/>} 
  </div>
}

function ExerciseCard({e,onEdit,onDelete}){return <article className="exercise-card"><div className="exercise-cover" style={e.image?{backgroundImage:`linear-gradient(rgba(5,25,50,.28),rgba(5,25,50,.55)),url(${e.image})`}:{}}><div><span>{e.category}</span><span>{e.phase}</span></div><h3>{e.title}</h3></div><div className="exercise-body"><div className="stats"><div><small>GIOCATORI</small><b>{e.players}</b></div><div><small>DURATA</small><b>{e.duration}'</b></div><div><small>SPAZIO</small><b>{e.space||'—'}</b></div></div><div className="rating">{'★'.repeat(e.rating||0)}{'☆'.repeat(5-(e.rating||0))}</div><p>{e.objective}</p><footer><button onClick={onEdit}>MODIFICA</button><button className="danger" onClick={onDelete}>ELIMINA</button></footer></div></article>}
