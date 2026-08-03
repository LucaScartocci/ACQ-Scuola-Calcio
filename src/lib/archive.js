export const COACHES = [
  'CAMMISOTTO','ERCOLANI','ERDI','GIORDANI','MORDENTI','MORTOLINI',
  'ODDI','POSTACCHINI','SCARTOCCI','TIANO','VENDITTI'
]
export const CATEGORIES = ['PICCOLI AMICI','PRIMI CALCI','PULCINI','ESORDIENTI']
export const PHASES = ['ATTIVAZIONE','PARTE CENTRALE','PARTITA A TEMA']
export const ARCHIVE_VERSION = 2
export const ADMIN_PASSWORD = 'vittoriout'

const safeId = prefix => {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID()
  } catch {}
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const emptyMatch = (slot) => ({
  id: safeId(`m-${slot}`), slot, opponent: '', logo: '', date: '', time: '',
  location: '', coach: '', callupPlayers: ''
})

export const emptyArchive = () => ({
  version: ARCHIVE_VERSION,
  sessions: [],
  exercises: [],
  matchesByCategory: Object.fromEntries(CATEGORIES.map(c => [c, Array.from({ length: 30 }, (_, i) => emptyMatch(i + 1))])),
  documents: { meetings: [], teaching: [] },
  audit: [],
  updatedAt: new Date().toISOString(),
})

const normalizeCategory = value => {
  const up = upper(value)
  return CATEGORIES.find(c => c === up) || up || CATEGORIES[0]
}

export const normalizeArchive = (value) => {
  const base = emptyArchive()
  if (!value || typeof value !== 'object') return base

  const rawSessions = Array.isArray(value.sessions) ? value.sessions : []
  const rawExercises = Array.isArray(value.exercises) ? value.exercises : []
  const rawDocuments = value.documents || value.documentLibraries || { meetings: [], teaching: [] }

  const archive = {
    version: ARCHIVE_VERSION,
    sessions: rawSessions.map(s => ({
      ...s,
      id: s.id || safeId('session'),
      coach: upper(s.coach || s.title || ''),
      category: normalizeCategory(s.category),
      duration: Number(s.duration) || 90,
      players: Number(s.players) || 16,
      objective: upper(s.objective || ''),
      createdAt: Number(s.createdAt || s.created) || Date.now(),
    })),
    exercises: rawExercises.map(e => ({
      ...e,
      id: e.id || safeId('exercise'),
      sessionId: e.sessionId || '',
      title: upper(e.title || ''),
      category: normalizeCategory(e.category || e.age),
      phase: PHASES.includes(upper(e.phase)) ? upper(e.phase) : (e.phase || PHASES[0]),
      players: Number(e.players) || 0,
      duration: Number(e.duration) || 0,
      rating: Math.max(0, Math.min(5, Number(e.rating) || 0)),
      equipment: upper(e.equipment || ''),
      objective: upper(e.objective || ''),
      description: upper(e.description || ''),
      createdAt: Number(e.createdAt || e.created) || Date.now(),
    })),
    matchesByCategory: value.matchesByCategory && typeof value.matchesByCategory === 'object'
      ? value.matchesByCategory : base.matchesByCategory,
    documents: {
      meetings: Array.isArray(rawDocuments.meetings) ? rawDocuments.meetings : [],
      teaching: Array.isArray(rawDocuments.teaching) ? rawDocuments.teaching : [],
    },
    audit: Array.isArray(value.audit) ? value.audit.slice(-200) : [],
    updatedAt: value.updatedAt || new Date().toISOString(),
  }

  CATEGORIES.forEach(category => {
    const current = Array.isArray(archive.matchesByCategory[category]) ? archive.matchesByCategory[category] : []
    archive.matchesByCategory[category] = current.slice(0, 30).map((m, i) => ({ ...emptyMatch(i + 1), ...m, slot: i + 1 }))
    while (archive.matchesByCategory[category].length < 30) {
      archive.matchesByCategory[category].push(emptyMatch(archive.matchesByCategory[category].length + 1))
    }
  })
  return archive
}

export const upper = value => String(value ?? '').toUpperCase()
export const uid = () => safeId('id')

export const makeAuditEntry = (action, details = '') => ({
  id: safeId('audit'), action: upper(action), details: upper(details), at: new Date().toISOString()
})

export function readLegacyArchive() {
  try {
    const sessions = JSON.parse(localStorage.getItem('trainingVaultSessions_v1') || '[]')
    const exercises = JSON.parse(localStorage.getItem('trainingVaultExercises_v2') || localStorage.getItem('trainingVaultExercises_v1') || '[]')
    const documents = JSON.parse(localStorage.getItem('acqDocumentLibraries_v1') || 'null')
    const matchesByCategory = JSON.parse(localStorage.getItem('acqSeasonMatches_v2') || localStorage.getItem('acqMatches_v1') || 'null')
    if (!sessions.length && !exercises.length && !documents && !matchesByCategory) return null
    return normalizeArchive({ sessions, exercises, documents, matchesByCategory })
  } catch (error) {
    console.error('Legacy migration error', error)
    return null
  }
}
