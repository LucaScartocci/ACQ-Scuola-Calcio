import { useEffect, useState } from 'react'
import Modal from './Modal'
import { PHASES, upper, uid } from '../lib/archive'

export default function ExerciseModal({ session, initial, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', phase: PHASES[0], players: session.players || 16, duration: 20, space: '', equipment: '', objective: '', description: '', rating: 0, image: '' })
  useEffect(() => { if (initial) setForm(v => ({ ...v, ...initial })) }, [initial])
  const set = (key, value) => setForm(v => ({ ...v, [key]: value }))
  function fileChange(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('image', reader.result)
    reader.readAsDataURL(file)
  }
  return <Modal title={initial ? 'MODIFICA ESERCITAZIONE' : 'NUOVA ESERCITAZIONE'} onClose={onClose} wide>
    <form className="form-grid" onSubmit={e => { e.preventDefault(); onSave({ ...form, id: initial?.id || uid(), sessionId: session.id, category: session.category, title: upper(form.title), space: upper(form.space), equipment: upper(form.equipment), objective: upper(form.objective), description: upper(form.description), createdAt: initial?.createdAt || Date.now() }, initial) }}>
      <label className="full">TITOLO<input value={form.title} onChange={e => set('title', e.target.value)} required /></label>
      <label className="full">IMMAGINE<input type="file" accept="image/*" onChange={e => fileChange(e.target.files[0])} /></label>
      {form.image && <div className="image-preview full"><img src={form.image} /><button type="button" onClick={() => set('image', '')}>×</button></div>}
      <label>FASE ALLENAMENTO<select value={form.phase} onChange={e => set('phase', e.target.value)}>{PHASES.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>N° GIOCATORI<input type="number" value={form.players} onChange={e => set('players', Number(e.target.value))} /></label>
      <label>DURATA<input type="number" value={form.duration} onChange={e => set('duration', Number(e.target.value))} /></label>
      <label>SPAZIO<input value={form.space} onChange={e => set('space', e.target.value)} /></label>
      <label className="full">MATERIALE<input value={form.equipment} onChange={e => set('equipment', e.target.value)} /></label>
      <label className="full">OBIETTIVO PRINCIPALE<textarea value={form.objective} onChange={e => set('objective', e.target.value)} /></label>
      <label className="full">ORGANIZZAZIONE E SVOLGIMENTO<textarea value={form.description} onChange={e => set('description', e.target.value)} /></label>
      <label className="full">VALUTAZIONE<div className="stars">{[1,2,3,4,5].map(n => <button type="button" className={n <= form.rating ? 'active' : ''} onClick={() => set('rating', n)} key={n}>★</button>)}</div><small className="protected-note">LA MODIFICA DELLA VALUTAZIONE È PROTETTA DA PASSWORD.</small></label>
      <footer className="modal-actions full"><button type="button" className="ghost" onClick={onClose}>ANNULLA</button><button>SALVA ESERCITAZIONE</button></footer>
    </form>
  </Modal>
}
