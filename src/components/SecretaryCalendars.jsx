import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES } from '../lib/archive'

export default function SecretaryCalendars({ matchesByCategory, onClose }) {
  const [category,setCategory]=useState('')
  const rows=useMemo(()=>CATEGORIES.flatMap(cat=>(matchesByCategory[cat]||[])
    .filter(match=>match.opponent||match.date||match.time||match.location)
    .map(match=>({...match,category:cat})))
    .filter(match=>!category||match.category===category)
    .sort((a,b)=>`${a.date||'9999-12-31'}T${a.time||'23:59'}`.localeCompare(`${b.date||'9999-12-31'}T${b.time||'23:59'}`)),
  [matchesByCategory,category])

  return <Modal title="CALENDARI PARTITE" onClose={onClose} wide>
    <div className="secretary-calendars">
      <header><div><small>CALENDARI AGGIORNATI DAGLI ALLENATORI</small><h2>PARTITE DI TUTTE LE CATEGORIE</h2></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">TUTTE LE CATEGORIE</option>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></header>
      <section>
        {!rows.length&&<div className="app-empty"><b>NESSUNA PARTITA INSERITA</b></div>}
        {rows.map(match=><article key={`${match.category}-${match.id}`}>
          <div className="secretary-match-date"><b>{match.date?match.date.split('-').reverse().join('/'):'—'}</b><span>{match.time||'ORARIO N/D'}</span></div>
          <div><small>{match.category}</small><h3>ACQUACETOSA VS {match.opponent||'AVVERSARIO DA DEFINIRE'}</h3><p>{match.location||'LUOGO DA DEFINIRE'}</p></div>
          <div className="secretary-callup-info"><b>{Array.isArray(match.callupPlayerIds)&&match.callupPlayerIds.length ? match.callupPlayerIds.length : String(match.callupPlayers||'').split(/\n|,/).filter(Boolean).length}</b><span>CONVOCATI</span></div>
        </article>)}
      </section>
    </div>
  </Modal>
}
