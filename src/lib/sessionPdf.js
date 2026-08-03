import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

const NAVY = [7,27,52]
const BLUE = [15,92,192]
const PALE = [247,250,253]
const INK = [18,45,73]
const MUTED = [102,121,143]
const WHITE = [255,255,255]

const cleanFile = value => String(value || 'SEDUTA')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g,'_')
  .replace(/^_+|_+$/g,'')

const formatDate = value => {
  if (!value) return 'DATA DA DEFINIRE'
  const parts = String(value).split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value
}

async function imageToDataUrl(src) {
  if (!src) return ''
  try {
    const response = await fetch(src,{mode:'cors'})
    if (!response.ok) return ''
    const blob = await response.blob()
    return await new Promise((resolve,reject)=>{
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

function imageFormat(dataUrl) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

function rounded(doc,x,y,w,h,r,fill,stroke=null) {
  if (fill) doc.setFillColor(...fill)
  if (stroke) {
    doc.setDrawColor(...stroke)
    doc.setLineWidth(.3)
  }
  doc.roundedRect(x,y,w,h,r,r,stroke?'FD':'F')
}

function label(doc,text,x,y,color=MUTED,size=7) {
  doc.setFont('helvetica','bold')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  doc.text(String(text || '').toUpperCase(),x,y)
}

function value(doc,text,x,y,size=10,color=INK,maxWidth=50) {
  doc.setFont('helvetica','bold')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(String(text || '—'),maxWidth)
  doc.text(lines.slice(0,2),x,y)
}

function paragraph(doc,text,x,y,width,size=8,maxLines=6) {
  doc.setFont('helvetica','normal')
  doc.setFontSize(size)
  doc.setTextColor(...INK)
  const lines = doc.splitTextToSize(String(text || '—'),width).slice(0,maxLines)
  doc.text(lines,x,y,{lineHeightFactor:1.15})
}

function header(doc,logoData,title,subtitle) {
  doc.setFillColor(...NAVY)
  doc.rect(0,0,210,24,'F')
  if (logoData) {
    try { doc.addImage(logoData,imageFormat(logoData),10,4,16,16,undefined,'FAST') } catch {}
  }
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica','bold')
  doc.setFontSize(11)
  doc.text('SCUOLA CALCIO ACQUACETOSA',31,11)
  doc.setFontSize(7)
  doc.setTextColor(190,211,237)
  doc.text('STAGIONE 2026/27',31,17)
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.text(title,198,10,{align:'right'})
  doc.setFontSize(7)
  doc.setTextColor(190,211,237)
  doc.text(subtitle,198,17,{align:'right'})
}

function footer(doc,page,total) {
  doc.setDrawColor(216,226,238)
  doc.line(10,287,200,287)
  doc.setFont('helvetica','bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  doc.text('ACQUACETOSA CENTRO CALCIO',10,292)
  doc.text(`PAGINA ${page} DI ${total}`,200,292,{align:'right'})
}

function addContainImage(doc,dataUrl,x,y,w,h) {
  if (!dataUrl) return false
  try {
    const props = doc.getImageProperties(dataUrl)
    const ratio = Math.min(w/props.width,h/props.height)
    const dw = props.width*ratio
    const dh = props.height*ratio
    doc.addImage(dataUrl,imageFormat(dataUrl),x+(w-dw)/2,y+(h-dh)/2,dw,dh,undefined,'FAST')
    return true
  } catch {
    return false
  }
}

function attendanceRows(players,presentIds) {
  const selected = players
    .filter(player => presentIds.includes(player.id))
    .sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'it'))

  const byCategory = new Map()
  selected.forEach(player => {
    const category = player.category || 'ALTRO'
    if (!byCategory.has(category)) byCategory.set(category,[])
    byCategory.get(category).push(player)
  })
  return [...byCategory.entries()]
}

async function pageOne(doc,{session,exercises,players,presentIds,logoData}) {
  header(doc,logoData,'SEDUTA DI ALLENAMENTO',session.category)

  doc.setFont('helvetica','bold')
  doc.setFontSize(21)
  doc.setTextColor(...NAVY)
  doc.text('SEDUTA DI ALLENAMENTO',10,37)

  const cards = [
    ['CATEGORIA',session.category],
    ['ALLENATORE',session.coach],
    ['DATA',formatDate(session.date)],
    ['DURATA',`${session.duration || 0}'`],
    ['GIOCATORI PREVISTI',session.players || '—'],
    ['PRESENTI',presentIds.length],
  ]
  cards.forEach((card,index)=>{
    const col=index%3
    const row=Math.floor(index/3)
    const x=10+col*64
    const y=47+row*29
    rounded(doc,x,y,60,24,4,col===0&&row===0?NAVY:PALE,[216,227,239])
    label(doc,card[0],x+5,y+9,col===0&&row===0?[186,207,234]:MUTED,6)
    value(doc,card[1],x+5,y+18,9,col===0&&row===0?WHITE:INK,50)
  })

  rounded(doc,10,110,190,34,5,PALE,[216,227,239])
  label(doc,'OBIETTIVO DELLA SEDUTA',16,121,BLUE,7)
  paragraph(doc,session.objective,16,131,178,8.5,4)

  label(doc,'PRESENZE',10,157,NAVY,9)
  const groups = attendanceRows(players,presentIds)
  if (!groups.length) {
    rounded(doc,10,163,190,23,4,PALE,[216,227,239])
    paragraph(doc,'NESSUNA PRESENZA REGISTRATA',16,177,178,8,2)
  } else {
    let y=165
    groups.forEach(([category,group])=>{
      if (y>260) return
      doc.setFont('helvetica','bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...BLUE)
      doc.text(`${category} · ${group.length}`,10,y)
      const names = group.map(player => `${player.lastName} ${player.firstName}`).join(' · ')
      paragraph(doc,names,10,y+7,190,7.2,3)
      const lines = doc.splitTextToSize(names,190).slice(0,3)
      y += 10 + lines.length*3.2
    })
  }

  const exerciseMinutes = exercises.reduce((sum,item)=>sum+Number(item.duration||0),0)
  rounded(doc,10,265,190,14,4,NAVY)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica','bold')
  doc.setFontSize(7.5)
  doc.text(`${exercises.length} ESERCITAZIONI · ${exerciseMinutes}' TOTALI · CAMPO: ${session.field || 'NON SPECIFICATO'}`,105,274,{align:'center'})
}

async function pageTwo(doc,{session,exercises,logoData,appUrl}) {
  header(doc,logoData,'ESERCITAZIONI',`${exercises.length} ATTIVITÀ`)

  if (!exercises.length) {
    rounded(doc,10,40,190,45,5,PALE,[216,227,239])
    paragraph(doc,'NESSUNA ESERCITAZIONE INSERITA NELLA SEDUTA.',16,58,178,10,3)
    return
  }

  const maxItems = 6
  const visibleExercises = exercises.slice(0,maxItems)
  const cardHeight = visibleExercises.length <= 4 ? 56 : 41
  let y = 32

  for (let index=0; index<visibleExercises.length; index++) {
    const exercise = visibleExercises[index]
    rounded(doc,10,y,190,cardHeight-4,5,index%2?PALE:[239,245,252],[216,227,239])

    const imageData = await imageToDataUrl(exercise.image)
    const imageSize = cardHeight-14
    const imageAdded = addContainImage(doc,imageData,15,y+5,imageSize,imageSize)
    if (!imageAdded) {
      doc.setDrawColor(190,204,221)
      doc.roundedRect(15,y+5,imageSize,imageSize,3,3,'D')
      doc.setFontSize(6)
      doc.setTextColor(...MUTED)
      doc.text('NO IMG',15+imageSize/2,y+5+imageSize/2,{align:'center'})
    }

    const textX = 21+imageSize
    const textWidth = 141-imageSize

    doc.setFont('helvetica','bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    const title = doc.splitTextToSize(`${index+1}. ${exercise.title || 'ESERCITAZIONE'}`,textWidth)
    doc.text(title.slice(0,1),textX,y+10)

    doc.setFontSize(6.5)
    doc.setTextColor(...BLUE)
    doc.text(`${exercise.phase || '—'} · ${exercise.duration || 0}' · ${exercise.players || '—'} GIOCATORI · ${exercise.space || 'SPAZIO N/D'}`,textX,y+18)

    paragraph(doc,exercise.objective || exercise.description,textX,y+25,textWidth,6.7,3)

    const qr = await QRCode.toDataURL(`${appUrl}#exercise=${encodeURIComponent(exercise.id)}`,{
      errorCorrectionLevel:'M',
      margin:1,
      width:160,
      color:{dark:'#071b34',light:'#ffffff'}
    })
    doc.addImage(qr,'PNG',174,y+7,20,20)

    doc.setFont('helvetica','bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...MUTED)
    doc.text('APRI',184,y+31,{align:'center'})

    y += cardHeight
  }

  if (exercises.length > maxItems) {
    rounded(doc,10,274,190,8,3,[255,246,222],[238,211,145])
    doc.setFont('helvetica','bold')
    doc.setFontSize(6.5)
    doc.setTextColor(143,94,0)
    doc.text(`ALTRE ${exercises.length-maxItems} ESERCITAZIONI NON MOSTRATE PER MANTENERE IL PDF ENTRO 2 PAGINE.`,105,279,{align:'center'})
  }
}

export async function generateSessionPdf({ session, exercises, players = [], presentIds = [], logoUrl, appUrl }) {
  const orderedExercises = [...exercises].sort((a,b)=>
    Number(a.order ?? a.createdAt ?? 0)-Number(b.order ?? b.createdAt ?? 0)
  )
  const logoData = await imageToDataUrl(logoUrl)
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true})

  await pageOne(doc,{session,exercises:orderedExercises,players,presentIds,logoData})
  doc.addPage()
  await pageTwo(doc,{session,exercises:orderedExercises,logoData,appUrl})

  footer(doc,1,2)
  doc.setPage(2)
  footer(doc,2,2)

  const filename = [
    'ACQ',
    cleanFile(session.category),
    cleanFile(session.coach),
    cleanFile(formatDate(session.date)),
  ].filter(Boolean).join('_')+'.pdf'

  return {
    filename,
    pages:2,
    exercises:orderedExercises.length,
    blob:doc.output('blob'),
  }
}
