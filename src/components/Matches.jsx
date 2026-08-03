import { useState } from 'react'
import Modal from './Modal'
import { upper } from '../lib/archive'

const displayDate = value => value ? value.split('-').reverse().join('/') : ''

export default function Matches({ category, matches, onChange }) {
  const [callup, setCallup] = useState(null)
  const sorted = [...matches].sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999') || a.slot-b.slot)
  const patch = (id, changes) => onChange(matches.map(m => m.id === id ? { ...m, ...changes } : m))
  function logo(id, file) {
    if (!file) return
    const reader = new FileReader(); reader.onload = () => patch(id, { logo: reader.result }); reader.readAsDataURL(file)
  }
  return <section>
    <div className="section-title"><div><h2>PARTITE · {category}</h2><p>30 GARE STAGIONALI, DALLA PIÙ VICINA ALLA PIÙ LONTANA.</p></div><b>30 PARTITE</b></div>
    <div className="match-list">{sorted.map((m,i) => <article className="match-row" key={m.id}>
      <div className="match-logo">{m.logo ? <><img src={m.logo}/><button onClick={() => patch(m.id,{logo:''})}>×</button></> : <label>⚽<input hidden type="file" accept="image/*" onChange={e => logo(m.id,e.target.files[0])}/></label>}<small>PARTITA {String(i+1).padStart(2,'0')}</small></div>
      <input placeholder="NOME SQUADRA" value={m.opponent} onChange={e => patch(m.id,{opponent:upper(e.target.value)})}/>
      <input type="date" value={m.date} onChange={e => patch(m.id,{date:e.target.value})}/>
      <input type="time" value={m.time} onChange={e => patch(m.id,{time:e.target.value})}/>
      <input placeholder="LUOGO / CAMPO" value={m.location} onChange={e => patch(m.id,{location:upper(e.target.value)})}/>
      <button onClick={() => setCallup(m)}>CONVOCAZIONE</button>
    </article>)}</div>
    {callup && <Callup category={category} match={callup} onPatch={changes => { patch(callup.id, changes); setCallup(v => ({...v,...changes})) }} onClose={() => setCallup(null)} />}
  </section>
}

function Callup({ category, match, onPatch, onClose }) {
  const players = String(match.callupPlayers || '').split(/\n|,/).map(v => upper(v.trim())).filter(Boolean)
  function download() {
    const c=document.createElement('canvas'); c.width=1080; c.height=1350; const x=c.getContext('2d')
    const g=x.createLinearGradient(0,0,1080,1350); g.addColorStop(0,'#071b34'); g.addColorStop(1,'#0f5cc0'); x.fillStyle=g; x.fillRect(0,0,1080,1350)
    x.fillStyle='#fff'; x.font='700 28px Arial'; x.fillText('ASD ACQUACETOSA CENTRO CALCIO',55,65)
    x.textAlign='center'; x.font='900 24px Arial'; x.fillText('STAGIONE 2026/27',900,65); x.textAlign='left'
    x.font='700 24px Arial'; x.fillStyle='#b9d4ff'; x.fillText('CONVOCAZIONE UFFICIALE',55,130)
    x.fillStyle='#fff'; x.font='900 62px Arial'; x.fillText('CAMPIONATO',55,205); x.fillStyle='#a8c9ff'; x.font='900 74px Arial'; x.fillText(category,55,285)
    x.fillStyle='#fff'; x.fillRect(55,330,970,260); x.fillStyle='#0a2c62'; x.textAlign='center'; x.font='900 36px Arial'; x.fillText(`ACQUACETOSA  VS  ${match.opponent||'AVVERSARIO'}`,540,455); x.textAlign='left'
    const meta=[displayDate(match.date)||'DATA',match.time||'ORA',match.location||'LUOGO',match.coach||'ALLENATORE']; meta.forEach((v,i)=>{x.fillStyle='#092856';x.fillRect(55+i*242,620,230,130);x.fillStyle='#fff';x.font='700 19px Arial';x.fillText(v,70+i*242,680)})
    x.fillStyle='#fff'; x.fillRect(55,790,970,480); x.fillStyle='#0a2c62'; x.font='900 34px Arial'; x.fillText('LISTA CONVOCATI',85,850); x.font='700 18px Arial'; x.fillText(`${players.length} CALCIATORI`,825,850)
    players.forEach((p,i)=>{const col=i%3,row=Math.floor(i/3),cx=85+col*300,cy=900+row*65;x.fillStyle='#edf3fb';x.fillRect(cx,cy,280,50);x.fillStyle='#0f4b96';x.beginPath();x.arc(cx+26,cy+25,17,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.font='700 13px Arial';x.fillText(String(i+1).padStart(2,'0'),cx+18,cy+30);x.fillStyle='#10233f';x.font='900 17px Arial';x.fillText(p,cx+55,cy+31)})
    const a=document.createElement('a');a.download=`CONVOCAZIONE_${category}_${match.date||'DATA'}.png`;a.href=c.toDataURL('image/png');a.click()
  }
  return <Modal title={`CONVOCAZIONE · ${category}`} onClose={onClose} wide><div className="form-grid">
    <label>AVVERSARIO<input value={match.opponent} readOnly/></label><label>DATA<input value={displayDate(match.date)} readOnly/></label>
    <label>ORARIO<input value={match.time} readOnly/></label><label>ALLENATORE<input value={match.coach||''} onChange={e=>onPatch({coach:upper(e.target.value)})}/></label>
    <label className="full">LUOGO<input value={match.location||''} onChange={e=>onPatch({location:upper(e.target.value)})}/></label>
    <label className="full">CONVOCATI, UNO PER RIGA<textarea rows="10" value={match.callupPlayers||''} onChange={e=>onPatch({callupPlayers:upper(e.target.value)})}/></label>
    <footer className="modal-actions full"><button className="ghost" onClick={onClose}>CHIUDI</button><button onClick={download}>SCARICA PNG</button></footer>
  </div></Modal>
}
