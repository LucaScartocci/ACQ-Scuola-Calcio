import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, CLOUD_STATE_ID } from './lib/supabase'
import {
  ADMIN_PASSWORD, CATEGORIES, COACHES, PHASES, emptyArchive, makeAuditEntry,
  normalizeArchive, readLegacyArchive, upper
} from './lib/archive'
import Login from './components/Login'
import SessionModal from './components/SessionModal'
import ExerciseModal from './components/ExerciseModal'
import Matches from './components/Matches'
import DocumentLibrary from './components/DocumentLibrary'
import Modal from './components/Modal'
import UserManagement from './components/UserManagement'
import AuditCenter from './components/AuditCenter'
import StatisticsDashboard from './components/StatisticsDashboard'
import NotificationCenter from './components/NotificationCenter'
import BackupCenter from './components/BackupCenter'
import SessionPdfPreview from './components/SessionPdfPreview'
import PlayerManager from './components/PlayerManager'
import AttendanceModal from './components/AttendanceModal'
import AttendanceStatistics from './components/AttendanceStatistics'
import SecretaryDashboard from './components/SecretaryDashboard'
import { removeCloudFile, uploadCloudFile } from './lib/storage'
import { generateSessionPdf } from './lib/sessionPdf'
import './styles.css'

const HISTORY_LIMIT = 100
const LOCAL_CACHE_KEY = 'acq-v24-cloud-cache'

export default function App() {
  const [auth, setAuth] = useState(undefined)
  const [archive, setArchive] = useState(emptyArchive)
  const [status, setStatus] = useState('CONNESSIONE…')
  const [hydrated, setHydrated] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [view, setView] = useState('sessions')
  const [search, setSearch] = useState('')
  const [coach, setCoach] = useState('')
  const [phase, setPhase] = useState('')
  const [rating, setRating] = useState('')
  const [sort, setSort] = useState('recent')
  const [sessionModal, setSessionModal] = useState(null)
  const [exerciseModal, setExerciseModal] = useState(null)
  const [documentModal, setDocumentModal] = useState(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toast, setToast] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [statisticsOpen, setStatisticsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationReadIds, setNotificationReadIds] = useState(new Set())
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [backupsOpen, setBackupsOpen] = useState(false)
  const [pdfBusySessionId, setPdfBusySessionId] = useState('')
  const [pdfPreview, setPdfPreview] = useState(null)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState(null)
  const [attendanceStatsOpen, setAttendanceStatsOpen] = useState(false)
  const saveTimer = useRef(null)
  const applyingRemote = useRef(false)
  const undoStack = useRef([])
  const redoStack = useRef([])
  const fileInput = useRef(null)
  const legacyArchive = useMemo(() => readLegacyArchive(), [])
  const loginAuditWritten = useRef('')
  const archiveRef = useRef(archive)
  const skipNextAutoSave = useRef(false)

  useEffect(() => {
    archiveRef.current = archive
  }, [archive])

  const showToast = useCallback(message => {
    setToast(message)
    window.clearTimeout(showToast.timer)
    showToast.timer = window.setTimeout(() => setToast(''), 2200)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setAuth(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuth(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const online = () => { setIsOnline(true); setStatus('CONNESSIONE RIPRISTINATA') }
    const offline = () => { setIsOnline(false); setStatus('MODALITÀ OFFLINE') }
    const beforeInstall = event => { event.preventDefault(); setInstallPrompt(event) }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) {
      showToast('SU IPAD/IPHONE: CONDIVIDI → AGGIUNGI ALLA SCHERMATA HOME')
      return
    }
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  const role = profile?.role || 'collaborator'
  const isDirector = role === 'director'
  const isCoordinator = role === 'coordinator'
  const isCoach = role === 'coach'
  const isCollaborator = role === 'collaborator'
  const isSecretary = role === 'secretary'
  const canWrite = Boolean(profile?.active) && !isCollaborator && !isSecretary
  const canDelete = Boolean(profile?.active) && isDirector
  const canManageUsers = Boolean(profile?.active) && isDirector
  const canRate = Boolean(profile?.active) && canWrite
  const assignedCategories = useMemo(() => {
    if (!profile) return []
    if (isDirector || isCoordinator || isSecretary) return CATEGORIES
    return Array.isArray(profile.categories) ? profile.categories : []
  }, [profile, isDirector, isCoordinator, isSecretary])
  const profileCoach = upper(profile?.coach_name || profile?.last_name || '')
  const visibleCategories = assignedCategories.length ? assignedCategories : (isDirector || isCoordinator || isSecretary ? CATEGORIES : [])

  async function loadProfile() {
    if (!auth?.user) return
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle()
    setProfileLoading(false)
    if (error) {
      console.error(error)
      setProfile(null)
      setStatus('PROFILO UTENTE NON DISPONIBILE')
      return
    }
    setProfile(data)
    if (data && data.active === false) {
      setStatus('ACCOUNT SOSPESO')
    }
  }

  useEffect(() => {
    if (auth?.user) loadProfile()
    else setProfile(null)
  }, [auth?.user?.id])

  const unreadNotifications = useMemo(
    () => notifications.filter(item => !notificationReadIds.has(item.id)).length,
    [notifications, notificationReadIds]
  )

  const loadNotifications = useCallback(async () => {
    if (!auth?.user || !profile) return
    setNotificationsLoading(true)

    const [{ data: notificationData, error: notificationError }, { data: readData, error: readError }] =
      await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', auth.user.id),
      ])

    if (notificationError) {
      console.error('NOTIFICATIONS LOAD ERROR', notificationError)
      setNotifications([])
    } else {
      setNotifications(notificationData || [])
    }

    if (readError) {
      console.error('NOTIFICATION READS LOAD ERROR', readError)
    } else {
      setNotificationReadIds(new Set((readData || []).map(item => item.notification_id)))
    }

    setNotificationsLoading(false)
  }, [auth?.user?.id, profile])

  const markNotificationRead = useCallback(async notificationId => {
    if (!auth?.user || !notificationId) return

    setNotificationReadIds(current => {
      const next = new Set(current)
      next.add(notificationId)
      return next
    })

    const { error } = await supabase.from('notification_reads').upsert(
      {
        notification_id: notificationId,
        user_id: auth.user.id,
        read_at: new Date().toISOString(),
      },
      { onConflict:'notification_id,user_id' }
    )

    if (error) {
      console.error('MARK NOTIFICATION READ ERROR', error)
      loadNotifications()
    }
  }, [auth?.user?.id, loadNotifications])

  const markAllNotificationsRead = useCallback(async () => {
    if (!auth?.user) return
    const unread = notifications.filter(item => !notificationReadIds.has(item.id))
    if (!unread.length) return

    setNotificationReadIds(new Set(notifications.map(item => item.id)))

    const rows = unread.map(item => ({
      notification_id: item.id,
      user_id: auth.user.id,
      read_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict:'notification_id,user_id' })

    if (error) {
      console.error('MARK ALL NOTIFICATIONS READ ERROR', error)
      loadNotifications()
    }
  }, [auth?.user?.id, notifications, notificationReadIds, loadNotifications])

  useEffect(() => {
    if (!auth?.user || !profile) return

    loadNotifications()

    const channel = supabase
      .channel(`acq-notifications-${auth.user.id}`)
      .on(
        'postgres_changes',
        { event:'INSERT', schema:'public', table:'notifications' },
        payload => {
          if (!payload.new) return
          setNotifications(current => {
            if (current.some(item => item.id === payload.new.id)) return current
            return [payload.new, ...current].slice(0,300)
          })
          showToast('NUOVA NOTIFICA')
        }
      )
      .on(
        'postgres_changes',
        {
          event:'INSERT',
          schema:'public',
          table:'notification_reads',
          filter:`user_id=eq.${auth.user.id}`,
        },
        payload => {
          if (!payload.new?.notification_id) return
          setNotificationReadIds(current => {
            const next = new Set(current)
            next.add(payload.new.notification_id)
            return next
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [auth?.user?.id, profile?.id, loadNotifications, showToast])

  useEffect(() => {
    if (!auth) return
    let channel
    async function start() {
      setHydrated(false)
      setStatus(navigator.onLine ? 'CARICAMENTO CLOUD…' : 'MODALITÀ OFFLINE')
      try {
        if (!navigator.onLine) throw new Error('offline')
        const { data, error } = await supabase.from('app_state').select('data').eq('id', CLOUD_STATE_ID).maybeSingle()
        if (error) throw error
        const cloud = data?.data && Object.keys(data.data).length ? normalizeArchive(data.data) : emptyArchive()
        applyingRemote.current = true
        setArchive(cloud)
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cloud))
        undoStack.current = []
        redoStack.current = []
        applyingRemote.current = false
        setHydrated(true)
        setStatus('ARCHIVIO SINCRONIZZATO')
      } catch (error) {
        console.error(error)
        const cached = localStorage.getItem(LOCAL_CACHE_KEY)
        applyingRemote.current = true
        setArchive(cached ? normalizeArchive(JSON.parse(cached)) : emptyArchive())
        applyingRemote.current = false
        setHydrated(true)
        setStatus(cached ? 'MODALITÀ OFFLINE · COPIA LOCALE' : 'ERRORE CLOUD')
      }

      channel = supabase.channel('acq-v24').on('postgres_changes',{event:'*',schema:'public',table:'app_state',filter:`id=eq.${CLOUD_STATE_ID}`}, payload => {
        if (!payload.new || !payload.new.data || applyingRemote.current) return
        const next = normalizeArchive(payload.new.data)
        setArchive(current => {
          const currentTime = Date.parse(current.updatedAt || '') || 0
          const nextTime = Date.parse(next.updatedAt || '') || 0
          if (currentTime && nextTime && nextTime <= currentTime) return current
          archiveRef.current = next
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(next))
          return next
        })
        setStatus('AGGIORNATO DA ALTRO DISPOSITIVO')
        window.setTimeout(() => setStatus('ARCHIVIO SINCRONIZZATO'), 1800)
      }).subscribe()
    }
    start()
    return () => { if(channel) supabase.removeChannel(channel) }
  }, [auth])

  useEffect(() => {
    if (!auth || !hydrated || applyingRemote.current || !canWrite) return
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false
      return
    }
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(archive))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setStatus('MODALITÀ OFFLINE · MODIFICHE IN ATTESA')
        return
      }
      setStatus('SALVATAGGIO…')
      const data = { ...archive, updatedAt: new Date().toISOString() }
      const { error } = await supabase.from('app_state').upsert({ id:CLOUD_STATE_ID, data, updated_at:new Date().toISOString(), updated_by:auth.user.email },{onConflict:'id'})
      setStatus(error ? 'ERRORE SALVATAGGIO' : 'ARCHIVIO SINCRONIZZATO')
      if(error) console.error(error)
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [archive, auth, hydrated, canWrite])

  useEffect(() => {
    if (!auth || !hydrated || !isOnline) return
    const timer = window.setTimeout(() => setArchive(current => ({...current})), 250)
    return () => window.clearTimeout(timer)
  }, [isOnline, auth, hydrated])

  const writeAuditLog = useCallback(async (action, details = '', context = {}) => {
    if (!auth?.user || !profile) return
    const payload = {
      action: upper(action || 'OPERAZIONE'),
      details: upper(details || ''),
      category: upper(context.category || ''),
      object_type: upper(context.objectType || ''),
      object_id: String(context.objectId || ''),
      user_id: auth.user.id,
      user_email: auth.user.email || '',
      user_name: upper([profile.first_name,profile.last_name].filter(Boolean).join(' ') || auth.user.email || ''),
      user_role: profile.role || '',
      device: upper([
        navigator.platform || '',
        /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'IOS' : '',
        window.matchMedia('(display-mode: standalone)').matches ? 'APP' : 'BROWSER'
      ].filter(Boolean).join(' · ')),
      metadata: context.metadata || {},
      created_at: new Date().toISOString(),
    }

    if (!navigator.onLine) return

    const { error } = await supabase.from('audit_logs').insert(payload)
    if (error) console.error('AUDIT LOG ERROR', error)
  }, [auth, profile])

  useEffect(() => {
    if (!auth?.user || !profile || loginAuditWritten.current === auth.user.id) return
    loginAuditWritten.current = auth.user.id
    writeAuditLog('ACCESSO', 'ACCESSO AL GESTIONALE', {
      objectType:'SESSIONE UTENTE',
      objectId:auth.user.id,
      metadata:{ role:profile.role }
    })
  }, [auth?.user?.id, profile, writeAuditLog])

  const commit = useCallback((updater, action = 'MODIFICA ARCHIVIO', details = '', context = {}) => {
    setArchive(previous => {
      const nextRaw = typeof updater === 'function' ? updater(previous) : updater
      const next = normalizeArchive({
        ...nextRaw,
        audit: [...(nextRaw.audit || []), makeAuditEntry(action, details, profile || { email: auth?.user?.email })].slice(-200),
        updatedAt: new Date().toISOString(),
      })
      if (JSON.stringify(previous) === JSON.stringify(next)) return previous
      undoStack.current.push(previous)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      redoStack.current = []
      return next
    })
    writeAuditLog(action, details, context)
  }, [profile, auth, writeAuditLog])

  const undo = useCallback(() => {
    if (!undoStack.current.length) { showToast('NESSUNA OPERAZIONE DA ANNULLARE'); return }
    setArchive(current => {
      redoStack.current.push(current)
      const previous = undoStack.current.pop()
      showToast('OPERAZIONE ANNULLATA · ⌘Z')
      writeAuditLog('ANNULLA OPERAZIONE','RIPRISTINO STATO PRECEDENTE')
      return previous
    })
  }, [showToast, writeAuditLog])

  const redo = useCallback(() => {
    if (!redoStack.current.length) { showToast('NESSUNA OPERAZIONE DA RIPRISTINARE'); return }
    setArchive(current => {
      undoStack.current.push(current)
      const next = redoStack.current.pop()
      showToast('OPERAZIONE RIPRISTINATA · ⇧⌘Z')
      writeAuditLog('RIPRISTINA OPERAZIONE','RIPRISTINO STATO SUCCESSIVO')
      return next
    })
  }, [showToast, writeAuditLog])

  useEffect(() => {
    const handler = event => {
      const target = event.target
      const editing = Boolean(target && ((target.matches && target.matches('input,textarea,select')) || target.isContentEditable))
      if (editing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      event.shiftKey ? redo() : undo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const sessionById = useMemo(() => new Map(archive.sessions.map(s => [s.id, s])), [archive.sessions])
  const categorySessions = useMemo(() => archive.sessions.filter(s =>
    visibleCategories.includes(s.category)
    && (!selectedCategory || s.category === selectedCategory)
    && (!coach || s.coach === coach)
    && (!isCoach || !profileCoach || s.coach === profileCoach)
  ), [archive.sessions, selectedCategory, coach, visibleCategories, isCoach, profileCoach])
  const filteredExercises = useMemo(() => {
    let list = archive.exercises.filter(e => {
      const linkedSession = sessionById.get(e.sessionId)
      return visibleCategories.includes(e.category)
        && (!selectedCategory || e.category === selectedCategory)
        && (!coach || linkedSession?.coach === coach)
        && (!isCoach || !profileCoach || linkedSession?.coach === profileCoach)
        && (!phase || e.phase === phase)
        && (!rating || Number(e.rating) === Number(rating))
    })
    const q = upper(search)
    if(q) list = list.filter(e => {
      const linkedSession = sessionById.get(e.sessionId)
      return upper([e.title,e.objective,e.description,e.equipment,linkedSession?.coach,linkedSession?.objective].join(' ')).includes(q)
    })
    if(sort==='az') list.sort((a,b)=>a.title.localeCompare(b.title,'it'))
    if(sort==='players') list.sort((a,b)=>(b.players||0)-(a.players||0))
    if(sort==='recent') list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
    return list
  },[archive.exercises,selectedCategory,coach,phase,rating,search,sort,sessionById,visibleCategories,isCoach,profileCoach])
  const visibleSessions = categorySessions.filter(s => !search || upper([s.coach,s.objective].join(' ')).includes(upper(search)) || filteredExercises.some(e=>e.sessionId===s.id))

  useEffect(() => {
    if (view === 'matches' && !selectedCategory) setView('sessions')
  }, [selectedCategory, view])

  function resetFilters() {
    setSearch('')
    setCoach('')
    setSelectedCategory('')
    setPhase('')
    setRating('')
    setSort('recent')
    setView('sessions')
  }

  function authorize(message = 'INSERISCI LA PASSWORD:') {
    const password = window.prompt(message)
    if (password === null) return false
    if (password !== ADMIN_PASSWORD) { window.alert('PASSWORD ERRATA. OPERAZIONE ANNULLATA.'); return false }
    return true
  }

  async function persistArchiveImmediately(nextArchive, successMessage = 'ARCHIVIO SINCRONIZZATO', offlineMessage = 'MODIFICA SALVATA IN LOCALE') {
    const normalized = normalizeArchive({ ...nextArchive, updatedAt: new Date().toISOString() })
    skipNextAutoSave.current = true
    applyingRemote.current = true
    archiveRef.current = normalized
    setArchive(normalized)
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalized))
    applyingRemote.current = false

    if (!navigator.onLine) {
      setStatus('MODALITÀ OFFLINE · MODIFICHE IN ATTESA')
      showToast(offlineMessage)
      return normalized
    }

    setStatus('SALVATAGGIO CLOUD…')
    const { error } = await supabase.from('app_state').upsert({
      id: CLOUD_STATE_ID,
      data: normalized,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.email,
    }, { onConflict: 'id' })

    if (error) {
      console.error('Immediate archive save error', error)
      setStatus('ERRORE SALVATAGGIO CLOUD')
      throw error
    }

    setStatus(successMessage)
    return normalized
  }

  async function restoreArchiveFromBackup(nextArchive, backupItem) {
    if (!canDelete) throw new Error('PERMESSO NEGATO')

    const currentSnapshot = normalizeArchive({...archive,updatedAt:new Date().toISOString()})
    const currentJson = JSON.stringify(currentSnapshot)
    const { error: preBackupError } = await supabase.from('archive_backups').insert({
      backup_type:'pre_restore',
      label:`PRIMA DEL RIPRISTINO · ${new Date().toLocaleString('it-IT')}`,
      archive_data:currentSnapshot,
      archive_size:new Blob([currentJson]).size,
      created_by:auth.user.id,
      created_by_email:auth.user.email || '',
      created_by_name:upper([profile.first_name,profile.last_name].filter(Boolean).join(' ') || auth.user.email || ''),
      created_at:new Date().toISOString(),
    })
    if (preBackupError) throw new Error('IMPOSSIBILE CREARE IL BACKUP DI SICUREZZA')

    const normalized = normalizeArchive(nextArchive)
    await persistArchiveImmediately(normalized, 'ARCHIVIO RIPRISTINATO')
    await writeAuditLog('RIPRISTINA BACKUP', backupItem?.label || 'BACKUP ARCHIVIO', {
      objectType:'BACKUP',
      objectId:String(backupItem?.id || ''),
      metadata:{backupCreatedAt:backupItem?.created_at || ''}
    })
    showToast('ARCHIVIO RIPRISTINATO')
  }

  async function openSessionPdf(session) {
    const sessionExercises = archive.exercises.filter(
      exercise => String(exercise.sessionId) === String(session.id)
    )
    setPdfBusySessionId(session.id)

    try {
      const result = await generateSessionPdf({
        session,
        exercises:sessionExercises,
        players:archive.players || [],
        presentIds:archive.attendanceBySession?.[session.id]?.presentIds || [],
        logoUrl:`${window.location.origin}${import.meta.env.BASE_URL}logo-acquacetosa.png`,
        appUrl:`${window.location.origin}${window.location.pathname}`,
      })

      const url = URL.createObjectURL(result.blob)
      setPdfPreview({
        ...result,
        url,
        sessionId:session.id,
      })

      await writeAuditLog('APRI PDF SEDUTA', result.filename, {
        objectType:'SESSIONE',
        objectId:session.id,
        category:session.category,
        metadata:{pages:result.pages,exercises:result.exercises}
      })

      showToast('ANTEPRIMA PDF PRONTA')
    } catch (error) {
      console.error('PDF SESSION ERROR', error)
      window.alert('GENERAZIONE PDF NON RIUSCITA: ' + (error.message || 'ERRORE SCONOSCIUTO'))
    } finally {
      setPdfBusySessionId('')
    }
  }

  function openNewExercise(session) {
    if (!session || !session.id) {
      showToast('SESSIONE NON ANCORA DISPONIBILE. ATTENDI UN ISTANTE E RIPROVA.')
      return
    }
    setExerciseModal({ session: { ...session } })
  }

  function savePlayerDocuments(playerId, documents, action, details) {
    if (!isDirector && !isSecretary) {
      window.alert('PERMESSO NEGATO.')
      return
    }
    const player=archive.players.find(item=>item.id===playerId)
    commit(
      current=>({...current,playerDocuments:{...(current.playerDocuments||{}),[playerId]:documents}}),
      action,
      details,
      {objectType:'DOCUMENTO TESSERATO',objectId:playerId,category:player?.category||''}
    )
    showToast('DOCUMENTI TESSERATO AGGIORNATI')
  }

  function savePlayer(item) {
    if (!isDirector && !isSecretary) {
      window.alert('SOLO DIRETTORE E SEGRETARIO POSSONO GESTIRE I TESSERATI.')
      return
    }
    const exists = archive.players.some(player => player.id === item.id)
    commit(
      current => ({
        ...current,
        players: exists
          ? current.players.map(player => player.id === item.id ? item : player)
          : [...current.players, item]
      }),
      exists ? 'MODIFICA TESSERATO' : 'CREA TESSERATO',
      `${item.lastName} ${item.firstName}`,
      {objectType:'TESSERATO',objectId:item.id,category:item.category}
    )
    showToast(exists ? 'TESSERATO AGGIORNATO' : 'TESSERATO INSERITO')
  }

  function saveAttendance(session, presentIds) {
    if (!canWrite && !isSecretary) {
      window.alert('IL TUO RUOLO NON CONSENTE DI REGISTRARE LE PRESENZE.')
      return
    }
    commit(
      current => ({
        ...current,
        attendanceBySession:{
          ...current.attendanceBySession,
          [session.id]:{
            sessionId:session.id,
            category:session.category,
            presentIds,
            updatedAt:new Date().toISOString(),
            updatedBy:upper([profile.first_name,profile.last_name].filter(Boolean).join(' ') || auth.user.email)
          }
        }
      }),
      'SALVA PRESENZE',
      `${session.category} · ${presentIds.length} PRESENTI`,
      {objectType:'PRESENZE',objectId:session.id,category:session.category,metadata:{presentCount:presentIds.length}}
    )
    setAttendanceSession(null)
    showToast('PRESENZE SALVATE')
  }

  async function saveSession(item) {
    if (!canWrite) {
      window.alert('IL TUO RUOLO NON CONSENTE DI SALVARE SESSIONI.')
      throw new Error('PERMESSO NEGATO')
    }
    if (!visibleCategories.includes(item.category)) {
      window.alert('CATEGORIA NON AUTORIZZATA.')
      throw new Error('CATEGORIA NON AUTORIZZATA')
    }
    if (isCoach && profileCoach && upper(item.coach) !== profileCoach) {
      window.alert('PUOI CREARE SESSIONI SOLTANTO PER IL TUO PROFILO ALLENATORE.')
      throw new Error('ALLENATORE NON AUTORIZZATO')
    }

    const currentArchive = archiveRef.current
    const exists = currentArchive.sessions.some(session => String(session.id) === String(item.id))
    const cleanItem = {
      ...item,
      id:String(item.id),
      coach:upper(item.coach),
      category:upper(item.category),
      date:String(item.date || ''),
      duration:Number(item.duration) || 90,
      players:Number(item.players) || 16,
      field:upper(item.field || ''),
      objective:upper(item.objective || ''),
      staffNotes:upper(item.staffNotes || ''),
      createdAt:Number(item.createdAt) || Date.now(),
    }

    const sessions = exists
      ? currentArchive.sessions.map(session => String(session.id) === String(cleanItem.id) ? cleanItem : session)
      : [...currentArchive.sessions, cleanItem]

    const nextArchive = normalizeArchive({
      ...currentArchive,
      sessions,
      audit:[
        ...(currentArchive.audit || []),
        makeAuditEntry(
          exists ? 'MODIFICA SESSIONE' : 'CREA SESSIONE',
          cleanItem.coach,
          profile || {email:auth?.user?.email}
        )
      ].slice(-200),
      updatedAt:new Date().toISOString(),
    })

    if (!exists) {
      undoStack.current.push(currentArchive)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      redoStack.current = []
    }

    await persistArchiveImmediately(
      nextArchive,
      exists ? 'SESSIONE MODIFICATA' : 'SESSIONE CREATA',
      exists ? 'SESSIONE MODIFICATA IN LOCALE' : 'SESSIONE CREATA IN LOCALE'
    )

    await writeAuditLog(
      exists ? 'MODIFICA SESSIONE' : 'CREA SESSIONE',
      cleanItem.coach,
      {
        objectType:'SESSIONE',
        objectId:cleanItem.id,
        category:cleanItem.category,
      }
    )

    setSelectedCategory(cleanItem.category)
    setView('sessions')
    setSearch('')
    setCoach('')
    setPhase('')
    setRating('')
    setSessionModal(null)
    showToast(exists ? 'SESSIONE MODIFICATA' : `SESSIONE CREATA · ${cleanItem.category}`)
  }

  function deleteSession(id) {
    if (!canDelete) { window.alert('SOLO IL DIRETTORE PUÒ ELIMINARE LE SESSIONI.'); return }
    const session = archive.sessions.find(s => s.id === id)
    const count = archive.exercises.filter(e => e.sessionId === id).length
    if(!confirm(`ELIMINARE LA SESSIONE E LE ${count} ESERCITAZIONI AL SUO INTERNO?`)) return
    commit(a=>{
      const attendanceBySession={...a.attendanceBySession}
      delete attendanceBySession[id]
      return {...a,sessions:a.sessions.filter(s=>s.id!==id),exercises:a.exercises.filter(e=>e.sessionId!==id),attendanceBySession}
    }, 'ELIMINA SESSIONE', session?.coach, { objectType:'SESSIONE', objectId:id, category:session?.category, metadata:{exerciseCount:count} })
  }

  async function saveExercise(item, initial) {
    if (!canWrite) { window.alert('IL TUO RUOLO NON CONSENTE DI SALVARE ESERCITAZIONI.'); throw new Error('PERMESSO NEGATO') }
    const linkedSession = archive.sessions.find(session => String(session.id) === String(item.sessionId))
    if (!linkedSession) {
      window.alert('LA SESSIONE COLLEGATA NON È STATA TROVATA. CHIUDI LA FINESTRA, RICARICA LA PAGINA E RIPROVA.')
      throw new Error('SESSIONE COLLEGATA NON TROVATA')
    }

    const previous = archive.exercises.find(exercise => String(exercise.id) === String(item.id))
    const ratingChanged = Number(item.rating || 0) !== Number((previous && previous.rating) || 0)
    if (ratingChanged && Number(item.rating || 0) > 0 && !canRate) {
      window.alert('IL TUO RUOLO NON CONSENTE DI MODIFICARE LA VALUTAZIONE.')
      throw new Error('VALUTAZIONE NON AUTORIZZATA')
    }
    if (ratingChanged && Number(item.rating || 0) > 0 && !authorize('PASSWORD PER SALVARE LA VALUTAZIONE:')) {
      throw new Error('VALUTAZIONE NON AUTORIZZATA')
    }

    let image = item.image || (previous && previous.image) || ''
    let imagePath = item.imagePath || (previous && previous.imagePath) || ''

    if (item.removeImage && imagePath) {
      await removeCloudFile(imagePath)
      image = ''
      imagePath = ''
    }

    if (item.imageFile) {
      if (imagePath) await removeCloudFile(imagePath)
      const folderCategory = String(linkedSession.category || 'generale').toLowerCase().replace(/\s+/g, '-')
      const uploaded = await uploadCloudFile(item.imageFile, `esercitazioni/${folderCategory}`)
      image = uploaded.url
      imagePath = uploaded.storagePath
    }

    const clean = {
      ...item,
      sessionId: linkedSession.id,
      category: linkedSession.category,
      image,
      imagePath,
      title: upper(item.title),
      equipment: upper(item.equipment),
      objective: upper(item.objective),
      description: upper(item.description),
      createdAt: Number(item.createdAt) || Date.now(),
    }
    delete clean.imageFile
    delete clean.removeImage

    const exists = Boolean(previous)
    const nextExercises = exists
      ? archive.exercises.map(exercise => String(exercise.id) === String(clean.id) ? clean : exercise)
      : [...archive.exercises, clean]

    const nextArchive = normalizeArchive({
      ...archive,
      exercises: nextExercises,
      audit: [...(archive.audit || []), makeAuditEntry(exists ? 'MODIFICA ESERCITAZIONE' : 'CREA ESERCITAZIONE', clean.title, profile || { email: auth?.user?.email })].slice(-200),
      updatedAt: new Date().toISOString(),
    })

    undoStack.current.push(archive)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []

    await persistArchiveImmediately(nextArchive)
    await writeAuditLog(
      exists ? 'MODIFICA ESERCITAZIONE' : 'CREA ESERCITAZIONE',
      clean.title,
      { objectType:'ESERCITAZIONE', objectId:clean.id, category:clean.category, metadata:{sessionId:clean.sessionId} }
    )
    setExerciseModal(null)
    showToast(exists ? 'ESERCITAZIONE MODIFICATA' : 'ESERCITAZIONE CREATA')
  }

  async function deleteExercise(id) {
    if (!canDelete) { window.alert('SOLO IL DIRETTORE PUÒ ELIMINARE LE ESERCITAZIONI.'); return }
    const item = archive.exercises.find(e => e.id === id)
    if(!confirm('ELIMINARE QUESTA ESERCITAZIONE?')) return
    try { if(item?.imagePath) await removeCloudFile(item.imagePath) } catch(error){ console.error(error) }
    commit(a=>({...a,exercises:a.exercises.filter(e=>e.id!==id)}), 'ELIMINA ESERCITAZIONE', item?.title, { objectType:'ESERCITAZIONE', objectId:id, category:item?.category })
  }

  function addDocuments(type, items){
    if (!canWrite) { window.alert('IL TUO RUOLO È IN SOLA LETTURA.'); return }
    commit(a=>({...a,documents:{...a.documents,[type]:[...(a.documents[type]||[]),...items]}}),'CARICA DOCUMENTI',type, { objectType:'DOCUMENTO', metadata:{count:items.length,type} })
  }

  async function deleteDocument(type,item){
    if (!canDelete) { window.alert('SOLO IL DIRETTORE PUÒ ELIMINARE DOCUMENTI.'); return }
    if(!authorize('PASSWORD PER ELIMINARE IL FILE:')) return
    try{ if(item.storagePath) await removeCloudFile(item.storagePath) }catch(error){console.error(error);alert('FILE RIMOSSO DALL’ARCHIVIO, MA NON DALLO STORAGE.')}
    commit(a=>({...a,documents:{...a.documents,[type]:(a.documents[type]||[]).filter(x=>x.id!==item.id)}}),'ELIMINA DOCUMENTO',item.title, { objectType:'DOCUMENTO', objectId:item.id, metadata:{type} })
  }

  function exportArchive() {
    const payload = JSON.stringify({ ...archive, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ACQ_ARCHIVIO_${new Date().toISOString().slice(0,10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    showToast('BACKUP ESPORTATO')
    writeAuditLog('ESPORTA BACKUP','ARCHIVIO JSON ESPORTATO',{objectType:'BACKUP'})
  }

  async function importArchive(file) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const next = normalizeArchive(parsed)
      if (!confirm(`IMPORTARE ${next.sessions.length} SESSIONI E ${next.exercises.length} ESERCITAZIONI? L'OPERAZIONE È ANNULLABILE CON ⌘Z.`)) return
      if (!authorize('PASSWORD PER IMPORTARE IL BACKUP:')) return
      commit(next, 'IMPORTA ARCHIVIO', file.name)
      showToast('ARCHIVIO IMPORTATO')
    } catch (error) {
      console.error(error)
      alert('FILE NON VALIDO O DANNEGGIATO.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function migrateLegacy() {
    if (!legacyArchive) return
    if (!confirm(`MIGRARE ${legacyArchive.sessions.length} SESSIONI E ${legacyArchive.exercises.length} ESERCITAZIONI DALLA V23?`)) return
    if (!authorize('PASSWORD PER MIGRARE I DATI V23:')) return
    commit(legacyArchive, 'MIGRAZIONE V23', 'LOCALSTORAGE')
    showToast('DATI V23 MIGRATI NEL CLOUD')
  }

  useEffect(() => {
    if (!hydrated || !profile) return

    const openFromHash = () => {
      const match = window.location.hash.match(/^#exercise=(.+)$/)
      if (!match) return
      const exerciseId = decodeURIComponent(match[1])
      const exercise = archive.exercises.find(item => String(item.id) === String(exerciseId))
      if (!exercise) return
      const session = archive.sessions.find(item => String(item.id) === String(exercise.sessionId))
      if (!session) return
      setExerciseModal({session,initial:exercise})
    }

    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [hydrated, profile, archive.sessions, archive.exercises])

  if(auth===undefined) return <div className="loading">CARICAMENTO…</div>
  if(!auth) return <Login />
  if(profileLoading || !profile) return <div className="loading">CARICAMENTO PROFILO UTENTE…</div>
  if(profile.active === false) return <div className="fatal-error"><h1>ACCOUNT SOSPESO</h1><p>CONTATTA IL DIRETTORE TECNICO.</p><button onClick={()=>supabase.auth.signOut()}>ESCI</button></div>

  if (isSecretary) return <SecretaryDashboard
    archive={archive}
    profile={profile}
    status={status}
    isOnline={isOnline}
    onSignOut={()=>supabase.auth.signOut()}
    onSavePlayerDocuments={savePlayerDocuments}
    onSaveAttendance={saveAttendance}
  />

  return <div className="app-shell">
    <header className="hero">
      <div>
        <small>ARCHIVIO METODOLOGICO ACQUACETOSA</small>
        <h1>SCUOLA CALCIO<br/>ACQUACETOSA</h1>
      </div>
      <div className="hero-brand-block">
        <div className="hero-season">2026/27</div>
        <img src={`${import.meta.env.BASE_URL}logo-acquacetosa.png`} alt="Acquacetosa"/>
        <button className="hero-exit" onClick={()=>supabase.auth.signOut()}>ESCI</button>
      </div>
      <nav>
        {canWrite && <button onClick={()=>setSessionModal({})}>＋ SESSIONE ALLENAMENTO</button>}
        <button onClick={()=>setDocumentModal('meetings')}>RIUNIONI TECNICHE</button>
        <button onClick={()=>setDocumentModal('teaching')}>MATERIALE DIDATTICO</button>

        <button className="glass notification-trigger" onClick={()=>setNotificationsOpen(true)}>
          NOTIFICHE
          {unreadNotifications > 0 && <span>{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
        </button>

        <button className="glass" onClick={()=>setStatisticsOpen(true)}>STATISTICHE</button>
        <button className="glass attendance-main-button" onClick={()=>setAttendanceStatsOpen(true)}>PRESENZE</button>
        <button className="glass" onClick={installApp}>INSTALLA APP</button>

        {isDirector && <button className="glass admin-button" onClick={()=>setPlayersOpen(true)}>TESSERATI</button>}
        {isDirector && <button className="glass admin-button" onClick={()=>setBackupsOpen(true)}>BACKUP</button>}
        {isDirector && <button className="glass admin-button" onClick={()=>setUsersOpen(true)}>UTENTI</button>}
      </nav>
    </header>
    <section className="profile-bar">
      <div className="profile-avatar">{(profile.first_name?.[0] || auth.user.email?.[0] || 'U')}{profile.last_name?.[0] || ''}</div>
      <div><b>{upper([profile.first_name,profile.last_name].filter(Boolean).join(' ') || auth.user.email)}</b><span>{upper(profile.role)}{profile.coach_name ? ` · ${profile.coach_name}` : ''}</span></div>
      <div className="profile-categories">{visibleCategories.map(category=><span key={category}>{category}</span>)}</div>
    </section>
    <section className="filters"><input placeholder="CERCA PER TITOLO, OBIETTIVO O PAROLA CHIAVE…" value={search} onChange={e=>setSearch(e.target.value)}/><select value={coach} onChange={e=>setCoach(e.target.value)}><option value="">ALLENATORI</option>{COACHES.map(v=><option key={v}>{v}</option>)}</select><select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}><option value="">CATEGORIE</option>{visibleCategories.map(v=><option key={v}>{v}</option>)}</select><select value={rating} onChange={e=>setRating(e.target.value)}><option value="">VALUTAZIONI</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} STELLE</option>)}</select><select value={phase} onChange={e=>setPhase(e.target.value)}><option value="">FASE ALLENAMENTO</option>{PHASES.map(v=><option key={v}>{v}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">PIÙ RECENTI</option><option value="az">A-Z</option><option value="players">N° GIOCATORI</option></select><button className="reset-filters" onClick={resetFilters}>AZZERA FILTRI</button></section>
    <section className="category-strip"><button className={!selectedCategory?'active':''} onClick={()=>setSelectedCategory('')}><span>▦</span><b>ARCHIVIO COMPLETO</b><small>{archive.sessions.length}SS / {archive.exercises.length}ES</small></button>{visibleCategories.map(c=>{const ss=archive.sessions.filter(s=>s.category===c).length,es=archive.exercises.filter(e=>e.category===c).length;return <button key={c} className={selectedCategory===c?'active':''} onClick={()=>setSelectedCategory(c)}><span>⚽</span><b>{c}</b><small>{ss}SS / {es}ES</small></button>})}</section>
    <nav className="view-tabs"><button className={view==='sessions'?'active':''} onClick={()=>setView('sessions')}>SESSIONI ALLENAMENTO</button><button className={view==='library'?'active':''} onClick={()=>setView('library')}>LIBRERIA ESERCITAZIONI</button>{selectedCategory&&<button className={view==='matches'?'active':''} onClick={()=>setView('matches')}>PARTITE</button>}</nav>
    {view==='sessions' && <main>{!visibleSessions.length && <EmptyState title="NESSUNA SESSIONE TROVATA" text="MODIFICA I FILTRI O CREA UNA NUOVA SESSIONE."/>}{visibleSessions.map(s=><section className="session-card" key={s.id}><header><div><small>ALLENATORE</small><h2>{s.coach}</h2><p>{s.category} · {s.date} · {archive.exercises.filter(e=>e.sessionId===s.id).length} ESERCITAZIONI · {s.duration}' · {(archive.attendanceBySession[s.id]?.presentIds||[]).length} PRESENTI</p></div><div>
  <button className="pdf-session-button" onClick={()=>openSessionPdf(s)} disabled={pdfBusySessionId===s.id}>
    {pdfBusySessionId===s.id ? 'APERTURA…' : 'APRI'}
  </button>
  {canWrite && <button onClick={()=>openNewExercise(s)}>＋ ESERCITAZIONE</button>}
  {canWrite && <button className="attendance-session-button" onClick={()=>setAttendanceSession(s)}>＋ PRESENZE</button>}
  {canWrite && <button className="soft" onClick={()=>setSessionModal(s)}>MODIFICA</button>}
  {canDelete && <button className="soft" onClick={()=>deleteSession(s.id)}>ELIMINA</button>}
</div></header><p className="objective"><b>OBIETTIVO:</b> {s.objective}</p><div className="exercise-grid">{filteredExercises.filter(e=>e.sessionId===s.id).map(e=><ExerciseCard e={e} key={e.id} canWrite={canWrite} canDelete={canDelete} onEdit={()=>setExerciseModal({session:s,initial:e})} onDelete={()=>deleteExercise(e.id)}/>)}</div></section>)}</main>}
    {view==='library' && <main><div className="section-title"><div><h2>LIBRERIA ESERCITAZIONI</h2><p>TUTTE LE ESERCITAZIONI DELL’ARCHIVIO.</p></div><b>{filteredExercises.length} ESERCITAZIONI</b></div>{!filteredExercises.length && <EmptyState title="NESSUNA ESERCITAZIONE TROVATA" text="MODIFICA I FILTRI O AGGIUNGI UNA ESERCITAZIONE."/>}<div className="exercise-grid library">{filteredExercises.map(e=>{const s=archive.sessions.find(x=>x.id===e.sessionId);return <ExerciseCard e={e} key={e.id} canWrite={canWrite} canDelete={canDelete} onEdit={()=>s&&setExerciseModal({session:s,initial:e})} onDelete={()=>deleteExercise(e.id)}/>})}</div></main>}
    {view==='matches' && selectedCategory && <main><Matches category={selectedCategory} matches={archive.matchesByCategory[selectedCategory]||[]} readOnly={!canWrite} onChange={items=>{if(!canWrite)return;commit(a=>({...a,matchesByCategory:{...a.matchesByCategory,[selectedCategory]:items}}),'MODIFICA PARTITE',selectedCategory, { objectType:'CALENDARIO PARTITE', category:selectedCategory })}}/></main>}
<div className={`cloud-pill ${isOnline ? "" : "offline"}`}>● {status}</div>
    {toast && <div className="action-toast">{toast}</div>}
    {auditOpen && <AuditCenter currentProfile={profile} localItems={archive.audit||[]} onClose={()=>setAuditOpen(false)}/>}
    {sessionModal && <SessionModal initial={sessionModal.id?sessionModal:null} allowedCategories={visibleCategories} fixedCoach={isCoach?profileCoach:''} canChooseCoach={!isCoach} onSave={saveSession} onClose={()=>setSessionModal(null)}/>} 
    {exerciseModal && <ExerciseModal session={exerciseModal.session} initial={exerciseModal.initial} onSave={saveExercise} onClose={()=>setExerciseModal(null)}/>} 
    {pdfPreview && <SessionPdfPreview pdf={pdfPreview} onClose={()=>setPdfPreview(null)}/>}
    {attendanceSession && <AttendanceModal session={attendanceSession} players={archive.players} attendance={archive.attendanceBySession[attendanceSession.id]} onSave={presentIds=>saveAttendance(attendanceSession,presentIds)} onClose={()=>setAttendanceSession(null)}/>}
    {attendanceStatsOpen && <AttendanceStatistics archive={archive} visibleCategories={visibleCategories} onClose={()=>setAttendanceStatsOpen(false)}/>}
    {playersOpen && <PlayerManager players={archive.players} onSave={savePlayer} onClose={()=>setPlayersOpen(false)}/>}
    {backupsOpen && <BackupCenter archive={archive} profile={profile} canRestore={canDelete} onRestore={restoreArchiveFromBackup} onClose={()=>setBackupsOpen(false)}/>}
    {notificationsOpen && <NotificationCenter
      profile={profile}
      notifications={notifications}
      readIds={notificationReadIds}
      loading={notificationsLoading}
      onMarkRead={markNotificationRead}
      onMarkAllRead={markAllNotificationsRead}
      onRefresh={loadNotifications}
      onClose={()=>setNotificationsOpen(false)}
    />}
    {statisticsOpen && <StatisticsDashboard archive={archive} visibleCategories={visibleCategories} profile={profile} onClose={()=>setStatisticsOpen(false)}/>} 
    {usersOpen && <UserManagement currentProfile={profile} onChanged={loadProfile} onClose={()=>setUsersOpen(false)}/>}
    {documentModal && <DocumentLibrary type={documentModal} items={archive.documents[documentModal]||[]} readOnly={!canWrite} onAdd={items=>addDocuments(documentModal,items)} onDelete={item=>deleteDocument(documentModal,item)} onClose={()=>setDocumentModal(null)}/>} 
  </div>
}

function ExerciseCard({e,onEdit,onDelete,canWrite,canDelete}){return <article className="exercise-card"><div className="exercise-cover" style={e.image?{backgroundImage:`linear-gradient(rgba(5,25,50,.28),rgba(5,25,50,.55)),url(${e.image})`}:{}}><div><span>{e.category}</span><span>{e.phase}</span></div><h3>{e.title}</h3></div><div className="exercise-body"><div className="stats"><div><small>GIOCATORI</small><b>{e.players}</b></div><div><small>DURATA</small><b>{e.duration}'</b></div><div><small>SPAZIO</small><b>{e.space||'—'}</b></div></div><div className="rating">{'★'.repeat(e.rating||0)}{'☆'.repeat(5-(e.rating||0))}</div><p>{e.objective}</p><footer>{canWrite && <button onClick={onEdit}>MODIFICA</button>}{canDelete && <button className="danger" onClick={onDelete}>ELIMINA</button>}</footer></div></article>}


function EmptyState({title,text}) {
  return <div className="app-empty"><b>{title}</b><span>{text}</span></div>
}

