import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, upper } from '../lib/archive'

const TRACKED_TYPES = ['TESSERAMENTO','CERTIFICATO MEDICO']

function daysUntil(dateValue) {
  if (!dateValue) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const expiry = new Date(`${dateValue}T00:00:00`)
  expiry.setHours(0,0,0,0)
  return Math.ceil((expiry - today) / 86400000)
}

function formatDate(value) {
  return value ? value.split('-').reverse().join('/') : '—'
}

export function getSecretaryExpiryNotifications(players, playerDocuments) {
  const rows = []

  players
    .filter(player => player.active !== false)
    .forEach(player => {
      const documents = playerDocuments?.[player.id] || []

      documents
        .filter(document =>
          TRACKED_TYPES.includes(upper(document.documentType))
          && document.expiryDate
        )
        .forEach(document => {
          const days = daysUntil(document.expiryDate)
          if (days === null || days > 30) return

          let status = 'warning'
          let title = 'DOCUMENTO IN SCADENZA'
          let message = `SCADENZA TRA ${days} GIORNI`

          if (days < 0) {
            status = 'expired'
            title = 'DOCUMENTO SCADUTO'
            message = `SCADUTO DA ${Math.abs(days)} GIORNI`
          } else if (days === 0) {
            status = 'today'
            title = 'DOCUMENTO IN SCADENZA OGGI'
            message = 'SCADENZA OGGI'
          } else if (days === 1) {
            message = 'SCADENZA DOMANI'
          }

          rows.push({
            id:`${player.id}-${document.id}`,
            playerId:player.id,
            playerName:`${player.lastName} ${player.firstName}`,
            category:player.category,
            documentType:upper(document.documentType),
            expiryDate:document.expiryDate,
            days,
            status,
            title,
            message,
            document,
          })
        })
    })

  return rows.sort((a,b) => a.days - b.days || a.playerName.localeCompare(b.playerName,'it'))
}

export default function SecretaryExpiryNotifications({ players, playerDocuments, onClose }) {
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [query, setQuery] = useState('')

  const notifications = useMemo(
    () => getSecretaryExpiryNotifications(players, playerDocuments),
    [players, playerDocuments]
  )

  const filtered = useMemo(() => {
    const q = upper(query)
    return notifications.filter(item =>
      (!category || item.category === category)
      && (!type || item.documentType === type)
      && (!q || upper(`${item.playerName} ${item.category} ${item.documentType}`).includes(q))
    )
  }, [notifications, category, type, query])

  const expired = notifications.filter(item => item.status === 'expired').length
  const today = notifications.filter(item => item.status === 'today').length
  const warning = notifications.filter(item => item.status === 'warning').length

  return <Modal title="NOTIFICHE SCADENZE" onClose={onClose} wide>
    <div className="secretary-expiry-center">
      <header>
        <div>
          <small>CONTROLLO DOCUMENTALE · AVVISO 30 GIORNI PRIMA</small>
          <h2>SCADENZE TESSERATI</h2>
          <p>SOLO TESSERAMENTI E CERTIFICATI MEDICI.</p>
        </div>
        <div className="secretary-expiry-summary">
          <span className="expired"><b>{expired}</b>SCADUTI</span>
          <span className="today"><b>{today}</b>OGGI</span>
          <span className="warning"><b>{warning}</b>IN SCADENZA</span>
        </div>
      </header>

      <section className="secretary-expiry-filters">
        <input
          placeholder="CERCA TESSERATO…"
          value={query}
          onChange={event=>setQuery(event.target.value)}
        />
        <select value={category} onChange={event=>setCategory(event.target.value)}>
          <option value="">TUTTE LE CATEGORIE</option>
          {CATEGORIES.map(value=><option key={value}>{value}</option>)}
        </select>
        <select value={type} onChange={event=>setType(event.target.value)}>
          <option value="">TUTTI I DOCUMENTI</option>
          {TRACKED_TYPES.map(value=><option key={value}>{value}</option>)}
        </select>
        <button type="button" onClick={()=>{setQuery('');setCategory('');setType('')}}>AZZERA</button>
      </section>

      <section className="secretary-expiry-list">
        {!filtered.length &&
          <div className="app-empty">
            <b>NESSUNA SCADENZA DA SEGNALARE</b>
            <span>NON CI SONO TESSERAMENTI O CERTIFICATI MEDICI IN SCADENZA NEI PROSSIMI 30 GIORNI.</span>
          </div>
        }

        {filtered.map(item=><article key={item.id} className={item.status}>
          <div className="secretary-expiry-icon">
            {item.status === 'expired' ? '!' : item.status === 'today' ? 'O' : '30'}
          </div>

          <div className="secretary-expiry-main">
            <header>
              <div>
                <b>{item.title}</b>
                <span>{item.documentType}</span>
              </div>
              <time>{formatDate(item.expiryDate)}</time>
            </header>

            <h3>{item.playerName}</h3>
            <p>{item.category}</p>

            <footer>
              <strong>{item.message}</strong>
              <span>CARICATO IL {item.document.uploadedAt ? new Date(item.document.uploadedAt).toLocaleDateString('it-IT') : '—'}</span>
              {item.document.url &&
                <a href={item.document.url} target="_blank" rel="noreferrer">APRI DOCUMENTO</a>
              }
            </footer>
          </div>
        </article>)}
      </section>

      <footer className="secretary-expiry-footer">
        <span>{notifications.length} SCADENZE TOTALI DA GESTIRE</span>
        <span>AVVISO AUTOMATICO: 30 GIORNI PRIMA</span>
      </footer>
    </div>
  </Modal>
}
