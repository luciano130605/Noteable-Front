import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react'
import type { Subject, SubjectStatus, GradeHistoryEntry } from '../types/types'
import './SubjectModal.css'
import { Trash, Calendar, Clock, Danger, Setting4 } from 'iconsax-react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import NotionPagePicker from './Notionpagepicker'
import type { NotionPage } from '../hooks/Usenotion'
import { ToastContainer } from "./Toast"
import { useToastSystem, toast } from "../hooks/Usetoast"
import Ranking from "../Icon/Ranking"
import { useScrollLock } from '../hooks/Usescrolllock'

interface SubjectSettings {
  finalAttempts: number
  freeExamMinGrade: number
  roundingMode: 'round' | 'floor'
  parcialCount: 1 | 2 | 3
}

const DEFAULT_SUBJECT_SETTINGS: SubjectSettings = {
  finalAttempts: 3,
  freeExamMinGrade: 4,
  roundingMode: 'round',
  parcialCount: 2,
}

const SETTINGS_STORAGE_KEY = 'lastSubjectSettings'

function loadLastSettings(): SubjectSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SUBJECT_SETTINGS
    return { ...DEFAULT_SUBJECT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SUBJECT_SETTINGS
  }
}

function saveLastSettings(s: SubjectSettings) {
  try {
    localStorage.setItem("SETTINGS_STORAGE_KEY", JSON.stringify(s));
  } catch (error) {
    console.error("No se pudo guardar la configuración:", error);
  }
}


interface Props {
  subject: Subject | null
  allSubjects: Subject[]
  currentYear: number
  currentSemester: number
  notionConnected: boolean
  onSave: (data: Subject) => void
  onDelete: (id: string) => void
  onClose: () => void
  regularThreshold?: number
  promotionThreshold?: number
}

type FormState = Omit<
  Subject,
  'id' | 'year' | 'semester' | 'grade' | 'gradeP1' | 'gradeP2' | 'gradeP3' | 'gradeFinalExam' | 'gradeOverride'
> & {
  id: string
  year: string
  semester: string
  grade: string
  gradeP1: string
  gradeP2: string
  gradeP3: string
  gradeFinalExam: string
  zoomLink: string
  aulaVirtualLink: string
  gradeOverride: string
  finalAttempts: number
  gradeHistory: GradeHistoryEntry[]
}

export interface ExamDate {
  id: string
  type: 'parcial' | 'final' | 'recuperatorio' | 'coloquio' | 'otro'
  date: string
  notes: string
}

export interface ClassSchedule {
  id: string
  day: 'lun' | 'mar' | 'mié' | 'jue' | 'vie' | 'sáb'
  timeFrom: string
  timeTo: string
  location: string
}

const DAYS: ClassSchedule['day'][] = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

const EXAM_TYPE_COLORS: Record<ExamDate['type'], string> = {
  parcial: 'rgba(99,102,241,0.18)',
  final: 'rgba(239,68,68,0.15)',
  recuperatorio: 'rgba(250,204,21,0.13)',
  coloquio: 'rgba(56,189,248,0.14)',
  otro: 'rgba(255,255,255,0.06)',
}
const EXAM_TYPE_BORDER: Record<ExamDate['type'], string> = {
  parcial: 'rgba(99,102,241,0.35)',
  final: 'rgba(239,68,68,0.35)',
  recuperatorio: 'rgba(250,204,21,0.32)',
  coloquio: 'rgba(56,189,248,0.32)',
  otro: 'rgba(255,255,255,0.1)',
}
const EXAM_TYPE_LABELS: Record<ExamDate['type'], string> = {
  parcial: 'Parcial', final: 'Final', recuperatorio: 'Recup.', coloquio: 'Coloquio', otro: 'Otro',
}

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  code: '',
  year: '',
  semester: '',
  zoomLink: '',
  aulaVirtualLink: '',
  term: "Q1",
  status: 'locked',
  corrApproved: [],
  corrRegular: [],
  examDates: [],
  finalDate: '',
  approvedDate: '',
  grade: '',
  gradeP1: '',
  gradeP2: '',
  gradeP3: '',
  gradeFinalExam: '',
  gradeOverride: '',
  notes: '',
  finalAttempts: 0,
  gradeHistory: [],
}

const newExam = (): ExamDate => ({ id: crypto.randomUUID(), type: 'parcial', date: '', notes: '' })
const newSchedule = (): ClassSchedule => ({ id: crypto.randomUUID(), day: 'lun', timeFrom: '', timeTo: '', location: '' })

const TERMINAL_STATUSES: SubjectStatus[] = ['approved', 'pending_final', 'failed_final', 'free', 'retaking']

function calcAvg(grades: number[], roundingMode: 'round' | 'floor'): number {
  const sum = grades.reduce((a, b) => a + b, 0)
  const raw = sum / grades.length
  return roundingMode === 'round'
    ? Math.ceil(raw)
    : Math.floor(raw * 10) / 10
}

function calcGrade(
  p1: string, p2: string, p3: string, fe: string,
  promotionThreshold = 7,
  regularThreshold = 4,
  parcialCount: 1 | 2 | 3 = 2,
  roundingMode: 'round' | 'floor' = 'round',
) {
  const n1 = parseFloat(p1), n2 = parseFloat(p2), n3 = parseFloat(p3), nf = parseFloat(fe)

  if (!isNaN(nf)) return {
    value: nf,
    source: 'final' as const,
    formula: `Final: ${nf}`,
    outcome: nf >= regularThreshold
      ? { label: 'Aprobado', sub: `Final ≥ ${regularThreshold} · materia aprobada`, color: '#4ade80' }
      : { label: 'Desaprobado', sub: `Final < ${regularThreshold} · libre o recursar`, color: '#f87171' },
  }

  const grades: number[] = []
  if (parcialCount >= 1 && !isNaN(n1)) grades.push(n1)
  if (parcialCount >= 2 && !isNaN(n2)) grades.push(n2)
  if (parcialCount >= 3 && !isNaN(n3)) grades.push(n3)

  if (grades.length === parcialCount) {
    const avg = calcAvg(grades, roundingMode)
    const formulaParts = grades.map(g => String(g))
    const formula = parcialCount === 1
      ? `Parcial: ${grades[0]}`
      : `(${formulaParts.join(' + ')}) / ${parcialCount} = ${avg}`
    return {
      value: avg,
      source: 'promedio' as const,
      formula,
      outcome: avg >= promotionThreshold
        ? { label: 'Aprobado directo', sub: `Promedio ≥ ${promotionThreshold} · sin final, pero necesitás correlativas aprobadas`, color: '#4ade80' }
        : avg >= regularThreshold
          ? { label: 'Vas al final', sub: `Promedio ${regularThreshold}–${promotionThreshold - 1} · necesitás dar el final`, color: '#fbbf24' }
          : { label: 'Recursada', sub: `Promedio < ${regularThreshold}`, color: '#f87171' },
    }
  }

  return { value: null, source: null, formula: '', outcome: null }
}

function dotColor(n: number, src?: 'final' | 'promedio' | null, promotionThreshold = 7, regularThreshold = 4) {
  if (src === 'final') return n >= regularThreshold ? '#4ade80' : '#f87171'
  if (n >= promotionThreshold) return '#4ade80'
  if (n >= regularThreshold) return '#fbbf24'
  return '#f87171'
}

function daysUntil(d: string) {
  if (!d) return null
  return Math.ceil((new Date(d + 'T12:00:00').getTime() - Date.now()) / 86400000)
}
function fmtShortDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
}
function formatCodeStr(raw: string): string {
  const digits = raw.replace(/\./g, '').replace(/[^0-9]/g, '')
  let out = ''
  for (let i = 0; i < digits.length && i < 3; i++) { out += digits[i]; if (i < 2) out += '.' }
  return out
}


function CorrInput({ tags, onChange }: { tags: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const add = (raw: string) => {
    const val = formatCodeStr(raw.trim())
    if (val.length < 5) return
    if (!tags.includes(val)) onChange([...tags, val])
    setInput('')
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCodeStr(e.target.value)
    setInput(formatted)
    if (formatted.length === 5) {
      if (!tags.includes(formatted)) onChange([...tags, formatted])
      setTimeout(() => setInput(''), 0)
    }
  }
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) onChange(tags.slice(0, -1))
  }
  return (
    <div className="corr-input" onClick={() => ref.current?.focus()}>
      {tags.map(tag => (
        <span key={tag} className="corr-input__tag">
          {tag}
          <button type="button" onClick={e => { e.stopPropagation(); onChange(tags.filter(t => t !== tag)) }}>×</button>
        </span>
      ))}
      <input ref={ref} className="form-control" value={input} onChange={handleChange}
        onKeyDown={handleKey} onBlur={() => add(input)}
        placeholder={tags.length === 0 ? '1.2.1' : ''} maxLength={5} />
    </div>
  )
}


function SettingsPanel({
  settings, onChange,
}: {
  settings: SubjectSettings
  onChange: (s: SubjectSettings) => void
}) {
  const set = <K extends keyof SubjectSettings>(k: K, v: SubjectSettings[K]) =>
    onChange({ ...settings, [k]: v })

  return (
    <div className="sbjset">
      <div className="sbjset__row">
        <div className="sbjset__label">
          <span className="sbjset__label-main">Parciales</span>
          <span className="sbjset__label-sub">¿Cuántos parciales tiene la materia?</span>
        </div>
        <div className="sbjset__chips">
          {([1, 2, 3] as const).map(n => (
            <button key={n} type="button"
              className={`sbjset__chip${settings.parcialCount === n ? ' active' : ''}`}
              onClick={() => set('parcialCount', n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="sbjset__row">
        <div className="sbjset__label">
          <span className="sbjset__label-main">Promedio</span>
          <span className="sbjset__label-sub">¿Cómo se calcula el promedio?</span>
        </div>
        <div className="sbjset__chips">
          <button type="button"
            className={`sbjset__chip${settings.roundingMode === 'round' ? ' active' : ''}`}
            onClick={() => set('roundingMode', 'round')}>
            Redondea
          </button>
          <button type="button"
            className={`sbjset__chip${settings.roundingMode === 'floor' ? ' active' : ''}`}
            onClick={() => set('roundingMode', 'floor')}>
            Decimal
          </button>
        </div>
      </div>

      <div className="sbjset__row">
        <div className="sbjset__label">
          <span className="sbjset__label-main">Intentos de final</span>
          <span className="sbjset__label-sub">Antes de quedar libre</span>
        </div>
        <div className="sbjset__chips">
          {([2, 3, 4, 5] as const).map(n => (
            <button key={n} type="button"
              className={`sbjset__chip${settings.finalAttempts === n ? ' active' : ''}`}
              onClick={() => set('finalAttempts', n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="sbjset__row">
        <div className="sbjset__label">
          <span className="sbjset__label-main">Nota mínima libre</span>
          <span className="sbjset__label-sub">Para aprobar el examen libre</span>
        </div>
        <div className="sbjset__chips">
          {([3, 4, 5, 6, 7, 8] as const).map(n => (
            <button key={n} type="button"
              className={`sbjset__chip${settings.freeExamMinGrade === n ? ' active' : ''}`}
              onClick={() => set('freeExamMinGrade', n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="sbjset__preview">
        <span>
          {settings.parcialCount === 1 ? '1 parcial' : `${settings.parcialCount} parciales`}
          {' · '}promedio {settings.roundingMode === 'round' ? 'redondeado' : 'con decimal'}
          {' · '}{settings.finalAttempts} intentos de final
          {' · '}libre ≥ {settings.freeExamMinGrade}
        </span>
      </div>
    </div>
  )
}


export default function SubjectModal({
  subject, allSubjects, onSave, currentYear, currentSemester, onDelete, onClose,
  promotionThreshold = 7,
  regularThreshold = 4,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [examDates, setExamDates] = useState<ExamDate[]>([])
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [gradeTab, setGradeTab] = useState<'auto' | 'manual'>('auto')
  const [showNotionPicker, setShowNotionPicker] = useState(false)
  const [statusManuallySet, setStatusManuallySet] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<SubjectSettings>(loadLastSettings)
  const { toasts, remove } = useToastSystem()
  useScrollLock(true)
  const dc = (n: number, src?: 'final' | 'promedio' | null) =>
    dotColor(n, src, promotionThreshold, regularThreshold)

  useEffect(() => {
    if (subject) {
      const s = subject as any
      const isTerminal = TERMINAL_STATUSES.includes(subject.status)
      setStatusManuallySet(isTerminal || (subject.statusManual ?? false))
      setForm({
        ...subject,
        zoomLink: s.zoomLink ?? '',
        aulaVirtualLink: s.aulaVirtualLink ?? '',
        year: String(subject.year),
        semester: String(subject.semester),
        grade: subject.grade !== null ? String(subject.grade) : '',
        gradeP1: s.gradeP1 != null ? String(s.gradeP1) : '',
        gradeP2: s.gradeP2 != null ? String(s.gradeP2) : '',
        gradeP3: s.gradeP3 != null ? String(s.gradeP3) : '',
        gradeFinalExam: s.gradeFinalExam != null ? String(s.gradeFinalExam) : '',
        gradeOverride: s.gradeOverride != null ? String(s.gradeOverride) : '',
        notionPageId: subject.notionPageId ?? null,
        notionPageTitle: subject.notionPageTitle ?? null,
        notionPageUrl: subject.notionPageUrl ?? null,
        gradeHistory: s.gradeHistory ?? [],
        finalAttempts: s.finalAttempts ?? 0,
      })
      setExamDates(s.examDates ?? [])
      setSchedules(s.schedules ?? [])
      setGradeTab(s.gradeOverride != null ? 'manual' : 'auto')
      if (s.subjectSettings) {
        setSettings({ ...DEFAULT_SUBJECT_SETTINGS, ...s.subjectSettings })
      } else {
        setSettings(loadLastSettings())
      }
    } else {
      setStatusManuallySet(false)
      setForm(EMPTY_FORM)
      setExamDates([])
      setSchedules([])
      setGradeTab('auto')
      setSettings(loadLastSettings())
    }
  }, [subject])

  useEffect(() => {
    if (statusManuallySet) return
    if (TERMINAL_STATUSES.includes(form.status)) return
    if (subject && TERMINAL_STATUSES.includes(subject.status)) return

    const approvedCodes = new Set(
      allSubjects.filter(s => s.status === 'approved' && s.id !== form.id).map(s => s.code.toLowerCase())
    )
    const corrMet = form.corrApproved.every(c => approvedCodes.has(c.toLowerCase()))
    const yearNum = Number(form.year), semNum = Number(form.semester)
    const isPast = yearNum < currentYear || (yearNum === currentYear && semNum < currentSemester)

    let newStatus: SubjectStatus
    if (isPast) {
      const p1 = parseFloat(form.gradeP1), p2 = parseFloat(form.gradeP2)
      const p3 = parseFloat(form.gradeP3)
      const fe = parseFloat(form.gradeFinalExam), ov = parseFloat(form.gradeOverride)
      if (!isNaN(ov)) {
        newStatus = ov >= regularThreshold ? 'approved' : 'retaking'
      } else if (!isNaN(fe)) {
        newStatus = fe >= regularThreshold ? 'approved' : 'failed_final'
      } else {
        const grades: number[] = []
        if (settings.parcialCount >= 1 && !isNaN(p1)) grades.push(p1)
        if (settings.parcialCount >= 2 && !isNaN(p2)) grades.push(p2)
        if (settings.parcialCount >= 3 && !isNaN(p3)) grades.push(p3)
        if (grades.length === settings.parcialCount) {
          const avg = calcAvg(grades, settings.roundingMode)
          if (avg >= promotionThreshold) newStatus = 'approved'
          else if (avg >= regularThreshold) newStatus = 'pending_final'
          else newStatus = 'retaking'
        } else {
          newStatus = 'in_progress'
        }
      }
    } else if (yearNum > currentYear || (yearNum === currentYear && semNum > currentSemester)) {
      newStatus = corrMet ? 'available' : 'locked'
    } else {
      newStatus = corrMet ? 'in_progress' : 'locked'
    }

    if (form.status !== newStatus) setForm(f => ({ ...f, status: newStatus }))
  }, [
    form.corrApproved, form.year, form.semester,
    form.gradeP1, form.gradeP2, form.gradeP3, form.gradeFinalExam, form.gradeOverride,
    allSubjects, form.id, statusManuallySet, currentYear, currentSemester,
    promotionThreshold, regularThreshold, settings.parcialCount, settings.roundingMode,
  ])

  useEffect(() => {
    const finalGrade = parseFloat(form.gradeFinalExam)
    if (isNaN(finalGrade)) return
    setForm(f => {
      if (f.status !== 'pending_final') return f
      return { ...f, status: finalGrade >= regularThreshold ? 'approved' : 'pending_final' }
    })
  }, [form.gradeFinalExam, regularThreshold])

  useEffect(() => {
    const grades: number[] = []
    const n1 = parseFloat(form.gradeP1), n2 = parseFloat(form.gradeP2), n3 = parseFloat(form.gradeP3)
    if (settings.parcialCount >= 1 && !isNaN(n1)) grades.push(n1)
    if (settings.parcialCount >= 2 && !isNaN(n2)) grades.push(n2)
    if (settings.parcialCount >= 3 && !isNaN(n3)) grades.push(n3)
    if (grades.length < settings.parcialCount) return
    if (form.status === 'retaking') return
    if (TERMINAL_STATUSES.includes(form.status)) return
    if (!['in_progress', 'pending_final'].includes(form.status)) return

    const avg = calcAvg(grades, settings.roundingMode)
    if (avg >= regularThreshold) return

    const entry: GradeHistoryEntry = {
      year: Number(form.year), semester: Number(form.semester),
      gradeP1: n1, gradeP2: isNaN(n2) ? null : n2,
      gradeFinalExam: null, gradeOverride: null, grade: avg,
    }
    setForm(f => ({
      ...f, status: 'retaking', gradeP1: '', gradeP2: '', gradeP3: '',
      gradeFinalExam: '', gradeOverride: '', finalDate: '',
      gradeHistory: [...(f.gradeHistory ?? []), entry],
    }))
    setStatusManuallySet(true)
    setGradeTab('auto')
  }, [form.gradeP1, form.gradeP2, form.gradeP3, regularThreshold, settings.parcialCount, settings.roundingMode])

  useEffect(() => {
    const grades: number[] = []
    const n1 = parseFloat(form.gradeP1), n2 = parseFloat(form.gradeP2), n3 = parseFloat(form.gradeP3)
    if (settings.parcialCount >= 1 && !isNaN(n1)) grades.push(n1)
    if (settings.parcialCount >= 2 && !isNaN(n2)) grades.push(n2)
    if (settings.parcialCount >= 3 && !isNaN(n3)) grades.push(n3)
    if (grades.length < settings.parcialCount) return
    if (form.status !== 'pending_final') return
    const avg = calcAvg(grades, settings.roundingMode)
    if (avg < promotionThreshold) return
    setForm(f => ({ ...f, status: 'approved' }))
    setStatusManuallySet(true)
  }, [form.gradeP1, form.gradeP2, form.gradeP3, promotionThreshold, settings.parcialCount, settings.roundingMode])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (key === 'code') {
      const formatted = formatCodeStr(value as string)
      const match = /^([1-6])\.([1-3])\./.exec(formatted)
      if (match) { setForm(f => ({ ...f, code: formatted, year: match[1], semester: match[2] })); return }
      setForm(f => ({ ...f, code: formatted })); return
    }
    setForm(f => ({ ...f, [key]: value }))
  }
  const onChange = (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set(key, e.target.value as any)

  const handleNotionSelect = (page: NotionPage | null) => {
    setForm(f => ({
      ...f,
      notionPageId: page?.id ?? null,
      notionPageTitle: page?.title ?? null,
      notionPageUrl: page?.url ?? null,
    }))
  }

  const addExam = () => setExamDates(p => [...p, newExam()])
  const updateExam = (id: string, patch: Partial<ExamDate>) =>
    setExamDates(p => p.map(e => e.id === id ? { ...e, ...patch } : e))
  const removeExam = (id: string) => setExamDates(p => p.filter(e => e.id !== id))
  const sortedExams = [...examDates].sort((a, b) => a.date.localeCompare(b.date))
  const upcomingExams = sortedExams.filter(e => e.date && (daysUntil(e.date) ?? -1) >= 0)

  const addSchedule = () => setSchedules(p => [...p, newSchedule()])
  const updateSchedule = (id: string, patch: Partial<ClassSchedule>) =>
    setSchedules(p => p.map(s => s.id === id ? { ...s, ...patch } : s))
  const removeSchedule = (id: string) => setSchedules(p => p.filter(s => s.id !== id))

  const computed = useMemo(
    () => calcGrade(form.gradeP1, form.gradeP2, form.gradeP3, form.gradeFinalExam,
      promotionThreshold, regularThreshold, settings.parcialCount, settings.roundingMode),
    [form.gradeP1, form.gradeP2, form.gradeP3, form.gradeFinalExam,
      promotionThreshold, regularThreshold, settings.parcialCount, settings.roundingMode]
  )

  const effectiveGrade: number | null = (() => {
    if (gradeTab === 'manual' && form.gradeOverride !== '') return parseFloat(form.gradeOverride)
    if (computed.value !== null) return computed.value
    if (form.grade !== '') return parseFloat(form.grade)
    return null
  })()

  const handleSave = () => {
    if (!form.name.trim()) { toast("El nombre es obligatorio", "error"); return }
    const checkRange = (val: string, lbl: string) => {
      const n = parseFloat(val)
      if (val !== '' && (isNaN(n) || n < 1 || n > 10)) { toast(`${lbl} debe estar entre 1 y 10`, "error"); return false }
      return true
    }
    if (!checkRange(form.gradeP1, '1er parcial')) return
    if (!checkRange(form.gradeP2, '2do parcial')) return
    if (!checkRange(form.gradeP3, '3er parcial')) return
    if (!checkRange(form.gradeFinalExam, 'Final')) return
    if (!checkRange(form.gradeOverride, 'Nota manual')) return

    saveLastSettings(settings)

    const finalStatus = form.status === 'failed_final' && (form.finalAttempts ?? 1) >= settings.finalAttempts
      ? 'free'
      : form.status

    onSave({
      id: form.id || crypto.randomUUID(),
      name: form.name.trim(),
      code: form.code.trim(),
      zoomLink: form.zoomLink,
      aulaVirtualLink: form.aulaVirtualLink,
      year: Number(form.year) as Subject['year'],
      semester: Number(form.semester) as Subject['semester'],
      corrApproved: form.corrApproved,
      corrRegular: [],
      statusManual: statusManuallySet || TERMINAL_STATUSES.includes(finalStatus),
      finalDate: form.finalDate,
      gradeHistory: form.gradeHistory ?? [],
      approvedDate: form.approvedDate,
      grade: effectiveGrade,
      notes: form.notes,
      examDates,
      schedules,
      notionPageId: form.notionPageId ?? null,
      notionPageTitle: form.notionPageTitle ?? null,
      notionPageUrl: form.notionPageUrl ?? null,
      gradeP1: form.gradeP1 !== '' ? Number(form.gradeP1) : null,
      gradeP2: form.gradeP2 !== '' ? Number(form.gradeP2) : null,
      gradeP3: form.gradeP3 !== '' ? Number(form.gradeP3) : null,
      gradeFinalExam: form.gradeFinalExam !== '' ? Number(form.gradeFinalExam) : null,
      gradeOverride: gradeTab === 'manual' && form.gradeOverride !== '' ? Number(form.gradeOverride) : null,
      status: finalStatus,
      finalAttempts: form.status === 'failed_final' ? (form.finalAttempts ?? 1) : 0,
      subjectSettings: settings,
    } as any)
  }

  const isEdit = !!subject?.id
  const isInProgress = form.status === 'in_progress' || form.status === 'retaking'
  const isPendingFinal = form.status === 'pending_final'
  const isApproved = form.status === 'approved'

  const parcialLabels = ['1er Parcial', '2do Parcial', '3er Parcial']

  function ParcialInputs({ showDot = true }: { showDot?: boolean }) {
    const fields: Array<{ key: keyof FormState; label: string }> = [
      { key: 'gradeP1', label: parcialLabels[0] },
      ...(settings.parcialCount >= 2 ? [{ key: 'gradeP2' as keyof FormState, label: parcialLabels[1] }] : []),
      ...(settings.parcialCount >= 3 ? [{ key: 'gradeP3' as keyof FormState, label: parcialLabels[2] }] : []),
    ]
    return (
      <>
        {fields.map((f) => (
          <div key={f.key} className="modal__grade-input-wrap">
            <label className="modal__grade-input-label">{f.label}</label>
            <input className="form-control modal__grade-input" type="number" min={1} max={10} step={0.5}
              value={form[f.key] as string} onChange={onChange(f.key)} placeholder="—" />
            {showDot && form[f.key] && !isNaN(+(form[f.key] as string)) &&
              <span className="modal__grade-dot" style={{ background: dc(+(form[f.key] as string)) }} />}
          </div>
        ))}
      </>
    )
  }


  const isTerminalStatus = TERMINAL_STATUSES.includes(form.status)

  function StatusHint() {
    if (isTerminalStatus) {
      return (
        <span style={{ fontSize: '0.57rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
          Estado fijo · cambialo desde el selector si es necesario
        </span>
      )
    }
    if (!statusManuallySet) {
      return (
        <span style={{ fontSize: '0.57rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
          Calculado automáticamente · cambialo si necesitás
        </span>
      )
    }
    return (
      <span style={{ fontSize: '0.57rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
        Fijado manualmente ·{' '}
        <button type="button"
          style={{ all: 'unset', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
          onClick={() => setStatusManuallySet(false)}>
          volver al automático
        </button>
      </span>
    )
  }

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">

          <div className="modal__title">
            <span>{isEdit ? 'Editar materia' : 'Nueva materia'}</span>
            <button type="button" className="modal__close" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="modal__body">

            <div className="modal__grid-2">
              <Field label="Nombre *">
                <input className="form-control" value={form.name} onChange={onChange('name')}
                  placeholder="Modelado y Diseño de Software" autoFocus />
              </Field>
              <Field label="Código">
                <input className="form-control" value={form.code} onChange={onChange('code')}
                  placeholder="1.1.1" maxLength={5} />
              </Field>
            </div>

            <div className="modal__grid-3">
              <Field label="Año">
                <select className="form-control" value={form.year} onChange={onChange('year')}>
                  {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}° año</option>)}
                </select>
              </Field>
              <Field label="Cuatrimestre">
                <select className="form-control" value={form.semester} onChange={onChange('semester')}>
                  <option value="1">1° cuatri</option>
                  <option value="2">2° cuatri</option>
                  <option value="3">Anual</option>
                </select>
              </Field>
              <Field label="Estado">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <select className="form-control" value={form.status}
                    onChange={e => {
                      const newStatus = e.target.value as SubjectStatus
                      setStatusManuallySet(true)
                      if (newStatus === 'retaking') {
                        const entry: GradeHistoryEntry = {
                          year: Number(form.year), semester: Number(form.semester),
                          gradeP1: form.gradeP1 !== '' ? Number(form.gradeP1) : null,
                          gradeP2: form.gradeP2 !== '' ? Number(form.gradeP2) : null,
                          gradeFinalExam: form.gradeFinalExam !== '' ? Number(form.gradeFinalExam) : null,
                          gradeOverride: form.gradeOverride !== '' ? Number(form.gradeOverride) : null,
                          grade: effectiveGrade,
                        }
                        const hasData = entry.gradeP1 !== null || entry.gradeP2 !== null ||
                          entry.gradeFinalExam !== null || entry.gradeOverride !== null
                        setForm(f => ({
                          ...f, status: 'retaking', gradeP1: '', gradeP2: '', gradeP3: '',
                          gradeFinalExam: '', gradeOverride: '', finalDate: '',
                          gradeHistory: hasData ? [...(f.gradeHistory ?? []), entry] : (f.gradeHistory ?? []),
                        }))
                        setGradeTab('auto')
                      } else {
                        set('status', newStatus)
                      }
                    }}>
                    <option value="approved">Aprobada</option>
                    <option value="available">Habilitada</option>
                    <option value="in_progress">En cursada</option>
                    <option value="retaking">Recursada</option>
                    <option value="pending_final">Final pendiente</option>
                    <option value="failed_final">Final desaprobado</option>
                    <option value="locked">Bloqueada</option>
                    <option value="free">Libre</option>
                  </select>

                  <StatusHint />

                  {form.status === 'available' && (
                    <button type="button"
                      onClick={() => { setStatusManuallySet(true); setForm(f => ({ ...f, status: 'in_progress' })) }}
                      style={{
                        all: 'unset', fontFamily: 'inherit', textAlign: 'center', gap: 6,
                        fontSize: '0.78rem', fontWeight: 600, color: '#34d399', cursor: 'pointer',
                        padding: '5px 12px', background: 'rgba(52,211,153,0.1)',
                        border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, transition: 'background 0.15s',
                      }}>
                      Cursar ahora
                    </button>
                  )}
                </div>
              </Field>
            </div>

            <div className="sbjset-wrap">
              <button type="button" className="sbjset-toggle" onClick={() => setSettingsOpen(v => !v)}>
                <span className="sbjset-toggle__left">
                  <Setting4 size={13} color='currentColor' />
                  Ajustes de cursada
                </span>
                <span className="sbjset-toggle__summary">
                  {settings.parcialCount}P · {settings.roundingMode === 'round' ? 'redondea ' : 'decimal'} · {settings.finalAttempts} intentos · libre ≥ {settings.freeExamMinGrade}
                </span>
                {settingsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {settingsOpen && (
                <SettingsPanel settings={settings} onChange={s => setSettings(s)} />
              )}
            </div>

            {form.status === 'failed_final' && (
              <div className="modal__section modal__section--grades">
                <div className="modal__section-header">
                  <div className="modal__section-title">
                    <span className="modal__section-icon"><Ranking size={16} /></span>
                    Intento de final
                  </div>
                </div>
                <Field label="Intentos realizados">
                  <select className="form-control" value={form.finalAttempts ?? 1}
                    onChange={e => setForm(f => ({ ...f, finalAttempts: Number(e.target.value) }))}>
                    {Array.from({ length: settings.finalAttempts }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n} de {settings.finalAttempts}{n === settings.finalAttempts ? ' → pasa a Libre automáticamente' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="modal__grade-inputs" style={{ alignItems: 'flex-end' }}>
                  <div className="modal__grade-input-wrap">
                    <label className="modal__grade-input-label">Nota del último intento</label>
                    <input className="form-control modal__grade-input" type="number" min={1} max={10} step={0.5}
                      value={form.gradeFinalExam} onChange={onChange('gradeFinalExam')} placeholder="—" />
                    {form.gradeFinalExam && !isNaN(+form.gradeFinalExam) &&
                      <span className="modal__grade-dot" style={{ background: dc(+form.gradeFinalExam, 'final') }} />}
                  </div>
                  <div className="modal__grade-input-wrap" style={{ flex: 1 }}>
                    <label className="modal__grade-input-label">Fecha del intento</label>
                    <input className="form-control" type="date" value={form.finalDate} onChange={onChange('finalDate')} />
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px', background: 'rgba(251,146,60,0.08)',
                  border: '1px solid rgba(251,146,60,0.2)', borderRadius: 10,
                  fontSize: '0.75rem', color: '#fb923c', lineHeight: 1.5
                }}>
                  <Danger size={12} color='currentColor' style={{ position: "relative", top: "2" }} />{' '}
                  Al llegar a {settings.finalAttempts} intentos, la materia pasa automáticamente a <strong>Libre</strong>.
                  {(form.finalAttempts ?? 1) === settings.finalAttempts && ' Este es el último intento.'}
                </div>
              </div>
            )}

            {isInProgress && (
              <>
                <div className="modal__section modal__section--grades">
                  <div className="modal__section-header">
                    <div className="modal__section-title">
                      <span className="modal__section-icon"><Ranking size={16} /></span>
                      Notas de cursada
                      <span className='Calculan' style={{ fontSize: '0.65rem', color: '#3e3e5e', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        · se calculan cuando cerrás el cuatrimestre
                      </span>
                    </div>
                    <div className="modal__grade-toggle">
                      <button type="button" className={`modal__grade-toggle-btn${gradeTab === 'auto' ? ' active' : ''}`} onClick={() => setGradeTab('auto')}>Auto</button>
                      <button type="button" className={`modal__grade-toggle-btn${gradeTab === 'manual' ? ' active' : ''}`} onClick={() => setGradeTab('manual')}>Manual</button>
                    </div>
                  </div>

                  {gradeTab === 'auto' ? (
                    <>
                      <div className="modal__grade-inputs">
                        <ParcialInputs />
                      </div>

                      {computed.outcome && computed.value !== null && (() => {
                        const outcome = computed.outcome!
                        return (
                          <div className="modal__grade-result" style={{ borderColor: outcome.color + '44' }}>
                            <div className="modal__grade-result-left">
                              <div className="modal__grade-result-formula">{computed.formula}</div>
                              <div className="modal__grade-result-sublabel">{outcome.sub}</div>
                            </div>
                            <div className="modal__grade-result-badge" style={{ color: outcome.color, borderColor: outcome.color + '55' }}>
                              <span className="modal__grade-result-num">{computed.value}</span>
                              <span className="modal__grade-result-label-text">{outcome.label}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {!computed.outcome && (
                        <p className="modal__grade-hint">
                          Cargá {settings.parcialCount === 1 ? 'el parcial' : `los ${settings.parcialCount} parciales`} para ver el resultado estimado.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="modal__grade-manual">
                      <div className="modal__grade-manual-wrap">
                        <input className="form-control modal__grade-input--lg" type="number" min={1} max={10} step={0.5}
                          value={form.gradeOverride} onChange={onChange('gradeOverride')} placeholder="Promedio manual" />
                        {form.gradeOverride && !isNaN(+form.gradeOverride) && (
                          <div className="modal__grade-manual-badge"
                            style={{ color: dc(+form.gradeOverride), borderColor: dc(+form.gradeOverride) + '44' }}>
                            {+form.gradeOverride >= promotionThreshold ? 'Aprobada directo'
                              : +form.gradeOverride >= regularThreshold ? 'Va al final' : 'Libre'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal__section">
                  <div className="modal__section-header">
                    <div className="modal__section-title">
                      <span className="modal__section-icon"><Clock size={15} color="currentColor" /></span>
                      Horarios de clase
                      {schedules.length > 0 && <span className="modal__section-badge">{schedules.length}</span>}
                    </div>
                    <button type="button" className="modal__exam-add" onClick={addSchedule}>+ Agregar</button>
                  </div>
                  {schedules.length === 0
                    ? <div className="modal__exam-empty" onClick={addSchedule}><span>Sin horarios · clic para agregar</span></div>
                    : (
                      <div className="modal__schedule-list">
                        {schedules.map(s => (
                          <div key={s.id} className="modal__schedule-row">
                            <select className="modal__schedule-day" value={s.day}
                              onChange={e => updateSchedule(s.id, { day: e.target.value as ClassSchedule['day'] })}>
                              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <input type="time" className="modal__schedule-time" value={s.timeFrom}
                              onChange={e => updateSchedule(s.id, { timeFrom: e.target.value })} />
                            <span className="modal__schedule-sep">–</span>
                            <input type="time" className="modal__schedule-time" value={s.timeTo}
                              onChange={e => updateSchedule(s.id, { timeTo: e.target.value })} />
                            <input type="text" className="modal__schedule-loc" value={s.location}
                              placeholder="Aula / sede..." onChange={e => updateSchedule(s.id, { location: e.target.value })} />
                            <button type="button" className="modal__exam-remove" onClick={() => removeSchedule(s.id)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="modal__section">
                  <div className="modal__section-header">
                    <div className="modal__section-title">
                      <span className="modal__section-icon"><Calendar size={15} color="currentColor" /></span>
                      Fechas de parciales
                      {examDates.length > 0 && <span className="modal__section-badge">{examDates.length}</span>}
                    </div>
                    <button type="button" className="modal__exam-add" onClick={addExam}>+ Agregar</button>
                  </div>
                  {upcomingExams.length > 0 && (
                    <div className="modal__upcoming-list">
                      {upcomingExams.slice(0, 3).map(exam => {
                        const days = daysUntil(exam.date)
                        const soon = days !== null && days <= 7
                        return (
                          <div key={exam.id} className="modal__upcoming-item"
                            style={{ background: EXAM_TYPE_COLORS[exam.type], borderColor: EXAM_TYPE_BORDER[exam.type] }}>
                            <span className="modal__upcoming-type">{EXAM_TYPE_LABELS[exam.type]}</span>
                            <span className="modal__upcoming-date">{fmtShortDate(exam.date)}</span>
                            <span className={`modal__upcoming-days${soon ? ' modal__upcoming-days--soon' : ''}`}>
                              {days === 0 ? '¡Hoy!' : days === 1 ? 'Mañana' : `en ${days}d`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {sortedExams.length === 0
                    ? <div className="modal__exam-empty" onClick={addExam}><span>Sin fechas · clic para agregar parciales, recuperatorios…</span></div>
                    : (
                      <div className="modal__exam-list">
                        {sortedExams.map(exam => (
                          <div key={exam.id} className="modal__exam-row"
                            style={{ background: EXAM_TYPE_COLORS[exam.type], borderColor: EXAM_TYPE_BORDER[exam.type] }}>
                            <select className="modal__exam-select" value={exam.type}
                              onChange={e => updateExam(exam.id, { type: e.target.value as ExamDate['type'] })}>
                              {(Object.keys(EXAM_TYPE_LABELS) as ExamDate['type'][]).map(t =>
                                <option key={t} value={t}>{EXAM_TYPE_LABELS[t]}</option>
                              )}
                            </select>
                            <input type="date" className="modal__exam-date" value={exam.date}
                              onChange={e => updateExam(exam.id, { date: e.target.value })} />
                            <input type="text" className="modal__exam-notes" value={exam.notes}
                              placeholder="nota..." onChange={e => updateExam(exam.id, { notes: e.target.value })} />
                            <button type="button" className="modal__exam-remove" onClick={() => removeExam(exam.id)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="modal__section modal__section--corr">
                  <div className="modal__section-header">
                    <div className="modal__section-title">Notas y recursos</div>
                  </div>

                  <div className="modal__grid-2">
                    <Field label="Zoom / Meet">
                      <input className="form-control" value={form.zoomLink}
                        onChange={onChange('zoomLink')} placeholder="https://zoom.us/j/..." />
                    </Field>
                    <Field label="Aula virtual">
                      <input className="form-control" value={form.aulaVirtualLink}
                        onChange={onChange('aulaVirtualLink')} placeholder="https://campus..." />
                    </Field>
                  </div>

                  <Field label="Notas / observaciones">
                    <textarea className="form-control" value={form.notes} onChange={onChange('notes')}
                      placeholder="Apuntes, links, fechas tentativas..." />
                  </Field>
                </div>
              </>
            )}

            {isPendingFinal && (
              <>
                <div className="modal__section modal__section--grades">
                  <div className="modal__section-header">
                    <div className="modal__section-title">
                      <span className="modal__section-icon"><Ranking size={16} /></span>
                      Notas de cursada
                    </div>
                    <div className="modal__grade-toggle">
                      <button type="button" className={`modal__grade-toggle-btn${gradeTab === 'auto' ? ' active' : ''}`} onClick={() => setGradeTab('auto')}>Auto</button>
                      <button type="button" className={`modal__grade-toggle-btn${gradeTab === 'manual' ? ' active' : ''}`} onClick={() => setGradeTab('manual')}>Manual</button>
                    </div>
                  </div>
                  {gradeTab === 'auto' ? (
                    <>
                      <div className="modal__grade-inputs"><ParcialInputs /></div>
                      {computed.value !== null && (
                        <div className="modal__grade-result" style={{ borderColor: '#fbbf2444' }}>
                          <div className="modal__grade-result-left">
                            <div className="modal__grade-result-formula">{computed.formula}</div>
                            <div className="modal__grade-result-sublabel">Promedio de cursada · pendiente rendir final</div>
                          </div>
                          <div className="modal__grade-result-badge" style={{ color: '#fbbf24', borderColor: '#fbbf2455' }}>
                            <span className="modal__grade-result-num">{computed.value}</span>
                            <span className="modal__grade-result-label-text">Cursada</span>
                          </div>
                        </div>
                      )}
                      {computed.value === null && (
                        <p className="modal__grade-hint">Cargá los parciales para ver el promedio de cursada.</p>
                      )}
                    </>
                  ) : (
                    <div className="modal__grade-manual">
                      <div className="modal__grade-manual-wrap">
                        <input className="form-control modal__grade-input--lg" type="number" min={1} max={10} step={0.5}
                          value={form.gradeOverride} onChange={onChange('gradeOverride')} placeholder="Promedio manual" />
                        {form.gradeOverride && !isNaN(+form.gradeOverride) && (
                          <div className="modal__grade-manual-badge"
                            style={{ color: dc(+form.gradeOverride), borderColor: dc(+form.gradeOverride) + '44' }}>
                            Promedio {form.gradeOverride}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal__section">
                  <div className="modal__section-header">
                    <div className="modal__section-title">
                      <span className="modal__section-icon"><Calendar size={15} color="currentColor" /></span>
                      Final
                    </div>
                  </div>
                  <div className="modal__grade-inputs" style={{ alignItems: 'flex-end' }}>
                    <div className="modal__grade-input-wrap" style={{ flex: 1 }}>
                      <label className="modal__grade-input-label">Fecha del final</label>
                      <input className="form-control" type="date" value={form.finalDate} onChange={onChange('finalDate')} />
                    </div>
                    <div className="modal__grade-input-wrap">
                      <label className="modal__grade-input-label">Nota (si ya rendiste)</label>
                      <input className="form-control modal__grade-input" type="number" min={1} max={10} step={0.5}
                        value={form.gradeFinalExam} onChange={onChange('gradeFinalExam')} placeholder="—" />
                      {form.gradeFinalExam && !isNaN(+form.gradeFinalExam) &&
                        <span className="modal__grade-dot" style={{ background: dc(+form.gradeFinalExam, 'final') }} />}
                    </div>
                  </div>
                  {form.gradeFinalExam && !isNaN(+form.gradeFinalExam) && (() => {
                    const n = +form.gradeFinalExam
                    const outcome = n >= regularThreshold
                      ? { label: 'Aprobada', sub: `Final ≥ ${regularThreshold} · materia aprobada`, color: '#4ade80' }
                      : { label: 'Desaprobado', sub: `Final < ${regularThreshold} · intentá de nuevo`, color: '#f87171' }
                    return (
                      <div className="modal__grade-result" style={{ borderColor: outcome.color + '44' }}>
                        <div className="modal__grade-result-left">
                          <div className="modal__grade-result-formula">Final: {n}</div>
                          <div className="modal__grade-result-sublabel">{outcome.sub}</div>
                        </div>
                        <div className="modal__grade-result-badge" style={{ color: outcome.color, borderColor: outcome.color + '55' }}>
                          <span className="modal__grade-result-num">{n}</span>
                          <span className="modal__grade-result-label-text">{outcome.label}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {(form.gradeHistory ?? []).length > 0 && (
                  <div className="modal__section">
                    <div className="modal__section-header">
                      <div className="modal__section-title">
                        Cursadas anteriores
                        <span className="modal__section-badge">{form.gradeHistory!.length}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {form.gradeHistory!.map((entry, i) => {
                        const avg = entry.gradeOverride ??
                          (entry.gradeP1 != null && entry.gradeP2 != null
                            ? Math.round(((entry.gradeP1 + entry.gradeP2) / 2) * 100) / 100
                            : entry.gradeFinalExam ?? null)
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
                            fontSize: '0.78rem', color: 'var(--muted)',
                          }}>
                            <span>Cursada {i + 1} · {entry.year}° año, {entry.semester}° cuatri</span>
                            <span style={{ color: avg != null ? dc(avg) : 'var(--muted)', fontWeight: 600 }}>
                              {avg != null ? avg : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {isApproved && (
              <>
                <div className="modal__section modal__section--grades">
                  <div className="modal__section-header">
                    <div className="modal__section-title">
                      <span className="modal__section-icon"><Ranking size={16} /></span>
                      Nota final
                    </div>
                    <div className="modal__grade-toggle">
                      <button type="button" className={`modal__grade-toggle-btn${gradeTab === 'auto' ? ' active' : ''}`} onClick={() => setGradeTab('auto')}>Auto</button>
                      <button type="button" className={`modal__grade-toggle-btn${gradeTab === 'manual' ? ' active' : ''}`} onClick={() => setGradeTab('manual')}>Manual</button>
                    </div>
                  </div>
                  {gradeTab === 'auto' ? (
                    <>
                      <div className="modal__grade-inputs">
                        <ParcialInputs />
                        {(() => {
                          const hideFinal = computed.value !== null && computed.value >= promotionThreshold
                          if (hideFinal) return null
                          return (
                            <>
                              <div className="modal__grade-sep modal__grade-sep--or">ó</div>
                              <div className="modal__grade-input-wrap modal__grade-input-wrap--final">
                                <label className="modal__grade-input-label">Final rendido</label>
                                <input className="form-control modal__grade-input" type="number" min={1} max={10} step={0.5}
                                  value={form.gradeFinalExam} onChange={onChange('gradeFinalExam')} placeholder="—" />
                                {form.gradeFinalExam && !isNaN(+form.gradeFinalExam) &&
                                  <span className="modal__grade-dot" style={{ background: dc(+form.gradeFinalExam, 'final') }} />}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      {computed.outcome && computed.value !== null && (
                        <div className="modal__grade-result" style={{ borderColor: computed.outcome.color + '44' }}>
                          <div className="modal__grade-result-left">
                            <div className="modal__grade-result-formula">{computed.formula}</div>
                            <div className="modal__grade-result-sublabel">{computed.outcome.sub}</div>
                          </div>
                          <div className="modal__grade-result-badge"
                            style={{ color: computed.outcome.color, borderColor: computed.outcome.color + '55' }}>
                            <span className="modal__grade-result-num">{computed.value}</span>
                            <span className="modal__grade-result-label-text">{computed.outcome.label}</span>
                          </div>
                        </div>
                      )}
                      {!computed.value && <p className="modal__grade-hint">Cargá los parciales o el final rendido.</p>}
                    </>
                  ) : (
                    <div className="modal__grade-manual">
                      <div className="modal__grade-manual-wrap">
                        <input className="form-control modal__grade-input--lg" type="number" min={1} max={10} step={0.5}
                          value={form.gradeOverride} onChange={onChange('gradeOverride')} placeholder="1 – 10" />
                        {form.gradeOverride && !isNaN(+form.gradeOverride) && (
                          <div className="modal__grade-manual-badge"
                            style={{ color: dc(+form.gradeOverride), borderColor: dc(+form.gradeOverride) + '44' }}>
                            {+form.gradeOverride >= promotionThreshold ? 'Aprobada directo'
                              : +form.gradeOverride >= regularThreshold ? 'Aprobada (final)' : 'Desaprobado'}
                          </div>
                        )}
                      </div>
                      <p className="modal__grade-hint">Esta nota sobreescribe el cálculo automático.</p>
                    </div>
                  )}
                  {effectiveGrade !== null && (
                    <div className="modal__grade-effective">
                      <span className="modal__grade-effective-label">Nota guardada</span>
                      <span className="modal__grade-effective-value" style={{ color: dc(effectiveGrade) }}>
                        {effectiveGrade}<span className="modal__grade-effective-sublabel">/10</span>
                      </span>
                    </div>
                  )}
                </div>
                <Field label="Fecha de aprobación">
                  <input className="form-control" type="date" value={form.approvedDate} onChange={onChange('approvedDate')} />
                </Field>
              </>
            )}

            <div className="modal__section modal__section--corr">
              <div className="modal__section-header">
                <div className="modal__section-title">
                  Correlativas
                  {form.corrApproved.length > 0 && <span className="modal__section-badge">{form.corrApproved.length}</span>}
                </div>
              </div>
              <div className="modal__corr-info">
                Podés cursarla libremente. Para <strong>dar el final</strong> (promedio {regularThreshold}–{promotionThreshold - 1}) o{' '}
                <strong>aprobar directo</strong> (promedio ≥ {promotionThreshold}) necesitás tener estas materias aprobadas.
              </div>
              <Field label="Código de correlativa (x.x.x) · Enter para agregar">
                <CorrInput tags={form.corrApproved} onChange={v => setForm(f => ({ ...f, corrApproved: v }))} />
              </Field>
              {form.corrApproved.length === 0 && (
                <p className="modal__corr-empty">Sin correlativas · sin requisitos previos.</p>
              )}
            </div>

            {form.status === 'free' && (
              <div className="modal__section modal__section--grades">
                <div className="modal__section-header">
                  <div className="modal__section-title">
                    <span className="modal__section-icon"><Ranking size={16} /></span>
                    Examen libre
                  </div>
                </div>
                <div className="modal__grade-inputs" style={{ alignItems: 'flex-end' }}>
                  <div className="modal__grade-input-wrap">
                    <label className="modal__grade-input-label">Nota del examen</label>
                    <input className="form-control modal__grade-input" type="number" min={1} max={10} step={0.5}
                      value={form.gradeFinalExam}
                      onChange={e => {
                        onChange('gradeFinalExam')(e)
                        const n = parseFloat(e.target.value)
                        if (!isNaN(n)) {
                          if (n >= settings.freeExamMinGrade) {
                            setForm(f => ({ ...f, status: 'approved', gradeFinalExam: e.target.value }))
                            setStatusManuallySet(true)
                          } else {
                            setForm(f => ({ ...f, status: 'retaking', gradeFinalExam: '' }))
                            setStatusManuallySet(true)
                          }
                        }
                      }}
                      placeholder="—" />
                    {form.gradeFinalExam && !isNaN(+form.gradeFinalExam) &&
                      <span className="modal__grade-dot" style={{ background: dc(+form.gradeFinalExam, 'final') }} />}
                  </div>
                  <div className="modal__grade-input-wrap" style={{ flex: 1 }}>
                    <label className="modal__grade-input-label">Fecha</label>
                    <input className="form-control" type="date" value={form.finalDate} onChange={onChange('finalDate')} />
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px', background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                  fontSize: '0.75rem', color: '#a5b4fc', lineHeight: 1.5
                }}>
                  <Danger size={12} color="currentColor" style={{ position: 'relative', top: 2 }} />{' '}
                  Nota ≥ {settings.freeExamMinGrade} → <strong>Aprobada</strong>. Nota &lt; {settings.freeExamMinGrade} → pasa a <strong>Recursada</strong>.
                </div>
              </div>
            )}
          </div>



          <ToastContainer toasts={toasts} onRemove={remove} />

          <div className="modal__actions">
            {isEdit && subject && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(subject.id)}>
                <Trash size={16} color="currentColor" />
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn--primary" onClick={handleSave}>
              {isEdit ? 'Guardar cambios' : 'Agregar materia'}
            </button>
          </div>

        </div>
      </div>

      {showNotionPicker && (
        <NotionPagePicker
          currentPage={form.notionPageId ? {
            id: form.notionPageId,
            title: form.notionPageTitle ?? 'Página vinculada',
            url: form.notionPageUrl ?? '',
          } : null}
          onSelect={handleNotionSelect}
          onClose={() => setShowNotionPicker(false)}
        />
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {children}
    </div>
  )
}