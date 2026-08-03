import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

const NAVY = [7, 27, 52]
const BLUE = [15, 92, 192]
const LIGHT_BLUE = [231, 240, 251]
const PALE = [247, 250, 253]
const GOLD = [235, 164, 25]
const INK = [18, 45, 73]
const MUTED = [102, 121, 143]
const WHITE = [255, 255, 255]

const cleanFile = value => String(value || 'SEDUTA')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const formatDate = value => {
  if (!value) return 'DATA DA DEFINIRE'
  const parts = String(value).split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value
}

const safeText = value => String(value || '').trim()

function rounded(doc, x, y, w, h, r, fill, stroke = null) {
  if (fill) doc.setFillColor(...fill)
  if (stroke) {
    doc.setDrawColor(...stroke)
    doc.setLineWidth(.35)
  }
  doc.roundedRect(x, y, w, h, r, r, stroke ? 'FD' : 'F')
}

function label(doc, text, x, y, color = MUTED, size = 7.5) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  doc.text(String(text || '').toUpperCase(), x, y)
}

function value(doc, text, x, y, size = 11, color = INK, maxWidth = 70) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(safeText(text) || '—', maxWidth)
  doc.text(lines.slice(0, 3), x, y)
}

function paragraph(doc, text, x, y, width, options = {}) {
  const {
    size = 9.2,
    color = INK,
    lineHeight = 1.25,
    maxLines = 12,
    font = 'normal',
  } = options
  doc.setFont('helvetica', font)
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(safeText(text) || '—', width).slice(0, maxLines)
  doc.text(lines, x, y, { lineHeightFactor: lineHeight })
  return lines.length * size * .36 * lineHeight
}

async function imageToDataUrl(src) {
  if (!src) return ''
  try {
    const response = await fetch(src, { mode:'cors' })
    if (!response.ok) throw new Error('image fetch')
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('PDF image fallback', error)
    return ''
  }
}

function imageFormat(dataUrl) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

function addImageContain(doc, dataUrl, x, y, w, h) {
  if (!dataUrl) return false
  try {
    const properties = doc.getImageProperties(dataUrl)
    const ratio = Math.min(w / properties.width, h / properties.height)
    const width = properties.width * ratio
    const height = properties.height * ratio
    doc.addImage(dataUrl, imageFormat(dataUrl), x + (w-width)/2, y + (h-height)/2, width, height, undefined, 'FAST')
    return true
  } catch (error) {
    console.warn('PDF add image', error)
    return false
  }
}

function header(doc, title, subtitle, logoData) {
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 27, 'F')
  if (logoData) {
    try { doc.addImage(logoData, imageFormat(logoData), 12, 5, 17, 17, undefined, 'FAST') } catch {}
  }
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('SCUOLA CALCIO ACQUACETOSA', 35, 12)
  doc.setFontSize(7.5)
  doc.setTextColor(189, 211, 238)
  doc.text('ARCHIVIO METODOLOGICO · STAGIONE 2026/27', 35, 18)
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.text(title, 198, 11, { align:'right' })
  doc.setTextColor(189, 211, 238)
  doc.setFontSize(7)
  doc.text(subtitle, 198, 17, { align:'right' })
}

function footer(doc, current, total) {
  doc.setDrawColor(215, 226, 238)
  doc.line(12, 282, 198, 282)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('ACQUACETOSA CENTRO CALCIO · STAGIONE 2026/27', 12, 288)
  doc.text(`PAGINA ${current} DI ${total}`, 198, 288, { align:'right' })
}

function phaseSummary(exercises) {
  const map = new Map()
  exercises.forEach(exercise => {
    const phase = exercise.phase || 'NON DEFINITA'
    map.set(phase, (map.get(phase) || 0) + Number(exercise.duration || 0))
  })
  return [...map.entries()].map(([name, minutes]) => ({ name, minutes }))
}

function allEquipment(exercises) {
  const items = new Set()
  exercises.forEach(exercise => {
    String(exercise.equipment || '')
      .split(/,|;|\n/)
      .map(item => item.trim())
      .filter(Boolean)
      .forEach(item => items.add(item))
  })
  return [...items].join(' · ')
}

function addCover(doc, session, exercises, logoData) {
  const totalExerciseMinutes = exercises.reduce((sum, item) => sum + Number(item.duration || 0), 0)

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 297, 'F')

  doc.setFillColor(11, 50, 89)
  for (let x = -20; x < 230; x += 18) {
    doc.roundedRect(x, 0, 7, 297, 3, 3, 'F')
  }

  if (logoData) {
    try { doc.addImage(logoData, imageFormat(logoData), 77, 24, 56, 56, undefined, 'FAST') } catch {}
  }

  doc.setTextColor(181, 208, 241)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('ASD ACQUACETOSA CENTRO CALCIO', 105, 95, { align:'center' })

  doc.setTextColor(...WHITE)
  doc.setFontSize(27)
  doc.text('SEDUTA DI', 105, 119, { align:'center' })
  doc.setTextColor(163, 202, 251)
  doc.setFontSize(31)
  doc.text('ALLENAMENTO', 105, 138, { align:'center' })

  rounded(doc, 20, 155, 170, 80, 8, [248, 250, 253])

  label(doc, 'Categoria', 31, 171)
  value(doc, session.category, 31, 181, 15, NAVY, 65)
  label(doc, 'Allenatore', 113, 171)
  value(doc, session.coach, 113, 181, 15, NAVY, 65)

  label(doc, 'Data', 31, 201)
  value(doc, formatDate(session.date), 31, 211, 11, INK, 45)
  label(doc, 'Durata prevista', 78, 201)
  value(doc, `${session.duration || 0}'`, 78, 211, 11, INK, 35)
  label(doc, 'Giocatori', 119, 201)
  value(doc, session.players || '—', 119, 211, 11, INK, 30)
  label(doc, 'Esercitazioni', 157, 201)
  value(doc, exercises.length, 157, 211, 11, INK, 25)

  doc.setTextColor(203, 220, 241)
  doc.setFontSize(8)
  doc.text(`TEMPO ESERCITAZIONI: ${totalExerciseMinutes}'`, 105, 252, { align:'center' })
  doc.text('STAGIONE SPORTIVA 2026/27', 105, 262, { align:'center' })
}

function addOverview(doc, session, exercises, logoData) {
  header(doc, 'OVERVIEW SEDUTA', session.category, logoData)

  rounded(doc, 12, 36, 186, 38, 5, PALE, [216, 227, 239])
  label(doc, 'Obiettivo della seduta', 20, 47, BLUE)
  paragraph(doc, session.objective, 20, 57, 170, { size:10, maxLines:5, font:'bold' })

  const phases = phaseSummary(exercises)
  const maxMinutes = Math.max(1, ...phases.map(item => item.minutes))
  label(doc, 'Distribuzione dei tempi', 12, 87, NAVY, 9)

  let y = 98
  phases.forEach(item => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK)
    doc.text(item.name, 12, y)
    doc.setTextColor(...MUTED)
    doc.text(`${item.minutes}'`, 198, y, { align:'right' })
    doc.setFillColor(232, 239, 247)
    doc.roundedRect(74, y-4.5, 112, 5.5, 2.7, 2.7, 'F')
    doc.setFillColor(...BLUE)
    doc.roundedRect(74, y-4.5, Math.max(3, 112 * item.minutes/maxMinutes), 5.5, 2.7, 2.7, 'F')
    y += 14
  })

  const equipment = allEquipment(exercises)
  const detailsY = Math.max(155, y + 4)
  rounded(doc, 12, detailsY, 90, 72, 5, PALE, [216, 227, 239])
  label(doc, 'Materiale complessivo', 20, detailsY+13, BLUE)
  paragraph(doc, equipment || 'NON SPECIFICATO', 20, detailsY+24, 74, { size:9, maxLines:8 })

  rounded(doc, 108, detailsY, 90, 72, 5, PALE, [216, 227, 239])
  label(doc, 'Dati operativi', 116, detailsY+13, BLUE)
  const exerciseMinutes = exercises.reduce((sum,item)=>sum+Number(item.duration||0),0)
  const details = [
    `DURATA SESSIONE: ${session.duration || 0}'`,
    `TEMPO ESERCIZI: ${exerciseMinutes}'`,
    `NUMERO GIOCATORI: ${session.players || '—'}`,
    `CAMPO / LUOGO: ${session.field || 'NON SPECIFICATO'}`,
  ]
  details.forEach((text,index) => {
    doc.setFont('helvetica','bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK)
    doc.text(text, 116, detailsY+27+index*10)
  })

  if (safeText(session.staffNotes)) {
    label(doc, 'Note dello staff', 12, detailsY+87, NAVY, 9)
    rounded(doc, 12, detailsY+94, 186, 37, 5, [255, 250, 237], [239, 218, 170])
    paragraph(doc, session.staffNotes, 20, detailsY+106, 170, { size:8.8, maxLines:5 })
  }
}

async function addExercisePage(doc, exercise, index, total, logoData, appUrl) {
  header(doc, `ESERCITAZIONE ${String(index+1).padStart(2,'0')}`, exercise.phase || '', logoData)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  const titleLines = doc.splitTextToSize(safeText(exercise.title) || `ESERCITAZIONE ${index+1}`, 150)
  doc.text(titleLines.slice(0,2), 12, 41)

  rounded(doc, 12, 55, 186, 86, 5, [238, 244, 251], [213, 226, 239])
  const exerciseImage = await imageToDataUrl(exercise.image)
  const imageAdded = addImageContain(doc, exerciseImage, 16, 59, 178, 78)
  if (!imageAdded) {
    doc.setDrawColor(188, 204, 222)
    doc.setLineDashPattern([2, 2], 0)
    doc.roundedRect(16, 59, 178, 78, 4, 4, 'D')
    doc.setLineDashPattern([], 0)
    doc.setTextColor(...MUTED)
    doc.setFontSize(9)
    doc.text('NESSUNA IMMAGINE / SCHEMA DISPONIBILE', 105, 100, { align:'center' })
  }

  const cards = [
    ['FASE', exercise.phase || '—'],
    ['DURATA', `${exercise.duration || 0}'`],
    ['GIOCATORI', exercise.players || '—'],
    ['SPAZIO', exercise.space || '—'],
  ]
  cards.forEach((card, i) => {
    const x = 12 + i*47
    rounded(doc, x, 148, 43, 25, 4, i === 0 ? NAVY : PALE, [216, 227, 239])
    label(doc, card[0], x+5, 158, i === 0 ? [185, 207, 234] : MUTED, 6.5)
    value(doc, card[1], x+5, 168, 9, i === 0 ? WHITE : INK, 33)
  })

  rounded(doc, 12, 180, 90, 45, 5, PALE, [216, 227, 239])
  label(doc, 'Obiettivo', 20, 192, BLUE)
  paragraph(doc, exercise.objective, 20, 202, 74, { size:8.5, maxLines:6, font:'bold' })

  rounded(doc, 108, 180, 90, 45, 5, PALE, [216, 227, 239])
  label(doc, 'Materiale', 116, 192, BLUE)
  paragraph(doc, exercise.equipment || 'NON SPECIFICATO', 116, 202, 74, { size:8.5, maxLines:6 })

  rounded(doc, 12, 232, 140, 42, 5, [250, 252, 255], [216, 227, 239])
  label(doc, 'Organizzazione e svolgimento', 20, 244, NAVY)
  paragraph(doc, exercise.description, 20, 254, 124, { size:8.2, maxLines:6 })

  const deepLink = `${appUrl}#exercise=${encodeURIComponent(exercise.id)}`
  const qr = await QRCode.toDataURL(deepLink, {
    errorCorrectionLevel:'M',
    margin:1,
    width:320,
    color:{ dark:'#071b34', light:'#ffffff' },
  })
  rounded(doc, 158, 232, 40, 42, 5, WHITE, [216, 227, 239])
  doc.addImage(qr, 'PNG', 164, 236, 28, 28)
  doc.setFont('helvetica','bold')
  doc.setFontSize(5.8)
  doc.setTextColor(...MUTED)
  doc.text('APRI NEL GESTIONALE', 178, 270, { align:'center' })

  const stars = Number(exercise.rating || 0)
  label(doc, 'Valutazione', 12, 278, MUTED, 6.5)
  for (let starIndex = 0; starIndex < 5; starIndex += 1) {
    doc.setDrawColor(...GOLD)
    doc.setFillColor(...GOLD)
    doc.circle(38 + starIndex * 6, 276.2, 1.7, starIndex < stars ? 'FD' : 'D')
  }
  if (!stars) {
    doc.setFont('helvetica','bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text('NON VALUTATA', 72, 278)
  }
}

function addSummary(doc, session, exercises, logoData) {
  header(doc, 'RIEPILOGO FINALE', session.category, logoData)
  doc.setFont('helvetica','bold')
  doc.setFontSize(20)
  doc.setTextColor(...NAVY)
  doc.text('SEDUTA COMPLETA', 12, 43)

  const totalExerciseMinutes = exercises.reduce((sum,item)=>sum+Number(item.duration||0),0)
  const rated = exercises.filter(item=>Number(item.rating||0)>0)
  const average = rated.length ? rated.reduce((sum,item)=>sum+Number(item.rating||0),0)/rated.length : 0

  const summaryCards = [
    ['ESERCITAZIONI', exercises.length],
    ['MINUTI ESERCIZI', `${totalExerciseMinutes}'`],
    ['DURATA PREVISTA', `${session.duration || 0}'`],
    ['VALUTAZIONE MEDIA', average ? average.toFixed(1) : 'N/V'],
  ]
  summaryCards.forEach((card,index)=>{
    const x=12+index*47
    rounded(doc,x,55,43,34,5,index===0?NAVY:PALE,[216,227,239])
    label(doc,card[0],x+5,67,index===0?[185,207,234]:MUTED,6.2)
    value(doc,card[1],x+5,81,13,index===0?WHITE:INK,33)
  })

  label(doc,'Sequenza della seduta',12,109,NAVY,9)
  let y=120
  exercises.forEach((exercise,index)=>{
    rounded(doc,12,y-7,186,15,4,index%2?[250,252,255]:[241,246,252])
    doc.setFillColor(...BLUE)
    doc.circle(21,y,.1,'F')
    doc.setFont('helvetica','bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLUE)
    doc.text(String(index+1).padStart(2,'0'),18,y+2)
    doc.setTextColor(...INK)
    doc.text(safeText(exercise.title) || 'ESERCITAZIONE',31,y+2)
    doc.setTextColor(...MUTED)
    doc.text(`${exercise.phase || '—'} · ${exercise.duration || 0}'`,193,y+2,{align:'right'})
    y += 18
    if (y > 252) return
  })

  if (safeText(session.staffNotes)) {
    label(doc,'Note conclusive',12,263,NAVY,8)
    paragraph(doc,session.staffNotes,12,273,186,{size:8,maxLines:3})
  }
}

export async function generateSessionPdf({ session, exercises, logoUrl, appUrl }) {
  const orderedExercises = [...exercises].sort((a,b) =>
    Number(a.order ?? a.createdAt ?? 0) - Number(b.order ?? b.createdAt ?? 0)
  )
  const logoData = await imageToDataUrl(logoUrl)
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4', compress:true })

  addCover(doc, session, orderedExercises, logoData)
  doc.addPage()
  addOverview(doc, session, orderedExercises, logoData)

  for (let index=0; index<orderedExercises.length; index += 1) {
    doc.addPage()
    await addExercisePage(doc, orderedExercises[index], index, orderedExercises.length, logoData, appUrl)
  }

  doc.addPage()
  addSummary(doc, session, orderedExercises, logoData)

  const totalPages = doc.getNumberOfPages()
  for (let page=1; page<=totalPages; page += 1) {
    if (page === 1) continue
    doc.setPage(page)
    footer(doc, page, totalPages)
  }

  const filename = [
    'ACQ',
    cleanFile(session.category),
    cleanFile(session.coach),
    cleanFile(formatDate(session.date)),
  ].filter(Boolean).join('_') + '.pdf'

  doc.save(filename)
  return { filename, pages:totalPages, exercises:orderedExercises.length }
}
