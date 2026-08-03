import { useMemo } from 'react'
import Modal from './Modal'
import { CATEGORIES, PHASES, upper } from '../lib/archive'

const percent = (value, total) => total ? Math.round((value / total) * 100) : 0
const dateValue = value => value ? new Date(`${value}T12:00:00`).getTime() : 0

export default function StatisticsDashboard({ archive, visibleCategories, profile, onClose }) {
  const data = useMemo(() => {
    const sessions = archive.sessions.filter(item => visibleCategories.includes(item.category))
    const sessionIds = new Set(sessions.map(item => item.id))
    const exercises = archive.exercises.filter(item => sessionIds.has(item.sessionId))
    const matches = visibleCategories.flatMap(category =>
      (archive.matchesByCategory[category] || []).map(match => ({ ...match, category }))
    )

    const totalMinutes = sessions.reduce((sum,item) => sum + Number(item.duration || 0), 0)
    const exerciseMinutes = exercises.reduce((sum,item) => sum + Number(item.duration || 0), 0)
    const rated = exercises.filter(item => Number(item.rating || 0) > 0)
    const averageRating = rated.length
      ? rated.reduce((sum,item) => sum + Number(item.rating || 0), 0) / rated.length
      : 0

    const categories = visibleCategories.map(category => ({
      name: category,
      sessions: sessions.filter(item => item.category === category).length,
      exercises: exercises.filter(item => item.category === category).length,
    }))

    const coachesMap = new Map()
    sessions.forEach(session => {
      const current = coachesMap.get(session.coach) || { name: session.coach, sessions:0, exercises:0, minutes:0 }
      current.sessions += 1
      current.minutes += Number(session.duration || 0)
      current.exercises += exercises.filter(item => item.sessionId === session.id).length
      coachesMap.set(session.coach,current)
    })
    const coaches = [...coachesMap.values()].sort((a,b) => b.sessions - a.sessions || b.exercises - a.exercises)

    const phases = PHASES.map(name => ({
      name,
      value: exercises.filter(item => item.phase === name).length,
    })).filter(item => item.value > 0).sort((a,b) => b.value - a.value)

    const ratings = [1,2,3,4,5].map(value => ({
      value,
      count: exercises.filter(item => Number(item.rating || 0) === value).length,
    }))

    const today = new Date()
    today.setHours(0,0,0,0)
    const upcomingMatches = matches
      .filter(item => dateValue(item.date) >= today.getTime())
      .sort((a,b) => dateValue(a.date) - dateValue(b.date))
      .slice(0,6)

    const recentSessions = [...sessions]
      .sort((a,b) => dateValue(b.date) - dateValue(a.date))
      .slice(0,6)

    const topExercises = [...exercises]
      .sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0,6)

    return {
      sessions,
      exercises,
      matches,
      totalMinutes,
      exerciseMinutes,
      averageRating,
      categories,
      coaches,
      phases,
      ratings,
      upcomingMatches,
      recentSessions,
      topExercises,
    }
  }, [archive, visibleCategories])

  const maxCategory = Math.max(1, ...data.categories.map(item => Math.max(item.sessions,item.exercises)))
  const maxCoach = Math.max(1, ...data.coaches.map(item => item.sessions))
  const maxPhase = Math.max(1, ...data.phases.map(item => item.value))
  const totalRated = data.ratings.reduce((sum,item) => sum + item.count, 0)

  function exportCsv() {
    const rows = [
      ['METRICA','VALORE'],
      ['SESSIONI',data.sessions.length],
      ['ESERCITAZIONI',data.exercises.length],
      ['MINUTI SESSIONI',data.totalMinutes],
      ['MINUTI ESERCITAZIONI',data.exerciseMinutes],
      ['VALUTAZIONE MEDIA',data.averageRating.toFixed(2)],
      [],
      ['CATEGORIA','SESSIONI','ESERCITAZIONI'],
      ...data.categories.map(item => [item.name,item.sessions,item.exercises]),
      [],
      ['ALLENATORE','SESSIONI','ESERCITAZIONI','MINUTI'],
      ...data.coaches.map(item => [item.name,item.sessions,item.exercises,item.minutes]),
      [],
      ['FASE','ESERCITAZIONI'],
      ...data.phases.map(item => [item.name,item.value]),
    ]
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ACQ_STATISTICHE_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <Modal title="DASHBOARD STATISTICHE" onClose={onClose} wide>
    <div className="statistics-dashboard">
      <header className="statistics-heading">
        <div>
          <small>ANALISI ARCHIVIO · STAGIONE 2026/27</small>
          <h2>{upper([profile?.first_name,profile?.last_name].filter(Boolean).join(' ') || 'ACQUACETOSA')}</h2>
          <p>DATI CALCOLATI SULLE CATEGORIE VISIBILI DAL TUO PROFILO.</p>
        </div>
        <button type="button" onClick={exportCsv}>ESPORTA CSV</button>
      </header>

      <section className="statistics-kpis">
        <Kpi label="SESSIONI" value={data.sessions.length} note={`${data.totalMinutes}' TOTALI`}/>
        <Kpi label="ESERCITAZIONI" value={data.exercises.length} note={`${data.exerciseMinutes}' TOTALI`}/>
        <Kpi label="MEDIA PER SESSIONE" value={data.sessions.length ? (data.exercises.length/data.sessions.length).toFixed(1) : '0.0'} note="ESERCITAZIONI"/>
        <Kpi label="VALUTAZIONE MEDIA" value={data.averageRating ? data.averageRating.toFixed(1) : '—'} note={`${totalRated} VALUTATE`}/>
        <Kpi label="ALLENATORI ATTIVI" value={data.coaches.length} note="CON SESSIONI"/>
        <Kpi label="PARTITE INSERITE" value={data.matches.filter(item => item.opponent || item.date).length} note={`${data.upcomingMatches.length} PROSSIME`}/>
      </section>

      <section className="statistics-grid">
        <Panel title="ATTIVITÀ PER CATEGORIA" subtitle="SESSIONI ED ESERCITAZIONI">
          <div className="double-bars">
            {data.categories.map(item => <article key={item.name}>
              <header><b>{item.name}</b><span>{item.sessions}SS · {item.exercises}ES</span></header>
              <div><i style={{width:`${percent(item.sessions,maxCategory)}%`}}/><em style={{width:`${percent(item.exercises,maxCategory)}%`}}/></div>
            </article>)}
          </div>
          <div className="chart-legend"><span><i/> SESSIONI</span><span><em/> ESERCITAZIONI</span></div>
        </Panel>

        <Panel title="UTILIZZO PER ALLENATORE" subtitle="NUMERO DI SESSIONI">
          <div className="single-bars">
            {data.coaches.length ? data.coaches.slice(0,10).map(item => <article key={item.name}>
              <header><b>{item.name}</b><span>{item.sessions}SS · {item.exercises}ES</span></header>
              <div><i style={{width:`${percent(item.sessions,maxCoach)}%`}}/></div>
            </article>) : <Empty text="NESSUN ALLENATORE CON SESSIONI"/>}
          </div>
        </Panel>

        <Panel title="FASI PIÙ UTILIZZATE" subtitle="DISTRIBUZIONE ESERCITAZIONI">
          <div className="single-bars phase-bars">
            {data.phases.length ? data.phases.map(item => <article key={item.name}>
              <header><b>{item.name}</b><span>{item.value}</span></header>
              <div><i style={{width:`${percent(item.value,maxPhase)}%`}}/></div>
            </article>) : <Empty text="NESSUNA FASE DISPONIBILE"/>}
          </div>
        </Panel>

        <Panel title="DISTRIBUZIONE VALUTAZIONI" subtitle="ESERCITAZIONI VALUTATE">
          <div className="rating-distribution">
            {data.ratings.map(item => <article key={item.value}>
              <b>{'★'.repeat(item.value)}</b>
              <div><i style={{height:`${Math.max(4,percent(item.count,Math.max(1,...data.ratings.map(row=>row.count))))}%`}}/></div>
              <span>{item.count}</span>
            </article>)}
          </div>
        </Panel>

        <Panel title="SESSIONI RECENTI" subtitle="ULTIME SEDUTE INSERITE">
          <div className="statistics-list">
            {data.recentSessions.length ? data.recentSessions.map(item => <article key={item.id}>
              <div><b>{item.coach}</b><span>{item.category} · {item.objective || 'NESSUN OBIETTIVO'}</span></div>
              <time>{item.date ? item.date.split('-').reverse().join('/') : '—'}</time>
            </article>) : <Empty text="NESSUNA SESSIONE DISPONIBILE"/>}
          </div>
        </Panel>

        <Panel title="PROSSIME PARTITE" subtitle="CALENDARIO IMMINENTE">
          <div className="statistics-list">
            {data.upcomingMatches.length ? data.upcomingMatches.map(item => <article key={item.id}>
              <div><b>{item.category} · {item.opponent || 'AVVERSARIO DA DEFINIRE'}</b><span>{item.location || 'LUOGO DA DEFINIRE'} · {item.time || 'ORARIO'}</span></div>
              <time>{item.date ? item.date.split('-').reverse().join('/') : '—'}</time>
            </article>) : <Empty text="NESSUNA PARTITA PROGRAMMATA"/>}
          </div>
        </Panel>

        <Panel title="ESERCITAZIONI IN EVIDENZA" subtitle="VALUTAZIONE E RECENZA">
          <div className="top-exercises">
            {data.topExercises.length ? data.topExercises.map((item,index) => <article key={item.id}>
              <strong>{String(index+1).padStart(2,'0')}</strong>
              <div><b>{item.title}</b><span>{item.category} · {item.phase}</span></div>
              <em>{item.rating ? `${'★'.repeat(item.rating)}` : 'N/V'}</em>
            </article>) : <Empty text="NESSUNA ESERCITAZIONE DISPONIBILE"/>}
          </div>
        </Panel>

        <Panel title="INDICATORI ARCHIVIO" subtitle="COPERTURA E COMPLETEZZA">
          <div className="quality-metrics">
            <Quality label="SESSIONI CON OBIETTIVO" value={data.sessions.filter(item=>item.objective).length} total={data.sessions.length}/>
            <Quality label="ESERCITAZIONI CON IMMAGINE" value={data.exercises.filter(item=>item.image).length} total={data.exercises.length}/>
            <Quality label="ESERCITAZIONI VALUTATE" value={data.exercises.filter(item=>item.rating).length} total={data.exercises.length}/>
            <Quality label="PARTITE CON AVVERSARIO" value={data.matches.filter(item=>item.opponent).length} total={data.matches.length}/>
          </div>
        </Panel>
      </section>
    </div>
  </Modal>
}

function Kpi({label,value,note}) {
  return <article><small>{label}</small><b>{value}</b><span>{note}</span></article>
}

function Panel({title,subtitle,children}) {
  return <article className="statistics-panel"><header><div><h3>{title}</h3><small>{subtitle}</small></div></header>{children}</article>
}

function Quality({label,value,total}) {
  const score = percent(value,total)
  return <article><header><b>{label}</b><span>{score}%</span></header><div><i style={{width:`${score}%`}}/></div><small>{value} SU {total}</small></article>
}

function Empty({text}) {
  return <div className="statistics-empty">{text}</div>
}
