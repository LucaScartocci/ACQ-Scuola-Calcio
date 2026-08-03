import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES } from '../lib/archive'

export default function AttendanceModal({ session, players, attendance, onSave, onClose }) {
  const [categoryFilter, setCategoryFilter] = useState(session.category || '')
  const [presentIds, setPresentIds] = useState(new Set(attendance?.presentIds || []))
  const [query, setQuery] = useState('')

  const activePlayers = useMemo(() =>
    players
      .filter(player => player.active !== false)
      .sort((a,b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'it')
      ),
  [players])

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase()
    return activePlayers.filter(player =>
      (!categoryFilter || player.category === categoryFilter)
      && (!q || `${player.firstName} ${player.lastName} ${player.category}`.includes(q))
    )
  }, [activePlayers, categoryFilter, query])

  function toggle(id) {
    setPresentIds(current => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectVisible() {
    setPresentIds(current => {
      const next = new Set(current)
      visible.forEach(player => next.add(player.id))
      return next
    })
  }

  function clearVisible() {
    setPresentIds(current => {
      const next = new Set(current)
      visible.forEach(player => next.delete(player.id))
      return next
    })
  }

  const selectedPlayers = activePlayers.filter(player => presentIds.has(player.id))
  const total = activePlayers.length

  return <Modal title={`PRESENZE · ${session.category}`} onClose={onClose} wide>
    <div className="attendance-modal">
      <header>
        <div>
          <small>SESSIONE DEL {session.date ? session.date.split('-').reverse().join('/') : '—'}</small>
          <h2>{session.coach}</h2>
          <p>{session.category} · {session.duration}'</p>
        </div>
        <div className="attendance-counts">
          <span><b>{presentIds.size}</b>PRESENTI</span>
          <span><b>{Math.max(0,total-presentIds.size)}</b>NON SELEZIONATI</span>
          <span><b>{total}</b>TESSERATI</span>
        </div>
      </header>

      <section className="attendance-toolbar attendance-toolbar-wide">
        <select value={categoryFilter} onChange={event=>setCategoryFilter(event.target.value)}>
          <option value="">TUTTE LE CATEGORIE</option>
          {CATEGORIES.map(value=><option key={value}>{value}</option>)}
        </select>
        <input
          placeholder="CERCA GIOCATORE…"
          value={query}
          onChange={event=>setQuery(event.target.value)}
        />
        <button type="button" className="soft" onClick={selectVisible}>SELEZIONA VISIBILI</button>
        <button type="button" className="soft" onClick={clearVisible}>AZZERA VISIBILI</button>
      </section>

      <section className="attendance-selected-summary">
        <b>{selectedPlayers.length} GIOCATORI SELEZIONATI</b>
        <span>
          {selectedPlayers.length
            ? selectedPlayers.map(player => `${player.lastName} ${player.firstName} (${player.category})`).join(' · ')
            : 'NESSUN GIOCATORE SELEZIONATO'}
        </span>
      </section>

      <section className="attendance-list">
        {!activePlayers.length && <div className="app-empty"><b>NESSUN TESSERATO DISPONIBILE</b><span>IL DIRETTORE DEVE PRIMA INSERIRE I GIOCATORI NELL’ANAGRAFICA TESSERATI.</span></div>}
        {activePlayers.length > 0 && !visible.length && <div className="app-empty"><b>NESSUN GIOCATORE TROVATO</b><span>MODIFICA IL FILTRO CATEGORIA O LA RICERCA.</span></div>}
        {visible.map(player=><label key={player.id} className={presentIds.has(player.id) ? 'present' : ''}>
          <input type="checkbox" checked={presentIds.has(player.id)} onChange={()=>toggle(player.id)}/>
          <span className="attendance-box">✓</span>
          <span className="attendance-number">{player.shirtNumber === '' ? '—' : player.shirtNumber}</span>
          <span className="attendance-player-row">
            <b>{player.lastName} {player.firstName}</b>
            <small>{player.category}</small>
          </span>
        </label>)}
      </section>

      <footer>
        <button type="button" className="ghost" onClick={onClose}>ANNULLA</button>
        <button type="button" onClick={()=>onSave([...presentIds])} disabled={!activePlayers.length}>SALVA PRESENZE</button>
      </footer>
    </div>
  </Modal>
}
