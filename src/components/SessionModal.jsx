import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, COACHES, upper, uid } from '../lib/archive'

export default function SessionModal({ initial, onSave, onClose, allowedCategories = CATEGORIES, fixedCoach = '', canChooseCoach = true }) {
  const categories = allowedCategories.length ? allowedCategories : CATEGORIES
  const defaultCoach = fixedCoach || COACHES[0]
  const [form, setForm] = useState({
    coach: defaultCoach,
    category: categories[0],
    date: '',
    duration: 90,
    players: 16,
    field: '',
    objective: '',
    staffNotes: ''
  })

  useEffect(() => {
    if (initial) {
      setForm(current => ({ ...current, ...initial }))
    } else {
      setForm(current => ({
        ...current,
        coach: fixedCoach || current.coach || defaultCoach,
        category: categories.includes(current.category) ? current.category : categories[0],
      }))
    }
  }, [initial, fixedCoach, defaultCoach, categories.join('|')])

  const set = (key, value) => setForm(value => ({ ...value, [key]: value }))

  function change(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  return <Modal title={initial ? 'MODIFICA SESSIONE' : 'NUOVA SESSIONE ALLENAMENTO'} onClose={onClose}>
    <form className="form-grid" onSubmit={event => {
      event.preventDefault()
      onSave({
        ...form,
        id: initial?.id || uid(),
        coach: upper(fixedCoach || form.coach),
        category: form.category,
        field: upper(form.field),
        objective: upper(form.objective),
        staffNotes: upper(form.staffNotes),
        createdAt: initial?.createdAt || Date.now()
      })
    }}>
      <label className="full">NOME ALLENATORE
        <select value={fixedCoach || form.coach} disabled={!canChooseCoach || Boolean(fixedCoach)} onChange={event => change('coach', event.target.value)}>
          {COACHES.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>CATEGORIA
        <select value={form.category} onChange={event => change('category', event.target.value)}>
          {categories.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>DATA<input type="date" value={form.date} onChange={event => change('date', event.target.value)} required /></label>
      <label>DURATA PREVISTA<input type="number" value={form.duration} onChange={event => change('duration', Number(event.target.value))} min="1" /></label>
      <label>N° GIOCATORI<input type="number" value={form.players} onChange={event => change('players', Number(event.target.value))} min="1" /></label>
      <label>CAMPO / LUOGO<input value={form.field || ''} onChange={event => change('field', event.target.value)} placeholder="ES. CAMPO A"/></label>
      <label className="full">OBIETTIVO DELLA SEDUTA<textarea value={form.objective} onChange={event => change('objective', event.target.value)} /></label>
      <label className="full">NOTE DELLO STAFF PER IL PDF<textarea value={form.staffNotes || ''} onChange={event => change('staffNotes', event.target.value)} placeholder="NOTE ORGANIZZATIVE, COACHING POINTS GENERALI, INDICAZIONI FINALI…"/></label>
      <footer className="modal-actions full"><button type="button" className="ghost" onClick={onClose}>ANNULLA</button><button>SALVA SESSIONE</button></footer>
    </form>
  </Modal>
}
