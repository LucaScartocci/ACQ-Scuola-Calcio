export const COACHES = [
  'CAMMISOTTO','ERCOLANI','ERDI','GIORDANI','MORDENTI','MORTOLINI',
  'ODDI','POSTACCHINI','SCARTOCCI','TIANO','VENDITTI'
]
export const CATEGORIES = ['PICCOLI AMICI','PRIMI CALCI','PULCINI','ESORDIENTI']
export const PHASES = ['ATTIVAZIONE','PARTE CENTRALE','PARTITA A TEMA']

export const emptyArchive = () => ({
  sessions: [],
  exercises: [],
  matchesByCategory: Object.fromEntries(CATEGORIES.map(c => [c, Array.from({ length: 30 }, (_, i) => ({
    id: crypto.randomUUID?.() || `m-${Date.now()}-${i}`,
    slot: i + 1,
    opponent: '', logo: '', date: '', time: '', location: '', coach: '', callupPlayers: ''
  }))])),
  documents: { meetings: [], teaching: [] },
  updatedAt: new Date().toISOString(),
})

export const normalizeArchive = (value) => {
  const base = emptyArchive()
  if (!value || typeof value !== 'object') return base
  const archive = {
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    exercises: Array.isArray(value.exercises) ? value.exercises : [],
    matchesByCategory: value.matchesByCategory && typeof value.matchesByCategory === 'object'
      ? value.matchesByCategory : base.matchesByCategory,
    documents: value.documents && typeof value.documents === 'object'
      ? value.documents : base.documents,
    updatedAt: value.updatedAt || new Date().toISOString(),
  }
  CATEGORIES.forEach(category => {
    const current = Array.isArray(archive.matchesByCategory[category]) ? archive.matchesByCategory[category] : []
    archive.matchesByCategory[category] = current.slice(0, 30)
    while (archive.matchesByCategory[category].length < 30) {
      const i = archive.matchesByCategory[category].length
      archive.matchesByCategory[category].push({
        id: crypto.randomUUID?.() || `m-${Date.now()}-${i}`,
        slot: i + 1, opponent: '', logo: '', date: '', time: '', location: '', coach: '', callupPlayers: ''
      })
    }
  })
  return archive
}

export const upper = value => String(value ?? '').toUpperCase()
export const uid = () => crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
