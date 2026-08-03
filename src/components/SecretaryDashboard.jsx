import { useMemo, useState } from 'react'
import PlayerDocumentsManager from './PlayerDocumentsManager'
import SecretaryCalendars from './SecretaryCalendars'
import AttendanceStatistics from './AttendanceStatistics'
import AttendanceModal from './AttendanceModal'
import { CATEGORIES, upper } from '../lib/archive'

export default function SecretaryDashboard({ archive, profile, status, isOnline, onSignOut, onSavePlayerDocuments, onSaveAttendance }) {
  const [category,setCategory]=useState('')
  const [documentsOpen,setDocumentsOpen]=useState(false)
  const [calendarsOpen,setCalendarsOpen]=useState(false)
  const [attendanceStatsOpen,setAttendanceStatsOpen]=useState(false)
  const [attendanceSession,setAttendanceSession]=useState(null)

  const sessions=useMemo(()=>archive.sessions
    .filter(session=>!category||session.category===category)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),
  [archive.sessions,category])

  return <div className="secretary-shell">
    <header className="secretary-hero">
      <div><small>AREA SEGRETERIA</small><h1>SCUOLA CALCIO<br/>ACQUACETOSA</h1></div>
      <div className="secretary-brand"><span>2026/27</span><img src={`${import.meta.env.BASE_URL}logo-acquacetosa.png`} alt="Acquacetosa"/><button onClick={onSignOut}>ESCI</button></div>
      <nav>
        <button onClick={()=>setDocumentsOpen(true)}>TESSERATI</button>
        <button onClick={()=>setCalendarsOpen(true)}>CALENDARI PARTITE</button>
        <button onClick={()=>setAttendanceStatsOpen(true)}>PRESENZE</button>
      </nav>
    </header>

    <section className="profile-bar">
      <div className="profile-avatar">{profile.first_name?.[0]||'S'}{profile.last_name?.[0]||''}</div>
      <div><b>{upper([profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.email)}</b><span>SEGRETARIO · TUTTE LE CATEGORIE</span></div>
    </section>

    <section className="secretary-category-filter">
      <select value={category} onChange={event=>setCategory(event.target.value)}><option value="">TUTTE LE CATEGORIE</option>{CATEGORIES.map(value=><option key={value}>{value}</option>)}</select>
      <b>{sessions.length} SESSIONI</b>
    </section>

    <main className="secretary-session-list">
      {!sessions.length&&<div className="app-empty"><b>NESSUNA SESSIONE TROVATA</b></div>}
      {sessions.map(session=>{
        const present=(archive.attendanceBySession[session.id]?.presentIds||[]).length
        return <article key={session.id}>
          <div><small>{session.category}</small><h2>{session.coach}</h2><p>{session.date?session.date.split('-').reverse().join('/'):'—'} · {session.duration}' · {session.players} GIOCATORI PREVISTI</p><strong>OBIETTIVO: {session.objective||'—'}</strong></div>
          <div className="secretary-session-presence"><b>{present}</b><span>PRESENTI</span><button onClick={()=>setAttendanceSession(session)}>APRI PRESENZE</button></div>
        </article>
      })}
    </main>

    <div className={`cloud-pill ${isOnline?'':'offline'}`}>● {status}</div>

    {documentsOpen&&<PlayerDocumentsManager players={archive.players} playerDocuments={archive.playerDocuments||{}} currentUser={[profile.first_name,profile.last_name].filter(Boolean).join(' ')} onChange={onSavePlayerDocuments} onClose={()=>setDocumentsOpen(false)}/>}
    {calendarsOpen&&<SecretaryCalendars matchesByCategory={archive.matchesByCategory} onClose={()=>setCalendarsOpen(false)}/>}
    {attendanceStatsOpen&&<AttendanceStatistics archive={archive} visibleCategories={CATEGORIES} onClose={()=>setAttendanceStatsOpen(false)}/>}
    {attendanceSession&&<AttendanceModal session={attendanceSession} players={archive.players} attendance={archive.attendanceBySession[attendanceSession.id]} onSave={ids=>{onSaveAttendance(attendanceSession,ids);setAttendanceSession(null)}} onClose={()=>setAttendanceSession(null)}/>}
  </div>
}
