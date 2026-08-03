import { useEffect, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, COACHES, upper, uid } from '../lib/archive'

export default function SessionModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ coach: COACHES[0], category: CATEGORIES[0], date: '', duration: 90, players: 16, objective: '' })
  useEffect(() => { if (initial) setForm({ ...form, ...initial }) }, [initial])
  const set = (key, value) => setForm(v => ({ ...v, [key]: value }))
  return <Modal title={initial ? 'MODIFICA SESSIONE' : 'NUOVA SESSIONE ALLENAMENTO'} onClose={onClose}>
    <form className="form-grid" onSubmit={e => { e.preventDefault(); onSave({ ...form, id: initial?.id || uid(), coach: upper(form.coach), objective: upper(form.objective), createdAt: initial?.createdAt || Date.now() }) }}>
      <label className="full">NOME ALLENATORE<select value={form.coach} onChange={e => set('coach', e.target.value)}>{COACHES.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>CATEGORIA<select value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>DATA<input type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></label>
      <label>DURATA PREVISTA<input type="number" value={form.duration} onChange={e => set('duration', Number(e.target.value))} min="1" /></label>
      <label>N° GIOCATORI<input type="number" value={form.players} onChange={e => set('players', Number(e.target.value))} min="1" /></label>
      <label className="full">OBIETTIVO DELLA SEDUTA<textarea value={form.objective} onChange={e => set('objective', e.target.value)} /></label>
      <footer className="modal-actions full"><button type="button" className="ghost" onClick={onClose}>ANNULLA</button><button>SALVA SESSIONE</button></footer>
    </form>
  </Modal>
}
