import { useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import { upper, uid } from '../lib/archive'
import { removeCloudFile, uploadCloudFile } from '../lib/storage'

const TYPE_LABELS = {
  meetings: ['RIUNIONI TECNICHE','VERBALI, PRESENTAZIONI E DOCUMENTI DELLO STAFF'],
  teaching: ['MATERIALE DIDATTICO','PDF, VIDEO, IMMAGINI E CONTENUTI METODOLOGICI'],
}

const sizeLabel = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

const fileIcon = type => {
  if (type?.startsWith('image/')) return '🖼️'
  if (type?.startsWith('video/')) return '🎥'
  if (type?.includes('pdf')) return '📄'
  if (type?.includes('presentation') || type?.includes('powerpoint')) return '📊'
  if (type?.includes('word') || type?.includes('text')) return '📝'
  return '📎'
}

export default function DocumentLibrary({ type, items, onAdd, onDelete, onClose, readOnly=false }) {
  const [title,setTitle] = useState('')
  const [search,setSearch] = useState('')
  const [files,setFiles] = useState([])
  const [busy,setBusy] = useState(false)
  const inputRef=useRef(null)
  const [heading,subtitle]=TYPE_LABELS[type]
  const visible=useMemo(()=>{
    const q=upper(search)
    return [...items]
      .filter(x=>!q||upper([x.title,x.name,x.description].join(' ')).includes(q))
      .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
  },[items,search])

  async function submit(){
    if(!files.length){
      window.alert('SELEZIONA ALMENO UN FILE.')
      return
    }

    setBusy(true)
    const uploaded=[]

    try{
      for(const file of files){
        const cloud=await uploadCloudFile(
          file,
          type==='meetings' ? 'riunioni-tecniche' : 'materiale-didattico'
        )
        uploaded.push({
          id:uid(),
          title:upper(title || file.name),
          description:'',
          ...cloud,
          createdAt:Date.now(),
          category:type,
        })
      }

      await onAdd(uploaded)

      setFiles([])
      setTitle('')
      if(inputRef.current) inputRef.current.value=''
    }catch(error){
      console.error(error)

      // If Storage succeeded but archive persistence failed, remove orphan files.
      if(uploaded.length){
        await Promise.allSettled(
          uploaded
            .filter(item=>item.storagePath)
            .map(item=>removeCloudFile(item.storagePath))
        )
      }

      window.alert(
        'CARICAMENTO NON RIUSCITO. IL DOCUMENTO NON È STATO CONFERMATO NEL GESTIONALE.\n\n'
        + (error.message || 'ERRORE SCONOSCIUTO')
      )
    }finally{
      setBusy(false)
    }
  }

  return <Modal title={heading} onClose={onClose} wide>
    <div className="document-library">
      <p className="document-subtitle">{subtitle}</p>
      {!readOnly && <section className="document-upload">
        <label>TITOLO / DESCRIZIONE<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="ES. RIUNIONE STAFF SETTEMBRE"/></label>
        <label>FILE<input ref={inputRef} type="file" multiple onChange={e=>setFiles([...e.target.files])}/><small>NESSUN LIMITE IMPOSTO DAL GESTIONALE. RESTANO I LIMITI TECNICI DELLO STORAGE.</small></label>
        <button onClick={submit} disabled={busy}>{busy?'CARICAMENTO…':'＋ CARICA NEL CLOUD'}</button>
      </section>}
      {files.length>0 && <div className="pending-files">{files.map(f=><span key={f.name}>{f.name} · {sizeLabel(f.size)}</span>)}</div>}
      <input className="document-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="CERCA NELLA LIBRERIA…"/>
      <div className="document-grid">
        {visible.map(item=><article className="document-card" key={item.id}>
          <div className="document-icon">{fileIcon(item.type)}</div>
          <div className="document-info"><h3>{item.title}</h3><p>{item.name}</p><small>{sizeLabel(item.size||0)} · {new Date(item.createdAt).toLocaleDateString('it-IT')}</small></div>
          <footer><a href={item.url} target="_blank" rel="noreferrer">APRI</a><a href={item.url} download={item.name}>SCARICA</a>{!readOnly && <button onClick={()=>onDelete(item)}>ELIMINA</button>}</footer>
        </article>)}
      </div>
      {!visible.length && <div className="documents-empty">NESSUN FILE PRESENTE</div>}
    </div>
  </Modal>
}
