import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, uid, upper } from '../lib/archive'

export default function PlayerManager({ players, onSave, onClose }) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ firstName:'', lastName:'', category:CATEGORIES[0], shirtNumber:'', active:true })

  const visible = useMemo(() => {
    const q = upper(query)
    return players
      .filter(player => player.category === category)
      .filter(player => !q || upper(`${player.firstName} ${player.lastName} ${player.shirtNumber}`).includes(q))
      .sort((a,b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'it'))
  }, [players, category, query])

  function resetForm(nextCategory = category) {
    setEditing(null)
    setForm({ firstName:'', lastName:'', category:nextCategory, shirtNumber:'', active:true })
  }

  function edit(player) {
    setEditing(player.id)
    setForm({
      firstName:player.firstName || '',
      lastName:player.lastName || '',
      category:player.category,
      shirtNumber:player.shirtNumber ?? '',
      active:player.active !== false,
    })
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      window.alert('INSERISCI NOME E COGNOME DEL TESSERATO.')
      return
    }
    const item = {
      id: editing || uid(),
      firstName:upper(form.firstName),
      lastName:upper(form.lastName),
      category:form.category,
      shirtNumber:form.shirtNumber === '' ? '' : Number(form.shirtNumber),
      active:Boolean(form.active),
      createdAt: editing ? players.find(p=>p.id===editing)?.createdAt || Date.now() : Date.now(),
    }
    await onSave(item)
    setCategory(item.category)
    resetForm(item.category)
  }

  return <Modal title="ANAGRAFICA TESSERATI" onClose={onClose} wide>
    <div className="players-manager">
      <section className="players-toolbar">
        <select value={category} onChange={event=>{setCategory(event.target.value);resetForm(event.target.value)}}>
          {CATEGORIES.map(value=><option key={value}>{value}</option>)}
        </select>
        <input placeholder="CERCA TESSERATO…" value={query} onChange={event=>setQuery(event.target.value)}/>
        <b>{visible.length} TESSERATI</b>
      </section>

      <section className="players-layout">
        <form className="player-form" onSubmit={submit}>
          <h3>{editing ? 'MODIFICA TESSERATO' : 'NUOVO TESSERATO'}</h3>
          <label>NOME<input value={form.firstName} onChange={e=>setForm(v=>({...v,firstName:e.target.value}))}/></label>
          <label>COGNOME<input value={form.lastName} onChange={e=>setForm(v=>({...v,lastName:e.target.value}))}/></label>
          <label>CATEGORIA<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>NUMERO MAGLIA<input type="number" min="0" max="99" value={form.shirtNumber} onChange={e=>setForm(v=>({...v,shirtNumber:e.target.value}))}/></label>
          <label className="player-active"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/> TESSERATO ATTIVO</label>
          <footer>
            {editing && <button type="button" className="soft" onClick={()=>resetForm()}>ANNULLA</button>}
            <button type="submit">{editing ? 'SALVA MODIFICHE' : 'AGGIUNGI TESSERATO'}</button>
          </footer>
        </form>

        <div className="players-list">
          {!visible.length && <div className="app-empty"><b>NESSUN TESSERATO</b><span>INSERISCI IL PRIMO GIOCATORE DELLA CATEGORIA.</span></div>}
          {visible.map(player=><article key={player.id} className={player.active ? '' : 'inactive'}>
            <div className="player-number">{player.shirtNumber === '' ? '—' : player.shirtNumber}</div>
            <div><b>{player.lastName} {player.firstName}</b><span>{player.category} · {player.active ? 'ATTIVO' : 'NON ATTIVO'}</span></div>
            <button type="button" onClick={()=>edit(player)}>MODIFICA</button>
          </article>)}
        </div>
      </section>
    </div>
  </Modal>
}
