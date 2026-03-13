import { useState, useRef, useEffect } from 'react'
import { useSubjects } from './hooks/useSubjects'
import { useCareers } from './hooks/Usecareers'
import { useCalendarEvents } from './hooks/Usecalendarevents'
import { useAuth } from './hooks/Useauth'
import { SubjectCard } from './components/SubjectCard'
import SubjectModal from './components/SubjectModal'
import { supabase } from '../supabase/Supabase'
import Calendar from './components/Calendar'
import UpcomingSidebar from './components/Upcomingsidebar'
import type { CalendarHandle } from './components/Calendar'
import AuthModal from './components/Authmodal'
import { DEFAULT_PREFERENCES } from '../supabase/Supabase'
import AppHeader from './components/Appheader'
import type { Subject, FilterKey } from './types/types'
import { FILTERS, STATUS_CONFIG } from './../src/assets/constants'
import './App.css'
import { Add, Book, Setting4 } from 'iconsax-react'
import { useToastSystem, toast, confirm } from './hooks/Usetoast'
import { ToastContainer, ConfirmDialog } from './components/Toast'
import Spotlight from './components/Spotlight'
import GpaModal from './components/Gpatracker'
import type { CareerConfig } from './hooks/Usecareers'
import { Loader, X } from 'lucide-react'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import KeyboardShortcutsModal from './components/Keyboardshortcutsmodal'
import QuickCorrModal from './components/Quickcorrmodal'
import CloseSemesterWizard from './components/CloseSemesterWizard'
import type { SubjectStatus } from './types/types'
import SiuImporter, { type SiuSubject } from './components/Siuimporter'
import Loading from './components/Loading'
import CloudDown from './Icon/CloudDown'
import * as XLSX from 'xlsx'
import ScheduleExport from './components/ScheduleExport'
import KanbanView from './components/Kanbanview'
import type { CalendarEvent } from './components/Eventmodal'
import AnalyticsModal from './components/Analyticsmodal'
import PinLocation from './Icon/PinLocation'
import MobileFAB from './components/Mobilefab'
import Onboarding from './components/Onboarding'

export function getEffectiveStatus(
  subject: Subject,
  _currentYear: number,
  _allSubjects: Subject[],
): Subject['status'] {
  return subject.status
}

export default function App() {
  const { user, profile, loading: authLoading, signIn, updatePassword,
    deleteAccount, signUp, signOut, updateProfile, signInWithMagicLink, signInWithOAuth, updatePreferences } = useAuth()

  const {
    careers,
    activeCareer,
    addCareer,
    deleteCareer,
    updateCareerConfig,
    setActiveCareer,
  } = useCareers(user?.id ?? null)

  const careerConfig: CareerConfig = activeCareer?.config ?? {
    totalSubjects: 0,
    totalYears: 5,
    extraSemesters: 0,
    currentYear: 1,
    currentSemester: 1,
    semesterDates: {
      s1: { start: '', end: '' },
      s2: { start: '', end: '' },
      annual: { start: '', end: '' },
    },
  }

  const { subjects, loading: subjectsLoading, addSubject, updateSubject, deleteSubject, cycleStatus, stats } = useSubjects(
    user?.id ?? null,
    activeCareer?.id ?? null,
    careerConfig.currentYear,
    careerConfig.currentSemester ?? 1,
  )
  const [showSiuImporter, setShowSiuImporter] = useState(false)
  const { calendarEvents, addEvent, removeEvent, updateEvent } = useCalendarEvents(
    user?.id ?? null,
    activeCareer?.id ?? null
  )
  const { toasts, remove: removeToast, confirmDialog, setConfirmDialog } = useToastSystem()
  const [showQuickCorr, setShowQuickCorr] = useState(false)
  const calRef = useRef<CalendarHandle>(null)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [showGpa, setShowGpa] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Subject | null | 'new'>(null)
  const [mobileUpcomingOpen, setMobileUpcomingOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showCloseSemester, setShowCloseSemester] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const progWrapRef = useRef<HTMLDivElement>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const [showScheduleExport, setShowScheduleExport] = useState(false)
  const [compactView, setCompactView] = useState(() => localStorage.getItem('compactView') === 'true')
  const [kanbanView, setKanbanView] = useState(() => localStorage.getItem('kanbanView') === 'true')
  const toggleCompact = () => setCompactView(v => { const next = !v; localStorage.setItem('compactView', String(next)); return next })
  const toggleKanban = () => setKanbanView(v => { const next = !v; localStorage.setItem('kanbanView', String(next)); return next })
  const [showOnboarding, setShowOnboarding] = useState(false)

  useKeyboardShortcuts([
    { key: 'f', ctrl: true, description: 'Buscar materia (Spotlight)', action: () => setSpotlightOpen(v => !v) },
    { key: 'm', ctrl: true, description: 'Nueva materia', action: () => setModal('new') },
    { key: 'y', ctrl: true, description: 'Abrir / cerrar calendario', action: () => setCalOpen(v => !v) },
    { key: 'i', ctrl: true, description: 'Mostrar / ocultar GPA', action: () => setShowGpa(v => !v) },
    { key: 'b', ctrl: true, description: 'Alternar vista compacta', action: () => toggleCompact() },
    { key: 'k', ctrl: true, description: 'Alternar vista Kanban', action: () => toggleKanban() },
    { key: 'a', shift: true, description: 'Ver atajos de teclado', action: () => setShowShortcuts(v => !v) },
    { key: 'n', ctrl: true, description: 'Abrir analítica', action: () => setShowAnalytics(v => !v) },
    { key: 'q', shift: true, description: 'Correlativas rápidas', action: () => setShowQuickCorr(v => !v) },
    { key: 'i', shift: true, description: 'Importar desde SIU', action: () => setShowSiuImporter(true) },
    { key: 'e', shift: true, description: 'Exportar materias', action: () => handleExport() },
    { key: 's', shift: true, description: 'Exportar horario', action: () => setShowScheduleExport(true) },
  ])

  const handleExport = () => {
    const rows = subjects.map(s => ({
      'Materia': s.name,
      'Código': s.code,
      'Año': s.year,
      'Periodo': s.term,
      'Estado': s.status,
      'Nota': s.gradeOverride ?? s.grade ?? '',
      'Nota final (examen)': s.gradeFinalExam ?? '',
      'Tipo': s.gradeFinalExam === null ? 'Promoción' : 'Examen',
      'Fecha aprobación': s.approvedDate || '',
      'Fecha final': s.finalDate || '',
      'Notas': s.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 40 }, { wch: 14 }, { wch: 6 }, { wch: 14 }, { wch: 14 },
      { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 30 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Materias')
    XLSX.writeFile(wb, `${(activeCareer?.name ?? 'carrera').replace(/\s+/g, '_')}_materias.xlsx`)
    toast(`${subjects.length} materias exportadas`, 'success')
  }

  const handleSiuImport = (siuSubjects: SiuSubject[]) => {
    siuSubjects.forEach(async (s) => {
      const exists = subjects.find(x => x.code === s.code)
      if (!exists) {
        await addSubject({
          name: s.name,
          code: s.code,
          year: s.year as Subject['year'],
          semester: s.semester === 1 ? 1 : s.semester === 2 ? 2 : 3,
          term: s.semester === 1 ? 'Q1' : 'Q2',
          status: 'approved',
          corrApproved: [],
          corrRegular: [],
          grade: s.grade,
          gradeP1: null,
          gradeP2: null,
          gradeFinalExam: s.gradeFinalExam,
          gradeOverride: null,
          approvedDate: s.approvedDate,
          finalDate: '',
          notes: '',
          examDates: [],
          schedules: [],
          notionPageId: null,
          notionPageTitle: null,
          notionPageUrl: null,
          gradeHistory: [],
          finalAttempts: 0,
        })
      }
    })
    toast(` ${siuSubjects.length} materias importadas desde SIU`, 'success')
  }

  const handleAddCareer = async (name: string): Promise<string | null> => {
    const err = await addCareer(name)
    if (!err) toast(`Carrera "${name}" agregada`, 'success')
    return err
  }

  const handleDeleteCareer = async (id: string): Promise<string | null> => {
    const career = careers.find(c => c.id === id)
    const err = await deleteCareer(id)
    if (!err) toast(`Carrera "${career?.name}" eliminada`, 'warning')
    return err
  }

  const handleSaveCareerConfig = async (id: string, config: CareerConfig): Promise<string | null> => {
    const err = await updateCareerConfig(id, config)
    if (!err) toast('Configuración guardada', 'success')
    return err
  }

  const subjectFinals = subjects
    .filter(s => s.finalDate)
    .map(s => ({ date: s.finalDate, title: `Final de ${s.name}`, subjectId: s.id, color: '#ef4444' }))

  const subjectExams = subjects.flatMap(s =>
    (s.examDates ?? [])
      .filter((e: any) => e.date)
      .map((e: any) => ({ date: e.date, title: `${e.type.toUpperCase()} · ${s.name}`, subjectId: s.id, color: '#6366f1' }))
  )

  const mergedEvents = [...calendarEvents, ...subjectFinals, ...subjectExams]

  const upcomingExam = mergedEvents
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ?? null

  const { currentYear, totalYears, totalSubjects: cfgTotal, extraSemesters } = careerConfig
  const totalSubjects = cfgTotal > 0 ? cfgTotal : null
  const totalSemesters = totalYears ? totalYears * 2 + extraSemesters : null
  const progressPct = totalSubjects
    ? Math.min(100, Math.round((stats.approved / totalSubjects) * 100))
    : stats.progress

  const currentPrefs = profile?.preferences ?? DEFAULT_PREFERENCES
  const showLocked = currentPrefs.showLocked ?? true
  const promotionThreshold = currentPrefs.promotionThreshold ?? 7
  const regularThreshold = currentPrefs.regularThreshold ?? 4



  const filteredSubjects = subjects.filter(s => {
    const effectiveStatus = getEffectiveStatus(s, currentYear, subjects)
    if (!showLocked && effectiveStatus === 'locked') return false
    if (filter !== 'all' && effectiveStatus !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    }
    return true
  })

  const handleCloseSemester = async (
    updates: {
      id: string
      status: SubjectStatus
      finalAttempts?: number
      gradeP1?: number | null
      gradeP2?: number | null
      gradeFinalExam?: number | null
      grade?: number | null
    }[],
    nextYear: number,
    nextSemester: 1 | 2
  ) => {
    for (const u of updates) {
      await updateSubject(u.id, {
        status: u.status,
        ...(u.finalAttempts !== undefined && { finalAttempts: u.finalAttempts }),
        ...(u.gradeP1 !== undefined && { gradeP1: u.gradeP1 }),
        ...(u.gradeP2 !== undefined && { gradeP2: u.gradeP2 }),
        ...(u.gradeFinalExam !== undefined && { gradeFinalExam: u.gradeFinalExam }),
        ...(u.grade !== undefined && { grade: u.grade }),
      })
    }
    await updateCareerConfig(activeCareer!.id, {
      ...careerConfig,
      currentYear: nextYear,
      currentSemester: nextSemester,
    })
    setShowCloseSemester(false)
    toast(`Cuatrimestre cerrado · ahora estás en ${nextSemester}°C ${nextYear}° año`, 'success')
  }

  const years = [...new Set(subjects.map(s => s.year))].sort((a, b) => a - b)

  const handleSave = async (data: Subject) => {
    const isEdit = subjects.find(s => s.id === data.id)
    try {
      const err = isEdit
        ? await updateSubject(data.id, data)
        : await addSubject((() => { const { id: _id, ...rest } = data; return rest })())
      if (err) { toast(err, 'error', 4000); return }
      toast(isEdit ? 'Materia actualizada' : 'Materia agregada', 'success')
      setModal(null)
    } catch (e) {
      console.error('[App] excepción en handleSave:', e)
    }
  }

  const handleDelete = (id: string) => {
    const subject = subjects.find(s => s.id === id)
    confirm({
      message: `¿Eliminar "${subject?.name ?? 'esta materia'}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => { await deleteSubject(id); toast('Materia eliminada', 'warning'); setModal(null) },
    })
  }

  const handleDeleteInline = (id: string) => {
    const subject = subjects.find(s => s.id === id)
    confirm({
      message: `¿Eliminar "${subject?.name ?? 'esta materia'}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => { await deleteSubject(id); toast('Materia eliminada', 'warning') },
    })
  }

  const STAT_ITEMS = [
    { label: 'Aprobadas', value: stats.approved, color: 'var(--approved)' },
    { label: 'Final pendiente', value: stats.pending, color: 'var(--pending-final)' },
    { label: 'En cursada', value: stats.inProgress, color: 'var(--in-progress)' },
    { label: 'Bloqueadas', value: stats.locked, color: 'var(--locked)' },
  ]

  useEffect(() => {
    if (!filterPanelOpen) return
    const h = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node))
        setFilterPanelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [filterPanelOpen])

  const allFilterKeys = FILTERS.map(f => f.key)
  const visibleFilterKeys: string[] = currentPrefs.visibleFilters ?? allFilterKeys

  const handleToggleFilter = async (key: string) => {
    const current = visibleFilterKeys
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]
    const safe = next.includes('all') ? next : ['all', ...next]
    await updatePreferences({ ...currentPrefs, visibleFilters: safe })
  }

  const syncEventToSubject = async (event: CalendarEvent) => {
    if (!event.graded || event.grade == null) return
    const title = event.title.toLowerCase()
    const isFinal = title.includes('final')
    const isParcial = title.includes('parcial')
    const isRecup = title.includes('recuperatorio') || title.includes('recup')
    let matchingSubject = event.subjectId ? subjects.find(s => s.id === event.subjectId) : null
    if (!matchingSubject) {
      matchingSubject = subjects.find(s =>
        (s.examDates ?? []).some((ex: any) => ex.date === event.date)
      ) ?? null
    }
    if (!matchingSubject) {
      matchingSubject = subjects.find(s => {
        const name = s.name.toLowerCase()
        return title.includes(name) || name.split(' ').filter(w => w.length > 3).every(w => title.includes(w))
      }) ?? null
    }
    if (!matchingSubject) return
    const updates: Partial<typeof matchingSubject> = {}
    const examEntry = (matchingSubject.examDates ?? []).find((ex: any) => ex.date === event.date) as any
    const examType = examEntry?.type ?? (isFinal || isRecup ? 'final' : isParcial ? 'parcial' : 'final')
    if (examType === 'final' || examType === 'recuperatorio' || isFinal || isRecup) {
      updates.gradeFinalExam = event.grade
      if (event.grade >= 4) {
        if (['pending_final', 'in_progress', 'available'].includes(matchingSubject.status)) {
          updates.status = 'approved' as any
          updates.statusManual = true
        }
      } else {
        if (matchingSubject.status === 'pending_final') {
          updates.status = 'failed_final' as any
          updates.statusManual = true
        }
      }
    } else if (examType === 'parcial' || isParcial) {
      if (matchingSubject.gradeP1 == null) {
        updates.gradeP1 = event.grade
      } else if (matchingSubject.gradeP2 == null) {
        updates.gradeP2 = event.grade
      } else {
        updates.gradeP1 = event.grade
      }
    }
    if (Object.keys(updates).length > 0) {
      await updateSubject(matchingSubject.id, updates)
    }
  }

  const handleCalendarAddEvent = async (event: CalendarEvent) => {
    await addEvent(event)
    await syncEventToSubject(event)
    toast('Evento agregado', 'success')
  }

  const handleCalendarUpdateEvent = async (oldEv: CalendarEvent, newEv: CalendarEvent) => {
    await updateEvent(oldEv, newEv)
    await syncEventToSubject(newEv)
    toast('Evento actualizado', 'success')
  }

  const handleCalendarRemoveEvent = async (date: string, title: string) => {
    await removeEvent(date, title)
    toast('Evento eliminado', 'warning')
  }


  useEffect(() => {
    if (user && profile && !profile.onboarding_done) {
      setShowOnboarding(true)
    }
  }, [user, profile])


  if (authLoading) {
    return (
      <div  >
        <Loading />
      </div>
    )
  }

  const urgentCount =
    mergedEvents.filter(e => {
      const d = Math.round(
        (new Date(e.date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
      )
      return d >= 0 && d <= 7
    }).length

  return (
    <div className="app">

      <AppHeader
        user={user}
        profile={profile}
        kanbanView={kanbanView}
        onToggleKanban={toggleKanban}
        onToggleCompact={toggleCompact}
        onExportXls={handleExport}
        onOpenScheduleExport={() => setShowScheduleExport(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}  
        onCloseSemester={() => setShowCloseSemester(true)}
        onUpdateProfile={updateProfile}
        onUpdatePassword={updatePassword}
        onDeleteAccount={deleteAccount}
        onOpenAuth={() => setShowAuth(true)}
        onSignOut={async () => {
          await signOut()
          window.location.href = window.location.pathname
        }}
        search={search}
        onImportSiu={() => setShowSiuImporter(true)}
        onSearch={setSearch}
        careers={careers}
        activeCareer={activeCareer}
        onUpdatePreferences={updatePreferences}
        onCopyWidget={() => {
          navigator.clipboard.writeText(`${window.location.origin}/widget/${user?.id}`)
        }}
        onSelectCareer={setActiveCareer}
        onAddCareer={handleAddCareer}
        onDeleteCareer={handleDeleteCareer}
        onSaveCareerConfig={handleSaveCareerConfig}
        onAddSubject={() => setModal('new')}
        onOpenCalendar={() => setCalOpen(true)}
        compactView={compactView}
        onToggleGpa={() => setShowGpa(v => !v)}
        showGpa={showGpa}
        onOpenAnalytics={() => setShowAnalytics(true)}
        upcomingExam={upcomingExam}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />

      {showSiuImporter && (
        <SiuImporter
          onImport={handleSiuImport}
          onClose={() => setShowSiuImporter(false)}
        />
      )}

      <div className="stats-bar">
        {STAT_ITEMS.map((s, i) => (
          <div key={i} className="stats-bar__item">
            <div className="stats-bar__value" style={{ color: s.color }}>{s.value}</div>
            <div className="stats-bar__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="progress-section" ref={progWrapRef}>
        <div className="progress-bar">
          <div className="progress-bar__left">
            <span className="progress-bar__label">
              {activeCareer ? `Progreso · ${activeCareer.name}` : 'Progreso de la carrera'}
            </span>
            {totalSubjects && (
              <span className="progress-bar__sub">
                {stats.approved} / {totalSubjects} materias aprobadas
              </span>
            )}
          </div>
          <div className="progress-bar__track-wrap">
            <div className="progress-bar__track">
              <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
              {totalSemesters && totalSemesters > 1 &&
                Array.from({ length: totalSemesters - 1 }, (_, i) => {
                  const isYearBoundary = (i + 1) % 2 === 0
                  return (
                    <div
                      key={i}
                      className={`progress-bar__marker${isYearBoundary ? ' progress-bar__marker--year' : ''}`}
                      style={{ left: `${((i + 1) / totalSemesters) * 100}%` }}
                    />
                  )
                })}
            </div>
          </div>
          <span className="progress-bar__pct">{progressPct}%</span>
        </div>

        <div className="progress-strip">
          <div className="progress-strip__track">
            <div className="progress-strip__fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="progress-strip__pct">{progressPct}%</span>
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="filters-row">
        <div className="filters">
          <span className="filters__label">Filtrar:</span>
          {FILTERS.filter(f => visibleFilterKeys.includes(f.key)).map(f => {
            const config = f.key !== 'all' ? STATUS_CONFIG[f.key] : null
            const Icon = config?.icon
            const isActive = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                data-status={f.key}
                className={`filter-btn${isActive ? ' filter-btn--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {Icon && <Icon size="14" color={isActive ? 'currentColor' : config?.color} />}
                {f.label}
              </button>
            )
          })}
        </div>

        <div ref={filterPanelRef} className="filters-settings">
          <button
            className={`filter-btn${filterPanelOpen ? ' filter-btn--active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '1rem', letterSpacing: 1 }}
            onClick={() => setFilterPanelOpen(v => !v)}
            title="Personalizar filtros"
          >
            <Setting4 size={14} color="currentColor" />
          </button>

          {filterPanelOpen && (
            <div
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '8px 0', minWidth: 210,
                animation: 'ctxFadeIn 0.1s ease',
              }}
            >
              <div style={{
                padding: '4px 14px 8px',
                fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border)', marginBottom: 4,
              }}>
                Mostrar filtros
              </div>

              {FILTERS.map(f => {
                const config = f.key !== 'all' ? STATUS_CONFIG[f.key] : null
                const isVisible = visibleFilterKeys.includes(f.key)
                const isAll = f.key === 'all'
                return (
                  <button
                    key={f.key}
                    type="button"
                    disabled={isAll}
                    onClick={() => handleToggleFilter(f.key)}
                    style={{
                      all: 'unset', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 14px',
                      fontSize: '0.82rem', cursor: isAll ? 'default' : 'pointer',
                      color: isVisible ? 'var(--text)' : 'var(--muted)',
                      boxSizing: 'border-box',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isAll) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: config?.color ?? '#6366f1',
                    }} />
                    <span style={{ flex: 1 }}>{f.label}</span>
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: `1px solid ${isVisible ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                      background: isVisible ? '#6366f1' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isVisible && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                )
              })}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '6px 0 2px' }} />
              <button
                style={{
                  all: 'unset', fontFamily: 'inherit',
                  display: 'block', width: '100%', padding: '7px 14px',
                  fontSize: '0.78rem', color: '#64748b', cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b' }}
                onClick={async () => {
                  await updatePreferences({ ...currentPrefs, visibleFilters: allFilterKeys })
                  setFilterPanelOpen(false)
                }}
              >
                Mostrar todos
              </button>
            </div>
          )}
        </div>
      </div>

      {showCloseSemester && activeCareer && (
        <CloseSemesterWizard
          subjects={subjects}
          currentYear={careerConfig.currentYear}
          currentSemester={(careerConfig.currentSemester ?? 1) as 1 | 2}
          onConfirm={handleCloseSemester}
          onClose={() => setShowCloseSemester(false)}
        />
      )}

      <div className="main">
        <UpcomingSidebar
          subjects={subjects}
          calendarEvents={mergedEvents}
          mobileOpen={mobileUpcomingOpen}
          onMobileClose={() => setMobileUpcomingOpen(false)}
          onOpenCalendar={(date) => {
            setCalOpen(true)
            if (date) setTimeout(() => calRef.current?.navigateTo(date), 50)
          }}
          onEditSubject={(id) => { const s = subjects.find(x => x.id === id); if (s) setModal(s) }}
          onRemoveEvent={removeEvent}
          onUpdateEvent={updateEvent}
        />

        <MobileFAB
          onOpenCalendar={console.log}
          onAddSubject={() => setModal('new')}
          onOpenSpotlight={() => setSpotlightOpen(true)}
          onOpenUpcoming={() => setMobileUpcomingOpen(true)}
          urgentCount={urgentCount}
        />

        <main className="main__content">
          {subjectsLoading ? (
            <div className="loading-state">
              <Loader size={20} color='currentColor' className='spin' />
              <span>Cargando materias...</span>
            </div>
          ) : !activeCareer ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Book size={48} color="var(--muted)" /></div>
              <p className="empty-state__text">
                {user
                  ? <>Todavía no tenés ninguna carrera. Abrí el menú y agregá una.</>
                  : <>Iniciá sesión para empezar.</>
                }
              </p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Book size={48} color="var(--muted)" /></div>
              <p className="empty-state__text">
                No hay materias en <strong>{activeCareer.name}</strong>.<br />
                {user
                  ? '¡Empezá agregando las materias de tu carrera!'
                  : <>Iniciá sesión para guardar en la nube, o <button className="link-btn" onClick={() => setModal('new')}>agregá una materia</button>.</>
                }
              </p>
              {user && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn--primary" onClick={() => setModal('new')}>
                    <Add size={15} color="currentColor" /> Nueva materia
                  </button>
                  <button className="btn" onClick={() => setShowSiuImporter(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CloudDown size={15} stroke="currentColor" /> Importar desde SIU
                    <span style={{
                      fontSize: '0.68rem', background: 'rgba(99,102,241,0.12)',
                      color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)',
                      borderRadius: 6, padding: '1px 6px',
                    }}>.xls</span>
                  </button>
                </div>
              )}
            </div>
          ) : kanbanView ? (
            <KanbanView
              subjects={filteredSubjects}
              currentYear={currentYear}
              onEdit={id => setModal(subjects.find(x => x.id === id) ?? null)}
              onCycle={cycleStatus}
              onDelete={handleDeleteInline}
              onCopy={() => toast('Copiado', 'success')}
            />
          ) : (
            <>
              {years.map(year => {
                const group = filteredSubjects.filter(s => s.year === year).sort((a, b) => {
                  const order = { Q1: 1, Q2: 2, ANNUAL: 0 }
                  return order[a.term] - order[b.term]
                })
                if (group.length === 0) return null
                const firstSemester = group.filter(s => s.term === 'Q1' || s.term === 'ANNUAL')
                const secondSemester = group.filter(s => s.term === 'Q2' || s.term === 'ANNUAL')
                return (
                  <section key={year} className="year-section">
                    <div className="year-section__title">
                      {year}° año
                      <span className="year-section__badge">{group.length} materias</span>
                      {year === currentYear && <span className="year-section__current-badge"> <PinLocation size={12} /> </span>}
                    </div>
                    <div className="year-semesters">
                      <div className="semester-column">
                        <div className="year-section__title">1° Cuatrimestre</div>
                        <div className="subjects-grid">
                          {firstSemester.map(s => (
                            <SubjectCard key={s.id} subject={s} compact={compactView} allSubjects={subjects}
                              currentYear={currentYear}
                              onEdit={id => setModal(subjects.find(x => x.id === id) ?? null)}
                              onCycle={cycleStatus} onDelete={handleDeleteInline}
                              onCopy={() => toast('Copiado', 'success')}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="semester-column">
                        <div className="year-section__title">2° Cuatrimestre</div>
                        <div className="subjects-grid">
                          {secondSemester.map(s => (
                            <SubjectCard key={s.id} subject={s} compact={compactView} allSubjects={subjects}
                              currentYear={currentYear}
                              onEdit={id => setModal(subjects.find(x => x.id === id) ?? null)}
                              onCycle={cycleStatus} onDelete={handleDeleteInline}
                              onCopy={() => toast('Copiado', 'success')}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                )
              })}
              {subjects.length > 0 && filteredSubjects.length === 0 && (
                <div className="no-results">Sin resultados para el filtro actual.</div>
              )}
            </>
          )}
        </main>
      </div>

      {modal !== null && (
        <SubjectModal
          subject={modal === 'new' ? null : modal}
          allSubjects={subjects}
          notionConnected={!!profile?.notion_token}
          currentYear={careerConfig.currentYear}
          currentSemester={careerConfig.currentSemester ?? 1}
          onSave={handleSave}
          regularThreshold={regularThreshold}
          promotionThreshold={promotionThreshold}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      {showQuickCorr && (
        <QuickCorrModal
          subjects={subjects}
          onSave={async (targetId, newCorrs) => {
            const err = await updateSubject(targetId, { corrApproved: newCorrs })
            if (err) toast(err, 'error', 4000)
            else toast('Correlativas actualizadas', 'success')
          }}
          onClose={() => setShowQuickCorr(false)}
        />
      )}

      {calOpen && (
        <div className="cal-drawer-overlay" onClick={() => setCalOpen(false)}>
          <div className="cal-drawer" onClick={e => e.stopPropagation()}>
            <button className="cal-drawer__close" onClick={() => setCalOpen(false)}><X size={16} /></button>
            <Calendar ref={calRef} events={mergedEvents} onAddEvent={handleCalendarAddEvent} onUpdateEvent={handleCalendarUpdateEvent} onRemoveEvent={handleCalendarRemoveEvent} universityLocation={profile?.university}
              onEditSubject={(subjectId) => { const s = subjects.find(x => x.id === subjectId); if (s) setModal(s) }} />
          </div>
        </div>
      )}

      {spotlightOpen && (
        <Spotlight subjects={subjects} currentYear={currentYear}
          onSelect={subject => setModal(subject)} onClose={() => setSpotlightOpen(false)} />
      )}

      {showGpa && (
        <GpaModal subjects={subjects} careerName={activeCareer?.name ?? ''} onClose={() => setShowGpa(false)} />
      )}

      {showAnalytics && (
        <AnalyticsModal
          subjects={subjects}
          careerName={activeCareer?.name ?? ''}
          currentYear={careerConfig.currentYear}
          currentSemester={careerConfig.currentSemester ?? 1}
          totalSubjects={careerConfig.totalSubjects > 0 ? careerConfig.totalSubjects : undefined}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {showAuth && (
        <AuthModal
          onResetPassword={async (email) => {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            })
            return error ? error.message : null
          }}
          onClose={() => setShowAuth(false)}
          onSignInWithOAuth={signInWithOAuth}
          onSignIn={signIn}
          onSignUp={signUp as any}
          onSignInWithMagicLink={signInWithMagicLink}
        />
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {showScheduleExport && (
        <ScheduleExport
          subjects={subjects}
          careerName={activeCareer?.name ?? ''}
          currentSemester={(careerConfig.currentSemester ?? 1) as 1 | 2}
          currentYear={careerConfig.currentYear}
          onClose={() => setShowScheduleExport(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {showOnboarding && (
        <div className="onboarding-overlay">
          <Onboarding
            onFinish={async () => {
              setShowOnboarding(false)

              if (user) {
                await updateProfile({
                  onboarding_done: true
                })
              }
            }}
          />
        </div>
      )}

      <style>{`
        .app-loading__spinner {
          width: 28px; height: 28px;
          border: 2px solid rgba(255,255,255,0.06);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .loading-state {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; padding: 60px 0; color: var(--muted); font-size: 0.85rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .link-btn {
          all: unset; font-family: inherit; color: #6366f1;
          font-size: inherit; cursor: pointer; text-decoration: underline;
        }
        .header__search-kbd {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px; padding: 0.1rem 0.4rem; font-size: 0.72rem;
          color: var(--muted); font-family: inherit;
        }
        .year-section__current-badge {
          font-size: 0.58rem; color: #6366f1; font-weight: 700;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
          border-radius: 8px; padding: 1px 6px;
        }
        .progress-bar__track-wrap { flex: 1; }
        .filters-row {
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }
        .filters-row .filters {
          flex: 1;
          border-bottom: none;
          min-width: 0;
        }

      `}</style>
    </div>
  )
}

export { }