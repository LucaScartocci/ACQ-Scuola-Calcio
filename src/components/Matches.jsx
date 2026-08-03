import { useMemo, useState } from 'react'
import Modal from './Modal'
import { upper } from '../lib/archive'
import { removeCloudFile, uploadCloudFile } from '../lib/storage'

const displayDate = value => value ? value.split('-').reverse().join('/') : ''
const safeFile = value => upper(value || 'PARTITA').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')

export default function Matches({ category, matches, onChange }) {
  const [callup, setCallup] = useState(null)
  const [busyId, setBusyId] = useState('')
  const sorted = useMemo(() => [...matches].sort((a,b) => {
    const ad = a.date ? `${a.date}T${a.time || '00:00'}` : '9999-12-31T23:59'
    const bd = b.date ? `${b.date}T${b.time || '00:00'}` : '9999-12-31T23:59'
    return ad.localeCompare(bd) || a.slot-b.slot
  }), [matches])

  const patch = (id, changes) => onChange(matches.map(m => m.id === id ? { ...m, ...changes } : m))

  async function uploadLogo(match, file) {
    if (!file) return
    setBusyId(match.id)
    try {
      if (match.logoPath) await removeCloudFile(match.logoPath)
      const uploaded = await uploadCloudFile(file, `match-logos/${safeFile(category)}`)
      patch(match.id, { logo: uploaded.url, logoPath: uploaded.storagePath })
    } catch (error) {
      console.error(error)
      alert('CARICAMENTO LOGO NON RIUSCITO.')
    } finally {
      setBusyId('')
    }
  }

  async function removeLogo(match) {
    if (!confirm('ELIMINARE IL LOGO AVVERSARIO?')) return
    setBusyId(match.id)
    try {
      if (match.logoPath) await removeCloudFile(match.logoPath)
      patch(match.id, { logo: '', logoPath: '' })
    } catch (error) {
      console.error(error)
      alert('ELIMINAZIONE LOGO NON RIUSCITA.')
    } finally {
      setBusyId('')
    }
  }

  function resetMatch(match) {
    if (!confirm('AZZERARE TUTTI I DATI DI QUESTA PARTITA?')) return
    if (match.logoPath) removeCloudFile(match.logoPath).catch(console.error)
    patch(match.id, {
      opponent:'', logo:'', logoPath:'', date:'', time:'', location:'', coach:'',
      callupPlayers:'', meetingTime:'', meetingPlace:'', callupNotes:'', competition:'CAMPIONATO'
    })
  }

  return <section>
    <div className="section-title"><div><h2>PARTITE · {category}</h2><p>30 GARE STAGIONALI, ORDINATE DALLA PIÙ VICINA ALLA PIÙ LONTANA.</p></div><b>{matches.length} PARTITE</b></div>
    <div className="match-list">{sorted.map((m,i) => <article className="match-row" key={m.id}>
      <div className="match-logo">
        {m.logo ? <><img src={m.logo} alt="Logo avversario"/><button disabled={busyId===m.id} onClick={() => removeLogo(m)}>×</button></> : <label title="CARICA LOGO">{busyId===m.id ? '…' : '⚽'}<input hidden type="file" accept="image/*" onChange={e => uploadLogo(m,e.target.files?.[0])}/></label>}
        <small>PARTITA {String(i+1).padStart(2,'0')}</small>
      </div>
      <input aria-label="Avversario" placeholder="NOME SQUADRA" value={m.opponent} onChange={e => patch(m.id,{opponent:upper(e.target.value)})}/>
      <input aria-label="Data" type="date" value={m.date} onChange={e => patch(m.id,{date:e.target.value})}/>
      <input aria-label="Ora" type="time" value={m.time} onChange={e => patch(m.id,{time:e.target.value})}/>
      <input aria-label="Luogo" placeholder="LUOGO / CAMPO" value={m.location} onChange={e => patch(m.id,{location:upper(e.target.value)})}/>
      <div className="match-buttons"><button onClick={() => setCallup(m)}>CONVOCAZIONE</button><button className="soft" onClick={() => resetMatch(m)}>AZZERA</button></div>
    </article>)}</div>
    {callup && <Callup category={category} match={callup} onPatch={changes => { patch(callup.id, changes); setCallup(v => ({...v,...changes})) }} onClose={() => setCallup(null)} />}
  </section>
}

function Callup({ category, match, onPatch, onClose }) {
  const players = String(match.callupPlayers || '').split(/\n|,/).map(v => upper(v.trim())).filter(Boolean)
  const competition = upper(match.competition || 'CAMPIONATO')

  async function loadImage(src) {
    if (!src) return null
    return new Promise(resolve => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = src
    })
  }

  function rounded(ctx,x,y,w,h,r,fill,stroke='') {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r)
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
  }

  function fittedText(ctx,text,maxWidth,startSize,minSize=13,weight=900) {
    let size=startSize
    do { ctx.font=`${weight} ${size}px Arial`; if(ctx.measureText(text).width<=maxWidth) break; size-=1 } while(size>minSize)
    return size
  }

  async function download() {
    if (!players.length) { alert('INSERISCI ALMENO UN CONVOCATO.'); return }
    const c=document.createElement('canvas'); c.width=1080; c.height=1350; const x=c.getContext('2d')
    const homeSrc=document.querySelector('.hero>img')?.src || '/ACQ-Scuola-Calcio/logo-acquacetosa.png'
    const [homeLogo,awayLogo]=await Promise.all([loadImage(homeSrc),loadImage(match.logo)])

    const g=x.createLinearGradient(0,0,1080,1350); g.addColorStop(0,'#061b34'); g.addColorStop(.58,'#16405d'); g.addColorStop(1,'#081b31'); x.fillStyle=g; x.fillRect(0,0,1080,1350)
    x.strokeStyle='rgba(255,255,255,.035)';x.lineWidth=2;for(let p=-500;p<1500;p+=45){x.beginPath();x.moveTo(p,0);x.lineTo(p+650,1350);x.stroke()}

    x.fillStyle='#fff'; x.font='800 27px Arial'; x.fillText('ASD ACQUACETOSA CENTRO CALCIO',54,62)
    rounded(x,760,25,266,60,30,'rgba(6,27,52,.96)','#fff');x.textAlign='center';x.textBaseline='middle';x.font='900 24px Arial';x.fillText('STAGIONE 2026/27',893,55);x.textBaseline='alphabetic';x.textAlign='left'
    x.fillStyle='#c5dcff';x.font='800 24px Arial';x.fillText('CONVOCAZIONE UFFICIALE',54,132)
    x.fillStyle='#fff';x.font='900 62px Arial';x.fillText(competition,54,205)
    x.fillStyle='#a8c9ff'; fittedText(x,category,900,78,44); x.fillText(category,54,285)

    rounded(x,54,330,972,292,28,'#f7f9fc')
    const contain=(img,cx,cy,w,h)=>{if(!img)return;const r=Math.min(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;x.drawImage(img,cx+(w-dw)/2,cy+(h-dh)/2,dw,dh)}
    contain(homeLogo,110,360,220,170);contain(awayLogo,750,360,220,170)
    x.fillStyle='#0b2c63';x.textAlign='center';x.font='900 46px Arial';x.fillText('VS',540,465)
    x.fillStyle='#6e7e99';x.font='700 18px Arial';x.fillText(category,540,510)
    x.fillStyle='#10233f';x.font='900 25px Arial';x.fillText('ACQUACETOSA',220,580);fittedText(x,match.opponent||'AVVERSARIO',260,25,16);x.fillText(match.opponent||'AVVERSARIO',860,580);x.textAlign='left'

    const boxes=[
      ['DATA',displayDate(match.date)||'DA DEFINIRE'],['CALCIO D’INIZIO',match.time?`ORE ${match.time}`:'DA DEFINIRE'],
      ['LUOGO',match.location||'DA DEFINIRE'],['ALLENATORE',match.coach||'DA DEFINIRE']
    ]
    boxes.forEach((b,i)=>{const bx=54+i*243;rounded(x,bx,650,231,135,18,'rgba(6,35,76,.94)','rgba(255,255,255,.16)');x.fillStyle='#b8c7dc';x.font='800 14px Arial';x.fillText(b[0],bx+17,682);x.fillStyle='#fff';fittedText(x,b[1],197,22,14,800);x.fillText(b[1],bx+17,724)})

    rounded(x,54,815,972,470,28,'#f7f9fc');x.fillStyle='#0b2c63';x.font='900 34px Arial';x.fillText('LISTA CONVOCATI',86,875);x.textAlign='right';x.fillStyle='#6d7d98';x.font='800 18px Arial';x.fillText(`${players.length} CALCIATORI`,990,875);x.textAlign='left';x.fillStyle='#0b2c63';x.fillRect(86,895,904,3)
    players.slice(0,18).forEach((p,i)=>{const col=i%3,row=Math.floor(i/3),cx=86+col*300,cy=925+row*61;rounded(x,cx,286,51,14,'#edf3fb','#d5dfec');x.fillStyle='#0f4b96';x.beginPath();x.arc(cx+27,cy+25.5,17,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.font='800 13px Arial';x.textAlign='center';x.fillText(String(i+1).padStart(2,'0'),cx+27,cy+30);x.textAlign='left';x.fillStyle='#10233f';fittedText(x,p,212,17,12);x.fillText(p,cx+57,cy+32)})
    x.fillStyle='#d6e6ff';x.font='800 18px Arial';x.fillText('ACQUACETOSA CENTRO CALCIO',54,1325)
    const a=document.createElement('a');a.download=`CONVOCAZIONE_${safeFile(category)}_${match.date||'DATA'}.png`;a.href=c.toDataURL('image/png');a.click()
  }

  return <Modal title={`CONVOCAZIONE · ${category}`} onClose={onClose} wide><div className="form-grid callup-form">
    <label>COMPETIZIONE<input value={match.competition||'CAMPIONATO'} onChange={e=>onPatch({competition:upper(e.target.value)})}/></label>
    <label>AVVERSARIO<input value={match.opponent} readOnly/></label>
    <label>DATA<input value={displayDate(match.date)} readOnly/></label><label>ORARIO<input value={match.time} readOnly/></label>
    <label>ALLENATORE<input value={match.coach||''} onChange={e=>onPatch({coach:upper(e.target.value)})}/></label>
    <label>LUOGO<input value={match.location||''} onChange={e=>onPatch({location:upper(e.target.value)})}/></label>
    <label>ORARIO RITROVO<input type="time" value={match.meetingTime||''} onChange={e=>onPatch({meetingTime:e.target.value})}/></label>
    <label>LUOGO RITROVO<input value={match.meetingPlace||''} onChange={e=>onPatch({meetingPlace:upper(e.target.value)})}/></label>
    <label className="full">CONVOCATI, UNO PER RIGA<textarea rows="10" value={match.callupPlayers||''} onChange={e=>onPatch({callupPlayers:upper(e.target.value)})}/></label>
    <label className="full">NOTE<textarea rows="3" value={match.callupNotes||''} onChange={e=>onPatch({callupNotes:upper(e.target.value)})}/></label>
    <footer className="modal-actions full"><button className="ghost" onClick={onClose}>CHIUDI</button><button onClick={download}>SCARICA PNG</button></footer>
  </div></Modal>
}
