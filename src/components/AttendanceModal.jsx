import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'

export default function AttendanceModal({ session, players, attendance, onSave, onClose }) {
  const categoryPlayers = useMemo(() => players
    .filter(player => player.category === session.category && player.active !== false)
    .sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'it')),
  [players, session.category])

  const [presentIds, setPresentIds] = useState(new Set(attendance?.presentIds || []))
  const [query, setQuery] = useState('')

  useEffect(() => {
    setPresentIds(new Set(attendance?.presentIds || []))
  }, [attendance])

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase()
    return categoryPlayers.filter(player => !q || `${player.firstName} ${player.lastName}`.includes(q))
  }, [categoryPlayers, query])

  function toggle(id) {
    setPresentIds(current => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setPresentIds(new Set(categoryPlayers.map(player=>player.id)))
  }

  function clearAll() {
    setPresentIds(new Set())
  }

  const present = presentIds.size
  const total = categoryPlayers.length

  return <Modal title={`PRESENZE · ${session.category}`} onClose={onClose} wide>
    <div className="attendance-modal">
      <header>
        <div>
          <small>SESSIONE DEL {session.date ? session.date.split('-').reverse().join('/') : '—'}</small>
          <h2>{session.coach}</h2>
          <p>{session.category} · {session.duration}'</p>
        </div>
        <div className="attendance-counts">
          <span><b>{present}</b>PRESENTI</span>
          <span><b>{Math.max(0,total-present)}</b>ASSENTI</span>
          <span><b>{total}</b>TOTALI</span>
        </div>
      </header>

      <section className="attendance-toolbar">
        <input placeholder="CERCA GIOCATORE…" value={query} onChange={event=>setQuery(event.target.value)}/>
        <button type="button" className="soft" onClick={selectAll}>SELEZIONA TUTTI</button>
        <button type="button" className="soft" onClick={clearAll}>AZZERA</button>
      </section>

      <section className="attendance-list">
        {!categoryPlayers.length && <div className="app-empty"><b>NESSUN TESSERATO IN QUESTA CATEGORIA</b><span>IL DIRETTORE DEVE PRIMA INSERIRE I GIOCATORI NELL’ANAGRAFICA TESSERATI.</span></div>}
        {visible.map(player=><label key={player.id} className={presentIds.has(player.id) ? 'present' : ''}>
          <input type="checkbox" checked={presentIds.has(player.id)} onChange={()=>toggle(player.id)}/>
          <span className="attendance-box">✓</span>
          <span className="attendance-number">{player.shirtNumber === '' ? '—' : player.shirtNumber}</span>
          <b>{player.lastName} {player.firstName}</b>
        </label>)}
      </section>

      <footer>
        <button type="button" className="ghost" onClick={onClose}>ANNULLA</button>
        <button type="button" onClick={()=>onSave([...presentIds])} disabled={!categoryPlayers.length}>SALVA PRESENZE</button>
      </footer>
    </div>
  </Modal>
}
