import { useMemo, useState } from 'react'
import Modal from './Modal'
import { upper } from '../lib/archive'
import { removeCloudFile, uploadCloudFile } from '../lib/storage'

const displayDate = value => value ? value.split('-').reverse().join('/') : ''
const safeFile = value => upper(value || 'PARTITA').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')

export default function Matches({ category, matches, players = [], onChange, readOnly = false }) {
  const [callup, setCallup] = useState(null)
  const [busyId, setBusyId] = useState('')
  const sorted = useMemo(() => [...matches].sort((a,b) => {
    const ad = a.date ? `${a.date}T${a.time || '00:00'}` : '9999-12-31T23:59'
    const bd = b.date ? `${b.date}T${b.time || '00:00'}` : '9999-12-31T23:59'
    return ad.localeCompare(bd) || a.slot-b.slot
  }), [matches])

  const patch = (id, changes) => {
    if (readOnly) return
    onChange(matches.map(match => match.id === id ? { ...match, ...changes } : match))
  }

  async function uploadLogo(match, file) {
    if (readOnly || !file) return
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
    if (readOnly) return
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
    if (readOnly) return
    if (!confirm('AZZERARE TUTTI I DATI DI QUESTA PARTITA?')) return
    if (match.logoPath) removeCloudFile(match.logoPath).catch(console.error)
    patch(match.id, {
      opponent:'', logo:'', logoPath:'', date:'', time:'', location:'', coach:'',
      callupPlayers:'', callupPlayerIds:[], meetingTime:'', meetingPlace:'', callupNotes:'', competition:'CAMPIONATO'
    })
  }

  return <section>
    <div className="section-title">
      <div>
        <h2>PARTITE · {category}</h2>
        <p>30 GARE STAGIONALI, ORDINATE DALLA PIÙ VICINA ALLA PIÙ LONTANA.</p>
      </div>
      <b>{matches.length} PARTITE</b>
    </div>

    <div className="match-list">
      {sorted.map((match,index) => <article className="match-row" key={match.id}>
        <div className="match-logo">
          {match.logo
            ? <>
                <img src={match.logo} alt="Logo avversario"/>
                {!readOnly && <button disabled={busyId===match.id} onClick={() => removeLogo(match)}>×</button>}
              </>
            : <label title={readOnly ? 'NESSUN LOGO' : 'CARICA LOGO'}>
                {busyId===match.id ? '…' : '⚽'}
                {!readOnly && <input hidden type="file" accept="image/*" onChange={event => uploadLogo(match,event.target.files && event.target.files[0])}/>}
              </label>}
          <small>PARTITA {String(index+1).padStart(2,'0')}</small>
        </div>

        <input disabled={readOnly} aria-label="Avversario" placeholder="NOME SQUADRA" value={match.opponent} onChange={event => patch(match.id,{opponent:upper(event.target.value)})}/>
        <input disabled={readOnly} aria-label="Data" type="date" value={match.date} onChange={event => patch(match.id,{date:event.target.value})}/>
        <input disabled={readOnly} aria-label="Ora" type="time" value={match.time} onChange={event => patch(match.id,{time:event.target.value})}/>
        <input disabled={readOnly} aria-label="Luogo" placeholder="LUOGO / CAMPO" value={match.location} onChange={event => patch(match.id,{location:upper(event.target.value)})}/>

        <div className="match-buttons">
          <button onClick={() => setCallup(match)}>CONVOCAZIONE</button>
          {!readOnly && <button className="soft" onClick={() => resetMatch(match)}>AZZERA</button>}
        </div>
      </article>)}
    </div>

    {callup && <Callup
      category={category}
      match={callup}
      allPlayers={players}
      readOnly={readOnly}
      onPatch={changes => {
        patch(callup.id, changes)
        if (!readOnly) setCallup(current => ({...current,...changes}))
      }}
      onClose={() => setCallup(null)}
    />}
  </section>
}

function Callup({ category, match, allPlayers, onPatch, onClose, readOnly }) {
  const [categoryFilter, setCategoryFilter] = useState(category || '')
  const [query, setQuery] = useState('')

  const activePlayers = useMemo(() => allPlayers
    .filter(player => player.active !== false)
    .sort((a,b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'it')),
  [allPlayers])

  const legacyNames = useMemo(() =>
    String(match.callupPlayers || '')
      .split(/\n|,/)
      .map(value => upper(value.trim()))
      .filter(Boolean),
  [match.callupPlayers])

  const selectedIds = useMemo(() => {
    const saved = Array.isArray(match.callupPlayerIds)
      ? match.callupPlayerIds.map(String)
      : []

    if (saved.length) return new Set(saved)

    const legacySet = new Set(legacyNames)
    return new Set(
      activePlayers
        .filter(player => legacySet.has(upper(`${player.lastName} ${player.firstName}`)))
        .map(player => String(player.id))
    )
  }, [match.callupPlayerIds, legacyNames, activePlayers])

  const selectedPlayers = useMemo(() =>
    activePlayers.filter(player => selectedIds.has(String(player.id))),
  [activePlayers, selectedIds])

  const selectedNames = useMemo(() => {
    if (selectedPlayers.length) {
      return selectedPlayers.map(player => upper(`${player.lastName} ${player.firstName}`))
    }
    return legacyNames
  }, [selectedPlayers, legacyNames])

  const visiblePlayers = useMemo(() => {
    const search = upper(query)
    return activePlayers.filter(player =>
      (!categoryFilter || player.category === categoryFilter)
      && (!search || upper(`${player.firstName} ${player.lastName} ${player.category}`).includes(search))
    )
  }, [activePlayers, categoryFilter, query])

  const competition = upper(match.competition || 'CAMPIONATO')

  function saveSelected(nextIds) {
    const ids = [...nextIds].map(String)
    const names = activePlayers
      .filter(player => nextIds.has(String(player.id)))
      .map(player => upper(`${player.lastName} ${player.firstName}`))

    onPatch({
      callupPlayerIds: ids,
      callupPlayers: names.join('\n'),
    })
  }

  function togglePlayer(playerId) {
    if (readOnly) return
    const next = new Set(selectedIds)
    const id = String(playerId)
    next.has(id) ? next.delete(id) : next.add(id)
    saveSelected(next)
  }

  function selectVisible() {
    if (readOnly) return
    const next = new Set(selectedIds)
    visiblePlayers.forEach(player => next.add(String(player.id)))
    saveSelected(next)
  }

  function clearVisible() {
    if (readOnly) return
    const next = new Set(selectedIds)
    visiblePlayers.forEach(player => next.delete(String(player.id)))
    saveSelected(next)
  }

  const players = selectedNames

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
    ctx.beginPath()
    ctx.roundRect(x,y,w,h,r)
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
  }

  function fittedText(ctx,text,maxWidth,startSize,minSize=13,weight=900) {
    let size=startSize
    do {
      ctx.font=`${weight} ${size}px Arial`
      if(ctx.measureText(text).width<=maxWidth) break
      size-=1
    } while(size>minSize)
    return size
  }

  async function download() {
    if (!players.length) { alert('INSERISCI ALMENO UN CONVOCATO.'); return }
    const canvas=document.createElement('canvas')
    canvas.width=1080
    canvas.height=1350
    const ctx=canvas.getContext('2d')
    const heroLogo=document.querySelector('.hero-title-row>img, .hero img')
    const homeSrc=heroLogo ? heroLogo.src : '/ACQ-Scuola-Calcio/logo-acquacetosa.png'
    const [homeLogo,awayLogo]=await Promise.all([loadImage(homeSrc),loadImage(match.logo)])

    const gradient=ctx.createLinearGradient(0,0,1080,1350)
    gradient.addColorStop(0,'#061b34')
    gradient.addColorStop(.58,'#16405d')
    gradient.addColorStop(1,'#081b31')
    ctx.fillStyle=gradient
    ctx.fillRect(0,0,1080,1350)

    ctx.strokeStyle='rgba(255,255,255,.035)'
    ctx.lineWidth=2
    for(let position=-500;position<1500;position+=45){
      ctx.beginPath()
      ctx.moveTo(position,0)
      ctx.lineTo(position+650,1350)
      ctx.stroke()
    }

    ctx.fillStyle='#fff'
    ctx.font='800 27px Arial'
    ctx.fillText('ASD ACQUACETOSA CENTRO CALCIO',54,62)
    rounded(ctx,760,25,266,60,30,'rgba(6,27,52,.96)','#fff')
    ctx.textAlign='center'
    ctx.textBaseline='middle'
    ctx.font='900 24px Arial'
    ctx.fillText('STAGIONE 2026/27',893,55)
    ctx.textBaseline='alphabetic'
    ctx.textAlign='left'
    ctx.fillStyle='#c5dcff'
    ctx.font='800 24px Arial'
    ctx.fillText('CONVOCAZIONE UFFICIALE',54,132)
    ctx.fillStyle='#fff'
    ctx.font='900 62px Arial'
    ctx.fillText(competition,54,205)
    ctx.fillStyle='#a8c9ff'
    fittedText(ctx,category,900,78,44)
    ctx.fillText(category,54,285)

    rounded(ctx,54,330,972,292,28,'#f7f9fc')
    const contain=(image,cx,cy,w,h)=>{
      if(!image)return
      const ratio=Math.min(w/image.width,h/image.height)
      const dw=image.width*ratio
      const dh=image.height*ratio
      ctx.drawImage(image,cx+(w-dw)/2,cy+(h-dh)/2,dw,dh)
    }
    contain(homeLogo,110,360,220,170)
    contain(awayLogo,750,360,220,170)
    ctx.fillStyle='#0b2c63'
    ctx.textAlign='center'
    ctx.font='900 46px Arial'
    ctx.fillText('VS',540,465)
    ctx.fillStyle='#6e7e99'
    ctx.font='700 18px Arial'
    ctx.fillText(category,540,510)
    ctx.fillStyle='#10233f'
    ctx.font='900 25px Arial'
    ctx.fillText('ACQUACETOSA',220,580)
    fittedText(ctx,match.opponent||'AVVERSARIO',260,25,16)
    ctx.fillText(match.opponent||'AVVERSARIO',860,580)
    ctx.textAlign='left'

    const boxes=[
      ['DATA',displayDate(match.date)||'DA DEFINIRE'],
      ['CALCIO D’INIZIO',match.time?`ORE ${match.time}`:'DA DEFINIRE'],
      ['LUOGO',match.location||'DA DEFINIRE'],
      ['ALLENATORE',match.coach||'DA DEFINIRE']
    ]
    boxes.forEach((box,index)=>{
      const x=54+index*243
      rounded(ctx,x,650,231,135,18,'rgba(6,35,76,.94)','rgba(255,255,255,.16)')
      ctx.fillStyle='#b8c7dc'
      ctx.font='800 14px Arial'
      ctx.fillText(box[0],x+17,682)
      ctx.fillStyle='#fff'
      fittedText(ctx,box[1],197,22,14,800)
      ctx.fillText(box[1],x+17,724)
    })

    rounded(ctx,54,815,972,470,28,'#f7f9fc')
    ctx.fillStyle='#0b2c63'
    ctx.font='900 34px Arial'
    ctx.fillText('LISTA CONVOCATI',86,875)
    ctx.textAlign='right'
    ctx.fillStyle='#6d7d98'
    ctx.font='800 18px Arial'
    ctx.fillText(`${players.length} CALCIATORI`,990,875)
    ctx.textAlign='left'
    ctx.fillStyle='#0b2c63'
    ctx.fillRect(86,895,904,3)

    players.slice(0,18).forEach((player,index)=>{
      const col=index%3
      const row=Math.floor(index/3)
      const x=86+col*300
      const y=925+row*61
      rounded(ctx,x,y,286,51,14,'#edf3fb','#d5dfec')
      ctx.fillStyle='#0f4b96'
      ctx.beginPath()
      ctx.arc(x+27,y+25.5,17,0,Math.PI*2)
      ctx.fill()
      ctx.fillStyle='#fff'
      ctx.font='800 13px Arial'
      ctx.textAlign='center'
      ctx.fillText(String(index+1).padStart(2,'0'),x+27,y+30)
      ctx.textAlign='left'
      ctx.fillStyle='#10233f'
      fittedText(ctx,player,212,17,12)
      ctx.fillText(player,x+57,y+32)
    })

    ctx.fillStyle='#d6e6ff'
    ctx.font='800 18px Arial'
    ctx.fillText('ACQUACETOSA CENTRO CALCIO',54,1325)

    const link=document.createElement('a')
    link.download=`CONVOCAZIONE_${safeFile(category)}_${match.date||'DATA'}.png`
    link.href=canvas.toDataURL('image/png')
    link.click()
  }

  return <Modal title={`CONVOCAZIONE · ${category}`} onClose={onClose} wide>
    <div className="form-grid callup-form">
      <label>COMPETIZIONE<input disabled={readOnly} value={match.competition||'CAMPIONATO'} onChange={event=>onPatch({competition:upper(event.target.value)})}/></label>
      <label>AVVERSARIO<input value={match.opponent} readOnly/></label>
      <label>DATA<input value={displayDate(match.date)} readOnly/></label>
      <label>ORARIO<input value={match.time} readOnly/></label>
      <label>ALLENATORE<input disabled={readOnly} value={match.coach||''} onChange={event=>onPatch({coach:upper(event.target.value)})}/></label>
      <label>LUOGO<input disabled={readOnly} value={match.location||''} onChange={event=>onPatch({location:upper(event.target.value)})}/></label>
      <label className="full callup-meeting-time">ORARIO RITROVO<input disabled={readOnly} type="time" value={match.meetingTime||''} onChange={event=>onPatch({meetingTime:event.target.value})}/></label>

      <section className="full callup-roster-picker">
        <header>
          <div>
            <small>SELEZIONE RAPIDA</small>
            <h3>CONVOCATI</h3>
            <p>PUOI SELEZIONARE TESSERATI DI QUALSIASI CATEGORIA.</p>
          </div>
          <div className="callup-roster-count">
            <b>{selectedPlayers.length || legacyNames.length}</b>
            <span>CONVOCATI</span>
          </div>
        </header>

        <div className="callup-roster-tools">
          <select
            value={categoryFilter}
            onChange={event=>setCategoryFilter(event.target.value)}
          >
            <option value="">TUTTE LE CATEGORIE</option>
            {['PICCOLI AMICI','PRIMI CALCI','PULCINI','ESORDIENTI'].map(value=>
              <option key={value}>{value}</option>
            )}
          </select>

          <input
            placeholder="CERCA TESSERATO…"
            value={query}
            onChange={event=>setQuery(event.target.value)}
          />

          {!readOnly && <button type="button" className="soft" onClick={selectVisible}>SELEZIONA VISIBILI</button>}
          {!readOnly && <button type="button" className="soft" onClick={clearVisible}>AZZERA VISIBILI</button>}
        </div>

        <div className="callup-selected-summary">
          <b>{selectedNames.length} GIOCATORI SELEZIONATI</b>
          <span>{selectedNames.length ? selectedNames.join(' · ') : 'NESSUN CONVOCATO SELEZIONATO'}</span>
        </div>

        <div className="callup-roster-list">
          {!activePlayers.length &&
            <div className="app-empty">
              <b>NESSUN TESSERATO DISPONIBILE</b>
              <span>IL DIRETTORE DEVE PRIMA INSERIRE I GIOCATORI NELL’ANAGRAFICA TESSERATI.</span>
            </div>
          }

          {activePlayers.length > 0 && !visiblePlayers.length &&
            <div className="app-empty">
              <b>NESSUN GIOCATORE TROVATO</b>
              <span>MODIFICA LA CATEGORIA O LA RICERCA.</span>
            </div>
          }

          {visiblePlayers.map(player => {
            const checked = selectedIds.has(String(player.id))
            return <label key={player.id} className={checked ? 'selected' : ''}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={checked}
                onChange={()=>togglePlayer(player.id)}
              />
              <span className="callup-checkbox">✓</span>
              <span className="callup-shirt-number">{player.shirtNumber === '' ? '—' : player.shirtNumber}</span>
              <span className="callup-player-data">
                <b>{player.lastName} {player.firstName}</b>
                <small>{player.category}</small>
              </span>
            </label>
          })}
        </div>
      </section>

      <label className="full">NOTE<textarea disabled={readOnly} rows="3" value={match.callupNotes||''} onChange={event=>onPatch({callupNotes:upper(event.target.value)})}/></label>
      <footer className="modal-actions full">
        <button className="ghost" onClick={onClose}>CHIUDI</button>
        <button onClick={download}>SCARICA PNG</button>
      </footer>
    </div>
  </Modal>
}
