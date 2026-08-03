export const COACHES = [
  'CAMMISOTTO','ERCOLANI','ERDI','GIORDANI','MORDENTI','MORTOLINI',
  'ODDI','POSTACCHINI','SCARTOCCI','TIANO','VENDITTI'
]
export const CATEGORIES = ['PICCOLI AMICI','PRIMI CALCI','PULCINI','ESORDIENTI']
export const PHASES = ['ATTIVAZIONE','PARTE CENTRALE','PARTITA A TEMA']
export const ARCHIVE_VERSION = 4
export const ADMIN_PASSWORD = 'vittoriout'

const safeId = prefix => {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID()
  } catch {}
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const emptyMatch = (slot) => ({
  id: safeId(`m-${slot}`), slot, opponent: '', logo: '', date: '', time: '',
  location: '', coach: '', callupPlayers: '', logoPath: '', competition: 'CAMPIONATO', meetingTime: '', meetingPlace: '', callupNotes: ''
})

export const emptyArchive = () => ({
  version: ARCHIVE_VERSION,
  sessions: [],
  exercises: [],
  matchesByCategory: Object.fromEntries(CATEGORIES.map(c => [c, Array.from({ length: 30 }, (_, i) => emptyMatch(i + 1))])),
  documents: { meetings: [], teaching: [] },
  players: [],
  attendanceBySession: {},
  audit: [],
  updatedAt: new Date().toISOString(),
})

const normalizeCategory = value => {
  const up = upper(value)
  return CATEGORIES.find(c => c === up) || up || CATEGORIES[0]
}


const normalizeDocument = item => ({
  ...item,
  id: item.id || safeId('document'),
  title: upper(item.title || item.name || ''),
  name: item.name || 'FILE',
  url: item.url || item.data || '',
  storagePath: item.storagePath || '',
  type: item.type || 'application/octet-stream',
  size: Number(item.size) || 0,
  createdAt: Number(item.createdAt || item.created) || Date.now(),
})

export const normalizeArchive = (value) => {
  const base = emptyArchive()
  if (!value || typeof value !== 'object') return base

  const rawSessions = Array.isArray(value.sessions) ? value.sessions : []
  const rawExercises = Array.isArray(value.exercises) ? value.exercises : []
  const rawDocuments = value.documents || value.documentLibraries || { meetings: [], teaching: [] }
  const rawPlayers = Array.isArray(value.players) ? value.players : []
  const rawAttendance = value.attendanceBySession && typeof value.attendanceBySession === 'object'
    ? value.attendanceBySession : {}

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
      meetings: Array.isArray(rawDocuments.meetings) ? rawDocuments.meetings.map(normalizeDocument) : [],
      teaching: Array.isArray(rawDocuments.teaching) ? rawDocuments.teaching.map(normalizeDocument) : [],
    },
    players: rawPlayers.map(player => ({
      ...player,
      id: player.id || safeId('player'),
      firstName: upper(player.firstName || player.name || ''),
      lastName: upper(player.lastName || player.surname || ''),
      category: normalizeCategory(player.category),
      shirtNumber: player.shirtNumber === '' || player.shirtNumber == null ? '' : Number(player.shirtNumber),
      active: player.active !== false,
      createdAt: Number(player.createdAt) || Date.now(),
    })),
    attendanceBySession: Object.fromEntries(
      Object.entries(rawAttendance).map(([sessionId, record]) => [
        sessionId,
        {
          sessionId,
          category: normalizeCategory(record?.category || ''),
          presentIds: Array.isArray(record?.presentIds) ? [...new Set(record.presentIds.map(String))] : [],
          updatedAt: record?.updatedAt || new Date().toISOString(),
          updatedBy: upper(record?.updatedBy || ''),
        }
      ])
    ),
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

export const makeAuditEntry = (action, details = '', actor = {}) => ({
  id: safeId('audit'),
  action: upper(action),
  details: upper(details),
  at: new Date().toISOString(),
  userId: actor.id || '',
  userEmail: actor.email || '',
  userName: upper([actor.first_name, actor.last_name].filter(Boolean).join(' ') || actor.email || ''),
  userRole: upper(actor.role || ''),
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
