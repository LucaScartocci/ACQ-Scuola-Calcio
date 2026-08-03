import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { PHASES, upper, uid } from '../lib/archive'

export default function ExerciseModal({ session, initial, onSave, onClose }) {
  const safeSession = useMemo(() => ({
    id: session && session.id ? session.id : '',
    category: session && session.category ? session.category : '',
    players: session && Number(session.players) > 0 ? Number(session.players) : 16,
  }), [session])

  const [form, setForm] = useState(() => ({
    title: '',
    phase: PHASES[0],
    players: safeSession.players,
    duration: 20,
    space: '',
    equipment: '',
    objective: '',
    description: '',
    rating: 0,
    image: '',
    imagePath: '',
  }))
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm(current => ({ ...current, ...initial }))
      setPreview(initial.image || '')
    } else {
      setForm(current => ({
        ...current,
        players: safeSession.players,
      }))
    }
  }, [initial, safeSession.players])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  function fileChange(file) {
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result || ''))
    reader.onerror = () => window.alert("IMPOSSIBILE LEGGERE L'IMMAGINE SELEZIONATA.")
    reader.readAsDataURL(file)
  }

  async function submit(event) {
    event.preventDefault()

    if (!safeSession.id) {
      window.alert('SESSIONE NON DISPONIBILE. CHIUDI LA FINESTRA, AGGIORNA LA PAGINA E RIPROVA.')
      return
    }
    if (!safeSession.category) {
      window.alert('LA SESSIONE NON HA UNA CATEGORIA VALIDA.')
      return
    }
    if (!String(form.title || '').trim()) {
      window.alert("INSERISCI IL TITOLO DELL'ESERCITAZIONE.")
      return
    }

    setBusy(true)
    try {
      await onSave({
        ...form,
        imageFile,
        removeImage: !preview && Boolean(form.image),
        id: initial && initial.id ? initial.id : uid(),
        sessionId: safeSession.id,
        category: safeSession.category,
        title: upper(form.title),
        space: upper(form.space),
        equipment: upper(form.equipment),
        objective: upper(form.objective),
        description: upper(form.description),
        players: Number(form.players) || safeSession.players,
        duration: Number(form.duration) || 20,
        rating: Number(form.rating) || 0,
        createdAt: initial && initial.createdAt ? initial.createdAt : Date.now(),
      }, initial || null)
    } catch (error) {
      console.error(error)
      window.alert("NON È STATO POSSIBILE SALVARE L'ESERCITAZIONE: " + (error.message || 'ERRORE SCONOSCIUTO'))
    } finally {
      setBusy(false)
    }
  }

  return <Modal title={initial ? 'MODIFICA ESERCITAZIONE' : 'NUOVA ESERCITAZIONE'} onClose={onClose} wide>
    <form className="form-grid" onSubmit={submit}>
      <label className="full">TITOLO
        <input value={form.title} onChange={event => set('title', event.target.value)} required />
      </label>

      <label className="full">IMMAGINE
        <input type="file" accept="image/*" onChange={event => fileChange(event.target.files && event.target.files[0])} />
      </label>

      {preview && <div className="image-preview full">
        <img src={preview} alt="Anteprima esercitazione" />
        <button type="button" onClick={() => { setPreview(''); setImageFile(null) }}>×</button>
      </div>}

      <label>FASE ALLENAMENTO
        <select value={form.phase} onChange={event => set('phase', event.target.value)}>
          {PHASES.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>

      <label>N° GIOCATORI
        <input type="number" min="1" value={form.players} onChange={event => set('players', Number(event.target.value))} />
      </label>

      <label>DURATA
        <input type="number" min="1" value={form.duration} onChange={event => set('duration', Number(event.target.value))} />
      </label>

      <label>SPAZIO
        <input value={form.space} onChange={event => set('space', event.target.value)} />
      </label>

      <label className="full">MATERIALE
        <input value={form.equipment} onChange={event => set('equipment', event.target.value)} />
      </label>

      <label className="full">OBIETTIVO PRINCIPALE
        <textarea value={form.objective} onChange={event => set('objective', event.target.value)} />
      </label>

      <label className="full">ORGANIZZAZIONE E SVOLGIMENTO
        <textarea value={form.description} onChange={event => set('description', event.target.value)} />
      </label>

      <label className="full">VALUTAZIONE
        <div className="stars">
          {[1,2,3,4,5].map(number =>
            <button type="button" className={number <= form.rating ? 'active' : ''} onClick={() => set('rating', number)} key={number}>★</button>
          )}
        </div>
        <small className="protected-note">LA MODIFICA DELLA VALUTAZIONE È PROTETTA DA PASSWORD.</small>
      </label>

      <footer className="modal-actions full">
        <button type="button" className="ghost" onClick={onClose}>ANNULLA</button>
        <button type="submit" disabled={busy}>{busy ? 'SALVATAGGIO…' : 'SALVA ESERCITAZIONE'}</button>
      </footer>
    </form>
  </Modal>
}
