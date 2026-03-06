import { useState, useEffect, useRef, useCallback } from 'react'
import type { Subject, GradeHistoryEntry } from '../types/types'
import { STATUS_CONFIG } from '../../src/assets/constants'
import { getEffectiveStatus } from '../App'
import './SubjectCard.css'
import { Trash, InfoCircle, Copy, Edit, CloseCircle } from 'iconsax-react'
import { CheckCircle, X, Pencil, Calendar, BookOpen, TrendingUp, AlertCircle, MapPin } from 'lucide-react'

interface Props {
  subject: Subject
  allSubjects: Subject[]
  onCopy?: () => void
  currentYear: number
  onEdit: (id: string) => void
  onCycle: (id: string) => void
  onDelete: (id: string) => void
  compact?: boolean
}

interface ContextMenuState { visible: boolean; x: number; y: number }

function fmtDate(d: string): string {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getApprovedSet(allSubjects: Subject[]) {
  return new Set(allSubjects.filter(s => s.status === 'approved').map(s => s.code.toLowerCase()))
}

function NotionIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z" />
    </svg>
  )
}

const DAY_LABELS: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', 'mié': 'Miércoles', jue: 'Jueves', vie: 'Viernes', sáb: 'Sábado',
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}
const DAY_SHORT: Record<string, string> = {
  lun: 'Lun', mar: 'Mar', 'mié': 'Mié', jue: 'Jue', vie: 'Vie', sáb: 'Sáb',
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}
function dayLong(d: string) { return DAY_LABELS[d?.toLowerCase()] ?? DAY_LABELS[d] ?? d }
function dayShort(d: string) { return DAY_SHORT[d?.toLowerCase()] ?? DAY_SHORT[d] ?? d?.slice(0, 3) ?? d }

const EXAM_META: Record<string, { label: string; cls: string }> = {
  parcial: { label: 'Parcial', cls: 'exam--parcial' },
  final: { label: 'Final', cls: 'exam--final' },
  recuperatorio: { label: 'Recup.', cls: 'exam--recup' },
  coloquio: { label: 'Coloquio', cls: 'exam--coloquio' },
  otro: { label: 'Otro', cls: 'exam--otro' },
}

function gradeColorClass(g: number | null) {
  if (g == null) return 'grade--none'
  if (g >= 7) return 'grade--green'
  if (g >= 4) return 'grade--yellow'
  return 'grade--red'
}


function termLabel(term: Subject['term']) {
  switch (term) {
    case 'Q1':
      return '1°C'
    case 'Q2':
      return '2°C'
    case 'ANNUAL':
      return 'Anual'
  }
}


export function DetailModal({ subject, allSubjects, onClose, onEdit }: {
  subject: Subject; allSubjects: Subject[]; onClose: () => void; onEdit: () => void
}) {
  const cfg = STATUS_CONFIG[subject.status]
  const approvedSet = getApprovedSet(allSubjects)
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'history'>('info')
  const today = new Date()

  useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t) }, [])

  const handleClose = () => { setVisible(false); setTimeout(onClose, 260) }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])



  const schedules: any[] = subject.schedules ?? []
  const examDates: any[] = subject.examDates ?? []
  const gradeHistory: GradeHistoryEntry[] = subject.gradeHistory ?? []
  const attempts = subject.finalAttempts ?? 0

  const hasSchedules = schedules.length > 0
  const hasExams = examDates.length > 0
  const hasHistory = gradeHistory.length > 0

  const tabs = [
    { key: 'info' as const, label: 'Información' },
    ...(hasSchedules || hasExams ? [{ key: 'schedule' as const, label: 'Cursada' }] : []),
    ...(hasHistory ? [{ key: 'history' as const, label: 'Historial' }] : []),
  ]

  const accentStyle = { '--dm-accent': cfg.color ?? '#6366f1' } as React.CSSProperties

  return (
    <div
      className={`dm-overlay${visible ? ' dm-overlay--visible' : ''}`}
      style={accentStyle}
      onClick={handleClose}
    >
      <div
        className={`dm${visible ? ' dm--visible' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="dm__glow" />

        <div className="dm__header">
          <div className="dm__header-left">
            <h2 className="dm__name">{subject.name || 'Sin nombre'}</h2>
            {subject.code && (
              <div className="dm__meta">
                <span className="dm__meta-dot" />
                <span className="dm__meta-code">{subject.code}</span>
                <span className="dm__meta-sep">·</span>
                <span className="kb-card__year">
                  {subject.year}° · {termLabel(subject.term)}
                </span>
                <span className="dm__meta-sep">·</span>
                <span className="dm__meta-item">
                  {subject.term === 'ANNUAL'
                    ? 'Anual'
                    : subject.term === 'Q1'
                      ? '1° cuatrimestre'
                      : '2° cuatrimestre'}
                </span>
              </div>
            )}
          </div>
          <div className="dm__header-actions">
            <button className="dm__edit-btn" onClick={() => { handleClose(); setTimeout(onEdit, 280) }}>
              <Edit size={11} color="currentColor" /> Editar
            </button>
            <button className="dm__close-btn" onClick={handleClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="dm__badge-wrap">
          <span
            className="subject-card__badge dm__status-badge"
            style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}28` }}
          >
            <span className="subject-card__badge-dot" style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }} />
            {cfg.label}
          </span>
        </div>

        {tabs.length > 1 && (
          <div className="dm__tabs">
            {tabs.map(t => (
              <button key={t.key} className={`dm__tab${activeTab === t.key ? ' dm__tab--active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="dm__divider" />

        <div className="dm__body">

          {activeTab === 'info' && (<>

            {subject.grade != null && (
              <div className="dm__grade-hero">

                <div className="dm__grade-hero-info">
                  <div className="dm__sec-label">Nota final</div>
                  <div className="dm__grade-hero-sub">
                    {subject.grade >= 7 ? 'Promoción directa' : subject.grade >= 4 ? 'Aprobado con final' : 'Desaprobado'}
                  </div>
                  {subject.gradeFinalExam != null && (
                    <div className="dm__grade-hero-detail">Examen final: <strong>{subject.gradeFinalExam}</strong></div>
                  )}
                  {subject.gradeP1 != null && subject.gradeP2 != null && (
                    <div className="dm__grade-hero-parciales">
                      <span>P1: <strong>{subject.gradeP1}</strong></span>
                      <span>P2: <strong>{subject.gradeP2}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {subject.grade == null && (subject.gradeP1 != null || subject.gradeP2 != null) && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <TrendingUp size={12} className="dm__sec-icon" /><span className="dm__sec-title">Notas de cursada</span>
                </div>
                <div className="dm__sec-body">
                  <div className="dm__parciales">
                    {[{ label: 'Parcial 1', val: subject.gradeP1 }, { label: 'Parcial 2', val: subject.gradeP2 }]
                      .filter(p => p.val != null).map(p => (
                        <div key={p.label} className={`dm__parcial-card ${gradeColorClass(p.val!)}`}>
                          <div className="dm__parcial-num">{p.val}</div>
                          <div className="dm__parcial-label">{p.label}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {attempts > 0 && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <AlertCircle size={12} className="dm__sec-icon" /><span className="dm__sec-title">Intentos de final</span>
                </div>
                <div className="dm__sec-body">
                  <div className="dm__attempts-row">
                    <span className="dm__attempts-text">{attempts} de 3 intentos usados</span>
                    {attempts >= 3 && <span className="dm__attempts-limit">LÍMITE</span>}
                  </div>
                  <div className="dm__attempts-bar">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`dm__attempts-slot${i < attempts ? (attempts >= 3 ? ' dm__attempts-slot--danger' : ' dm__attempts-slot--used') : ''}`} />
                    ))}
                  </div>
                  {attempts === 2 && <div className="dm__attempts-warn"><AlertCircle size={11} /> Último intento disponible</div>}
                </div>
              </div>
            )}

            {(subject.approvedDate || subject.finalDate) && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <Calendar size={12} className="dm__sec-title" color='currentColor' /><span className="dm__sec-title">Fechas</span>
                </div>
                <div className="dm__sec-body">
                  {subject.approvedDate && (
                    <div className="dm__date-row">
                      <span className="dm__date-label">Fecha de aprobación</span>
                      <span className="dm__date-pill dm__date-pill--green">{fmtDate(subject.approvedDate)}</span>
                    </div>
                  )}
                  {subject.finalDate && (
                    <div className="dm__date-row">
                      <span className="dm__date-label">Fecha de final</span>
                      <span className="dm__date-pill dm__date-pill--yellow">{fmtDate(subject.finalDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {subject.corrApproved.length > 0 && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <span className="dm__sec-title">Correlativas para final</span>
                </div>
                <div className="dm__sec-body">
                  {subject.corrApproved.map(c => {
                    const met = approvedSet.has(c.toLowerCase())
                    const found = allSubjects.find(s => s.code.toLowerCase() === c.toLowerCase())
                    return (
                      <div key={c} className={`dm__corr-item${met ? ' dm__corr-item--met' : ' dm__corr-item--unmet'}`}>
                        <div className="dm__corr-icon">
                          {met ? <CheckCircle size={12} color="#4ade80" /> : <X size={11} color="#f87171" />}
                        </div>
                        <div className="dm__corr-info">
                          <div className="dm__corr-name">{found ? found.name : c}</div>
                          {!met && (
                            <div className="dm__corr-hint">
                              {!found ? 'No encontrada' : found.status === 'locked' ? 'Bloqueada' : found.status === 'in_progress' ? 'En cursada' : found.status === 'pending_final' ? 'Final pendiente' : 'No aprobada'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {subject.notionPageUrl && (
              <a href={subject.notionPageUrl} target="_blank" rel="noopener noreferrer" className="dm__notion-link" onClick={e => e.stopPropagation()}>
                <NotionIcon size={14} />
                <span className="dm__notion-title">{subject.notionPageTitle ?? 'Abrir en Notion'}</span>
                <span className="dm__notion-arrow">↗</span>
              </a>
            )}

            {subject.notes && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <BookOpen size={12} className="dm__sec-icon" /><span className="dm__sec-title">Notas personales</span>
                </div>
                <div className="dm__sec-body">
                  <p className="dm__notes-text">{subject.notes}</p>
                </div>
              </div>
            )}

            {!subject.grade && !subject.gradeP1 && !subject.gradeP2 && !subject.approvedDate && !subject.finalDate && !subject.corrApproved.length && !subject.notes && (
              <div className="dm__empty">Sin información adicional registrada</div>
            )}
          </>)}

          {activeTab === 'schedule' && (<>
            {hasSchedules && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <span className="dm__sec-title">Horarios de clase</span>
                </div>
                <div className="dm__sec-body">
                  {schedules.map((s: any, i: number) => (
                    <div key={s.id ?? i} className="dm__schedule-row">
                      <div className="dm__schedule-day">{dayShort(s.day)}</div>
                      <div className="dm__schedule-info">
                        <div className="dm__schedule-time">
                          {s.timeFrom && s.timeTo ? `${s.timeFrom} – ${s.timeTo}` : s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : 'Horario sin definir'}
                        </div>
                        <div className="dm__schedule-meta">
                          {s.location && <span className="dm__schedule-loc"><MapPin size={9} /> {s.location}</span>}
                          {s.professor && <span className="dm__schedule-prof">{s.professor}</span>}
                          {dayLong(s.day) && <span className="dm__schedule-daylong">{dayLong(s.day)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasExams && (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <Calendar size={12} className="dm__sec-icon" /><span className="dm__sec-title">Fechas de exámenes</span>
                </div>
                <div className="dm__sec-body">
                  {[...examDates].sort((a: any, b: any) => (a.date ?? '').localeCompare(b.date ?? '')).map((e: any, i: number) => {
                    const isPast = e.date && new Date(e.date + 'T00:00:00') < today
                    const daysLeft = e.date ? Math.ceil((new Date(e.date + 'T00:00:00').getTime() - today.getTime()) / 86400000) : null
                    const meta = EXAM_META[e.type] ?? EXAM_META.otro
                    return (
                      <div key={e.id ?? i} className={`dm__exam-row ${meta.cls}${isPast ? ' dm__exam-row--past' : ''}`}>
                        <span className="dm__exam-type">{meta.label}</span>
                        <span className="dm__exam-date-text">{fmtDate(e.date)}</span>
                        {e.notes && <span className="dm__exam-notes">{e.notes}</span>}
                        {!isPast && daysLeft !== null && (
                          <span className={`dm__exam-days${daysLeft <= 3 ? ' dm__exam-days--urgent' : ''}`}>
                            {daysLeft === 0 ? '¡Hoy!' : daysLeft === 1 ? 'Mañana' : `${daysLeft}d`}
                          </span>
                        )}
                        {isPast && <span className="dm__exam-past-label">pasado</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!hasSchedules && !hasExams && <div className="dm__empty">Sin datos de cursada registrados</div>}
          </>)}

          {activeTab === 'history' && (<>
            {hasHistory ? (
              <div className="dm__sec">
                <div className="dm__sec-header">
                  <TrendingUp size={12} className="dm__sec-icon" /><span className="dm__sec-title">Historial de cursadas</span>
                </div>
                <div className="dm__sec-body">
                  {gradeHistory.map((h, i) => {
                    const avg = h.gradeOverride ??
                      (h.gradeP1 != null && h.gradeP2 != null
                        ? Math.round(((h.gradeP1 + h.gradeP2) / 2) * 100) / 100
                        : h.gradeFinalExam ?? null)
                    const gc = gradeColorClass(avg)
                    return (
                      <div key={i} className={`dm__history-row ${gc}`}>
                        <div className={`dm__history-badge ${gc}`}>{avg ?? '–'}</div>
                        <div className="dm__history-info">
                          <div className="dm__history-period">
                            {h.year ? `${h.year}° año` : `Cursada ${i + 1}`}{h.semester ? ` · ${h.semester}° cuatrimestre` : ''}
                          </div>
                          {(h.gradeP1 != null || h.gradeP2 != null) && (
                            <div className="dm__history-parciales">
                              {h.gradeP1 != null && <span>P1: {h.gradeP1}</span>}
                              {h.gradeP2 != null && <span>P2: {h.gradeP2}</span>}
                            </div>
                          )}
                        </div>
                        <span className={`dm__history-status ${gc}`}>
                          {avg == null ? 'Sin nota' : avg >= 4 ? 'Aprobado' : 'Desaprobado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="dm__empty">Sin historial registrado</div>
            )}
          </>)}
        </div>

        <div className="dm__footer">
          <Pencil size={9} /> Doble click en la card para editar · Esc para cerrar
        </div>
      </div>
    </div >
  )
}


export function SubjectCard({ subject, allSubjects, onCopy, currentYear, onEdit, onDelete, compact = false }: Props) {
  const { id, name, code, corrApproved, finalDate, approvedDate, grade, notes } = subject
  const effectiveStatus = getEffectiveStatus(subject, currentYear, allSubjects)
  const cfg = STATUS_CONFIG[effectiveStatus]
  const isLocked = effectiveStatus === 'locked'

  const [menu, setMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 })
  const [showDetail, setShowDetail] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const approvedSet = getApprovedSet(allSubjects)
  const unmetCorrs = corrApproved.filter(c => !approvedSet.has(c.toLowerCase()))
  const unmetCount = unmetCorrs.length
  const closeMenu = useCallback(() => setMenu(m => ({ ...m, visible: false })), [])
  const [hovered, setHovered] = useState(false)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!menu.visible) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu() }
    window.addEventListener('mousedown', h); return () => window.removeEventListener('mousedown', h)
  }, [menu.visible, closeMenu])

  const handleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current); clickTimer.current = null; onEdit(id)
    } else {
      clickTimer.current = setTimeout(() => { clickTimer.current = null; setShowDetail(true) }, 220)
    }
  }


  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const menuW = 200, menuH = 210
    const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX
    const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY
    setMenu({ visible: true, x, y })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText([name, code].filter(Boolean).join(' — ')).catch(() => { })
    onCopy?.()
    closeMenu()
  }
  return (
    <>
      <div
        className={['subject-card', `subject-card--${effectiveStatus}`, compact && 'subject-card--compact'].filter(Boolean).join(' ')}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => compact && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Click para ver · Doble click para editar"
      >
        {!compact && (
          <div className="subject-card__header">
            <div className="subject-card__name">{name || 'Sin nombre'}</div>
            <div className="subject-card__actions" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {code && <div className="subject-card__code">{code}</div>}

        <span className="subject-card__badge" style={{ background: cfg.bg, color: cfg.color }}>
          <span className="subject-card__badge-dot" style={{ background: cfg.color }} />
          {cfg.label}
          {isLocked && unmetCount > 0 && (
            <span className="subject-card__lock-count">{unmetCount} corr. pendiente{unmetCount !== 1 ? 's' : ''}</span>
          )}
        </span>

        {!compact && corrApproved.length > 0 && (
          <div className="subject-card__corr-list">
            {corrApproved.map(c => {
              const met = approvedSet.has(c.toLowerCase())
              const found = allSubjects.find(s => s.code.toLowerCase() === c.toLowerCase())
              return (
                <span key={c} className={`subject-card__corr-tag subject-card__corr-tag--${met ? 'met' : 'unmet'}`} title={met ? 'Correlativa aprobada' : 'Pendiente'}>
                  {met ? <CheckCircle size={12} color="#4ade80" /> : <CloseCircle size={12} color="#f87171" />}
                  {found ? found.name : c}
                </span>
              )
            })}
          </div>
        )}

        {!compact && effectiveStatus === 'failed_final' && (
          <div className="subject-card__attempts">{subject.finalAttempts ?? 1}/3 intentos de final</div>
        )}
        {!compact && (['pending_final', 'in_progress', 'retaking', 'failed_final'] as const).includes(effectiveStatus as any) && finalDate && (
          <div className="subject-card__date subject-card__date--final">Final: {fmtDate(finalDate)}</div>
        )}
        {!compact && effectiveStatus === 'retaking' && (subject.gradeHistory?.length ?? 0) > 0 && (
          <div className="subject-card__attempts">{subject.gradeHistory!.length}ª vez recursada</div>
        )}
        {!compact && effectiveStatus === 'approved' && approvedDate && (
          <div className="subject-card__date subject-card__date--approved">{fmtDate(approvedDate)}</div>
        )}
        {!compact && effectiveStatus === 'approved' && grade !== null && (
          <div className="subject-card__grade">{grade}</div>
        )}
        {!compact && notes && <div className="subject-card__notes">{notes}</div>}
        {!compact && subject.notionPageUrl && (
          <a href={subject.notionPageUrl} target="_blank" rel="noopener noreferrer"
            className="subject-card__notion-btn" onClick={e => e.stopPropagation()}
            title={subject.notionPageTitle ?? 'Abrir en Notion'}>
            <NotionIcon size={11} /> {subject.notionPageTitle ?? 'Notion'}
          </a>
        )}

        {compact && hovered && (
          <div className="subject-tooltip">
            <div className="subject-tooltip__title">{name}</div>
            <div className="subject-tooltip__row">Estado: <strong>{cfg.label}</strong></div>
            {grade !== null && <div className="subject-tooltip__row">Nota: <strong>{grade}</strong></div>}
            {unmetCount > 0 && <div className="subject-tooltip__row warn">{unmetCount} correlativa{unmetCount !== 1 ? 's' : ''} pendiente{unmetCount !== 1 ? 's' : ''}</div>}
            {finalDate && <div className="subject-tooltip__row">Final: {fmtDate(finalDate)}</div>}
          </div>
        )}
      </div>

      {menu.visible && (
        <div ref={menuRef} className="context-menu" style={{ top: menu.y, left: menu.x }} onClick={e => e.stopPropagation()}>
          <button className="context-menu__item" onClick={() => { setShowDetail(true); closeMenu() }}>
            <InfoCircle size={14} color="currentColor" /> Ver detalle
          </button>
          <button className="context-menu__item" onClick={() => { onEdit(id); closeMenu() }}>
            <Edit size={14} color="currentColor" /> Editar
          </button>
          {subject.notionPageUrl && (<>
            <div className="context-menu__divider" />
            <a href={subject.notionPageUrl} target="_blank" rel="noopener noreferrer"
              className="context-menu__item" style={{ textDecoration: 'none', color: 'inherit' }}
              onClick={() => closeMenu()}>
              <NotionIcon size={14} /> Abrir en Notion
            </a>
          </>)}
          <div className="context-menu__divider" />
          <button className="context-menu__item" onClick={handleCopy}>
            <Copy size={14} color="currentColor" /> Copiar nombre/código
          </button>
          <div className="context-menu__divider" />
          <button className="context-menu__item context-menu__item--danger" onClick={() => { onDelete(id); closeMenu() }}>
            <Trash size={14} color="currentColor" /> Eliminar
          </button>
        </div>
      )}

      {showDetail && (
        <DetailModal
          subject={subject}
          allSubjects={allSubjects}
          onClose={() => setShowDetail(false)}
          onEdit={() => { setShowDetail(false); setTimeout(() => onEdit(id), 280) }}
        />
      )}
    </>
  )
}