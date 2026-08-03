import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { upper } from '../lib/archive'

const TYPE_LABELS = {
  session: 'SESSIONE',
  exercise: 'ESERCITAZIONE',
  match: 'PARTITA',
  document: 'DOCUMENTO',
  backup: 'BACKUP',
  user: 'UTENTE',
  system: 'SISTEMA',
}

const TYPE_ICONS = {
  session: 'S',
  exercise: 'E',
  match: 'P',
  document: 'D',
  backup: 'B',
  user: 'U',
  system: '!',
}

export default function NotificationCenter({
  profile,
  notifications,
  readIds,
  loading,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  onNavigate,
  onClose,
}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)

  const filtered = useMemo(() => {
    const text = upper(query)
    return notifications.filter(item => {
      const unread = !readIds.has(item.id)
      return (!text || upper([
          item.title,
          item.message,
          item.actor_name,
          item.category,
          item.notification_type,
        ].join(' ')).includes(text))
        && (!type || item.notification_type === type)
        && (!onlyUnread || unread)
    })
  }, [notifications, readIds, query, type, onlyUnread])

  const unreadCount = notifications.filter(item => !readIds.has(item.id)).length

  async function openNotification(item) {
    if (!readIds.has(item.id)) await onMarkRead(item.id)
    if (onNavigate) onNavigate(item)
  }

  function destinationLabel(item) {
    if (item.notification_type === 'session' || item.object_type === 'SESSIONE') return 'VAI ALLA SESSIONE'
    const section = String(item.metadata?.type || '').toLowerCase()
    if (section === 'meetings') return 'APRI RIUNIONI TECNICHE'
    if (section === 'teaching') return 'APRI MATERIALE DIDATTICO'
    if (item.notification_type === 'document') return 'APRI DOCUMENTI'
    return 'APRI'
  }

  function resetFilters() {
    setQuery('')
    setType('')
    setOnlyUnread(false)
  }

  return <Modal title="CENTRO NOTIFICHE" onClose={onClose} wide>
    <div className="notification-center">
      <header className="notification-heading">
        <div>
          <small>ATTIVITÀ CONDIVISA · STAGIONE 2026/27</small>
          <h2>{unreadCount ? `${unreadCount} NOTIFICHE DA LEGGERE` : 'TUTTO AGGIORNATO'}</h2>
          <p>LE NOTIFICHE SONO PERSONALIZZATE IN BASE AL TUO RUOLO E ALLE CATEGORIE ASSEGNATE.</p>
        </div>
        <div>
          <button type="button" className="soft" onClick={onRefresh}>AGGIORNA</button>
          <button type="button" onClick={onMarkAllRead} disabled={!unreadCount}>SEGNA TUTTE LETTE</button>
        </div>
      </header>

      <section className="notification-filters">
        <input
          placeholder="CERCA NELLE NOTIFICHE…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <select value={type} onChange={event => setType(event.target.value)}>
          <option value="">TUTTI I TIPI</option>
          {Object.entries(TYPE_LABELS).map(([value,label]) =>
            <option value={value} key={value}>{label}</option>
          )}
        </select>
        <label className="notification-check">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={event => setOnlyUnread(event.target.checked)}
          />
          SOLO DA LEGGERE
        </label>
        <button type="button" className="soft" onClick={resetFilters}>AZZERA</button>
      </section>

      <section className="notification-list">
        {loading && <div className="app-empty"><b>CARICAMENTO NOTIFICHE…</b></div>}

        {!loading && !filtered.length &&
          <div className="app-empty">
            <b>NESSUNA NOTIFICA TROVATA</b>
            <span>NON CI SONO NOVITÀ CHE CORRISPONDONO AI FILTRI.</span>
          </div>
        }

        {!loading && filtered.map(item => {
          const unread = !readIds.has(item.id)
          return <article
            key={item.id}
            className={unread ? 'unread' : ''}
            onClick={() => openNotification(item)}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openNotification(item)
              }
            }}
          >
            <div className={`notification-icon type-${item.notification_type || 'system'}`}>
              {TYPE_ICONS[item.notification_type] || '!'}
            </div>

            <div className="notification-content">
              <header>
                <div>
                  <b>{item.title || 'NUOVA ATTIVITÀ'}</b>
                  {unread && <span className="new-badge">NUOVA</span>}
                </div>
                <time>{new Date(item.created_at).toLocaleString('it-IT')}</time>
              </header>

              <p>{item.message || '—'}</p>

              <footer>
                <span>{item.actor_name || item.actor_email || 'SISTEMA'}</span>
                {item.category && <span>{item.category}</span>}
                <span>{TYPE_LABELS[item.notification_type] || 'SISTEMA'}</span>
                {item.priority === 'high' && <span className="priority">IMPORTANTE</span>}
              </footer>
            </div>

            <button
              type="button"
              className="notification-open-button"
              onClick={event => {
                event.stopPropagation()
                openNotification(item)
              }}
            >
              {destinationLabel(item)}
            </button>
          </article>
        })}
      </section>

      <footer className="notification-footer">
        <span>ACCESSO: {upper(profile?.role || '')}</span>
        <span>{notifications.length} NOTIFICHE VISIBILI</span>
      </footer>
    </div>
  </Modal>
}
