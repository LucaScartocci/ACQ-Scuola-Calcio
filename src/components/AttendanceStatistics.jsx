import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CATEGORIES, upper } from '../lib/archive'

export default function AttendanceStatistics({ archive, visibleCategories, onClose }) {
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('presence')

  const rows = useMemo(() => {
    const categories = category ? [category] : visibleCategories
    const sessions = archive.sessions.filter(session => categories.includes(session.category))
    const players = archive.players.filter(player => categories.includes(player.category) && player.active !== false)

    return players.map(player => {
      const playerSessions = sessions.filter(session => session.category === player.category)
      const attended = playerSessions.filter(session =>
        (archive.attendanceBySession[session.id]?.presentIds || []).includes(player.id)
      )
      const recordedSessions = playerSessions.filter(session => archive.attendanceBySession[session.id])
      const percentage = recordedSessions.length ? Math.round(attended.length / recordedSessions.length * 100) : 0
      const minutes = attended.reduce((sum,session)=>sum+Number(session.duration||0),0)
      const last = [...attended].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]

      return {
        ...player,
        attended:attended.length,
        recorded:recordedSessions.length,
        percentage,
        minutes,
        lastDate:last?.date || '',
      }
    }).filter(row => !query || upper(`${row.firstName} ${row.lastName}`).includes(upper(query)))
      .sort((a,b) => {
        if (sort === 'name') return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'it')
        if (sort === 'percentage') return b.percentage-a.percentage || b.attended-a.attended
        if (sort === 'minutes') return b.minutes-a.minutes
        return b.attended-a.attended || b.percentage-a.percentage
      })
  }, [archive, visibleCategories, category, query, sort])

  const totalRecorded = Object.values(archive.attendanceBySession || {}).length
  const leader = rows[0]

  function exportCsv() {
    const data = [
      ['COGNOME','NOME','CATEGORIA','PRESENZE','SESSIONI REGISTRATE','PERCENTUALE','MINUTI','ULTIMA PRESENZA'],
      ...rows.map(row=>[row.lastName,row.firstName,row.category,row.attended,row.recorded,`${row.percentage}%`,row.minutes,row.lastDate])
    ]
    const csv='\ufeff'+data.map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'})
    const link=document.createElement('a')
    link.href=URL.createObjectURL(blob)
    link.download=`ACQ_PRESENZE_${category || 'TUTTE'}_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <Modal title="STATISTICHE INDIVIDUALI PRESENZE" onClose={onClose} wide>
    <div className="attendance-stats">
      <header className="attendance-stats-heading">
        <div><small>MONITORAGGIO TESSERATI · STAGIONE 2026/27</small><h2>PRESENZE ALLENAMENTI</h2><p>CLASSIFICA INDIVIDUALE, PERCENTUALI E MINUTI DI ATTIVITÀ.</p></div>
        <button type="button" onClick={exportCsv}>ESPORTA CSV</button>
      </header>

      <section className="attendance-kpis">
        <article><small>TESSERATI VISIBILI</small><b>{rows.length}</b></article>
        <article><small>SESSIONI CON PRESENZE</small><b>{totalRecorded}</b></article>
        <article><small>PIÙ PRESENTE</small><b className="kpi-name">{leader ? `${leader.lastName} ${leader.firstName}` : '—'}</b></article>
        <article><small>PRESENZE LEADER</small><b>{leader?.attended || 0}</b></article>
      </section>

      <section className="attendance-stats-filters">
        <input placeholder="CERCA GIOCATORE…" value={query} onChange={e=>setQuery(e.target.value)}/>
        <select value={category} onChange={e=>setCategory(e.target.value)}><option value="">TUTTE LE CATEGORIE</option>{visibleCategories.map(v=><option key={v}>{v}</option>)}</select>
        <select value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="presence">PIÙ PRESENZE</option>
          <option value="percentage">PERCENTUALE PIÙ ALTA</option>
          <option value="minutes">PIÙ MINUTI</option>
          <option value="name">A-Z</option>
        </select>
      </section>

      <section className="attendance-ranking">
        {!rows.length && <div className="app-empty"><b>NESSUN DATO DISPONIBILE</b><span>INSERISCI I TESSERATI E REGISTRA LE PRIME PRESENZE.</span></div>}
        {rows.map((row,index)=><article key={row.id}>
          <strong>{String(index+1).padStart(2,'0')}</strong>
          <div className="attendance-player-name"><b>{row.lastName} {row.firstName}</b><span>{row.category}{row.shirtNumber!==''?` · N° ${row.shirtNumber}`:''}</span></div>
          <div className="attendance-progress"><div><i style={{width:`${row.percentage}%`}}/></div><small>{row.percentage}%</small></div>
          <div><b>{row.attended}</b><small>PRESENZE</small></div>
          <div><b>{row.minutes}'</b><small>MINUTI</small></div>
          <time>{row.lastDate ? row.lastDate.split('-').reverse().join('/') : '—'}</time>
        </article>)}
      </section>
    </div>
  </Modal>
}
