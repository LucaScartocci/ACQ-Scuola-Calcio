import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { CATEGORIES, COACHES, upper } from '../lib/archive'

const ROLES = [
  ['director','DIRETTORE TECNICO'],
  ['coordinator','COORDINATORE'],
  ['coach','ALLENATORE'],
  ['collaborator','COLLABORATORE'],
]

export default function UserManagement({ currentProfile, onClose, onChanged }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')

  async function loadProfiles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
    if (error) {
      console.error(error)
      window.alert('IMPOSSIBILE CARICARE GLI UTENTI: ' + error.message)
    } else {
      setProfiles(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  const currentId = currentProfile?.id

  function patchLocal(id, patch) {
    setProfiles(items => items.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function toggleCategory(id, category) {
    const profile = profiles.find(item => item.id === id)
    if (!profile) return
    const categories = Array.isArray(profile.categories) ? profile.categories : []
    const next = categories.includes(category)
      ? categories.filter(item => item !== category)
      : [...categories, category]
    patchLocal(id, { categories: next })
  }

  async function saveProfile(profile) {
    if (profile.id === currentId && !profile.active) {
      window.alert('NON PUOI DISATTIVARE IL TUO STESSO ACCOUNT.')
      await loadProfiles()
      return
    }
    setSavingId(profile.id)
    const payload = {
      first_name: upper(profile.first_name),
      last_name: upper(profile.last_name),
      role: profile.role,
      categories: Array.isArray(profile.categories) ? profile.categories : [],
      coach_name: upper(profile.coach_name),
      active: Boolean(profile.active),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('user_profiles').update(payload).eq('id', profile.id)
    setSavingId('')
    if (error) {
      console.error(error)
      window.alert('ERRORE SALVATAGGIO UTENTE: ' + error.message)
      return
    }
    onChanged?.()
    window.alert('PROFILO UTENTE AGGIORNATO.')
  }

  return <Modal title="GESTIONE UTENTI E RUOLI" onClose={onClose} wide>
    <div className="users-manager">
      <div className="users-info">
        <b>COME AGGIUNGERE UN NUOVO UTENTE</b>
        <span>CREALO PRIMA IN SUPABASE → AUTHENTICATION → USERS → ADD USER. POI TORNA QUI E ASSEGNA RUOLO E CATEGORIE.</span>
      </div>

      {loading ? <div className="app-empty"><b>CARICAMENTO UTENTI…</b></div> :
        <div className="users-list">
          {profiles.map(profile => <article className="user-card" key={profile.id}>
            <header>
              <div className="user-avatar">{(profile.first_name?.[0] || profile.email?.[0] || 'U')}{profile.last_name?.[0] || ''}</div>
              <div>
                <b>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'UTENTE DA CONFIGURARE'}</b>
                <span>{profile.email}</span>
              </div>
              <label className="user-active">
                <input
                  type="checkbox"
                  checked={Boolean(profile.active)}
                  disabled={profile.id === currentId}
                  onChange={event => patchLocal(profile.id, { active: event.target.checked })}
                />
                ATTIVO
              </label>
            </header>

            <div className="user-fields">
              <label>NOME
                <input value={profile.first_name || ''} onChange={event => patchLocal(profile.id,{first_name:event.target.value})}/>
              </label>
              <label>COGNOME
                <input value={profile.last_name || ''} onChange={event => patchLocal(profile.id,{last_name:event.target.value})}/>
              </label>
              <label>RUOLO
                <select value={profile.role || 'collaborator'} onChange={event => patchLocal(profile.id,{role:event.target.value})}>
                  {ROLES.map(([value,label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label>ALLENATORE ASSOCIATO
                <select value={profile.coach_name || ''} onChange={event => patchLocal(profile.id,{coach_name:event.target.value})}>
                  <option value="">NESSUNO</option>
                  {COACHES.map(name => <option key={name}>{name}</option>)}
                </select>
              </label>
            </div>

            <div className="user-categories">
              <b>CATEGORIE ASSEGNATE</b>
              <div>
                {CATEGORIES.map(category => <button
                  type="button"
                  key={category}
                  className={(profile.categories || []).includes(category) ? 'active' : ''}
                  onClick={() => toggleCategory(profile.id, category)}
                >{category}</button>)}
              </div>
            </div>

            <footer>
              <button type="button" onClick={() => saveProfile(profile)} disabled={savingId === profile.id}>
                {savingId === profile.id ? 'SALVATAGGIO…' : 'SALVA PROFILO'}
              </button>
            </footer>
          </article>)}
        </div>
      }
    </div>
  </Modal>
}
