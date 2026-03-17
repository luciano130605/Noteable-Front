import { useState, useRef, useEffect } from 'react'
import './Eventmodal.css'
import { Location, Edit, Trash, Danger, Calendar } from 'iconsax-react'
import { X, Loader, CheckCircle } from 'lucide-react'
import { toast } from "../hooks/Usetoast"
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useScrollLock } from '../hooks/Usescrolllock'

export interface CalendarEvent {
    date: string
    title: string
    color?: string
    endDate?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
    location?: string
    importance?: 'baja' | 'media' | 'alta'
    description?: string
    grade?: number | null
    graded?: boolean
    subjectId?: string
}

interface Props {
    initialDate?: string
    event?: CalendarEvent | null
    onSave?: (event: CalendarEvent) => void
    onDelete?: (event: CalendarEvent) => void
    onEdit?: () => void
    onClose: () => void
    readOnly?: boolean
    universityLocation?: string
}

interface NominatimResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
    isUniversity?: boolean
}

const UNIVERSITY_PLACE_ID = -999

async function searchLocations(query: string): Promise<NominatimResult[]> {
    if (query.length < 3) return []
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0&countrycodes=ar`,
            { headers: { 'Accept-Language': 'es', 'User-Agent': 'CorrelApp/1.0' } }
        )
        return await res.json()
    } catch { return [] }
}

function shortName(displayName: string): string {
    return displayName.split(',').slice(0, 2).join(', ')
}

const EVENT_COLORS = [
    { value: '#6366f1', label: 'Índigo' },
]

const IMPORTANCE_OPTIONS: { value: CalendarEvent['importance']; label: string; icon: string; color: string }[] = [
    { value: 'baja', label: 'Baja', icon: '🟢', color: '#10b981' },
    { value: 'media', label: 'Media', icon: '🟡', color: '#f59e0b' },
    { value: 'alta', label: 'Alta', icon: '🔴', color: '#ef4444' },
]

const EXAM_TYPES = ['final', 'parcial', 'recuperatorio', 'examen', 'tp', 'coloquio']

function isExamTitle(title: string): boolean {
    const lower = title.toLowerCase()
    return EXAM_TYPES.some(t => new RegExp(`\\b${t}\\b`).test(lower))
}

const EMPTY: CalendarEvent = {
    date: '', title: '', color: EVENT_COLORS[0].value,
    endDate: '', startTime: '', endTime: '', allDay: true,
    location: '', importance: 'media', description: '',
    grade: null, graded: false,
}


const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring', damping: 26, stiffness: 280 },
    },
    exit: {
        opacity: 0, scale: 0.96, y: 12,
        transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
    },
}

const sectionVariants: Variants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: {
        opacity: 1, height: 'auto', marginTop: 12,
        transition: { duration: 0.22, ease: 'easeOut' },
    },
    exit: {
        opacity: 0, height: 0, marginTop: 0,
        transition: { duration: 0.16, ease: 'easeIn' },
    },
}
const chipVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.05, duration: 0.2, ease: 'easeOut' },
    }),
}

const dropdownVariants: Variants = {
    hidden: { opacity: 0, y: -6, scale: 0.98 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.16, ease: 'easeOut' },
    },
    exit: {
        opacity: 0, y: -4, scale: 0.98,
        transition: { duration: 0.12 },
    },
}


export default function EventModal({ initialDate, event, onSave, onDelete, onClose, onEdit, readOnly, universityLocation }: Props) {
    const [open, setOpen] = useState(true)
    useScrollLock(open)
    const [form, setForm] = useState<CalendarEvent>({ ...EMPTY, date: initialDate ?? '' })
    const titleRef = useRef<HTMLInputElement>(null)
    const isEdit = !!event

    const [locInput, setLocInput] = useState('')
    const [locValidated, setLocValidated] = useState(false)
    const [locResults, setLocResults] = useState<NominatimResult[]>([])
    const [locLoading, setLocLoading] = useState(false)
    const [locOpen, setLocOpen] = useState(false)
    const locDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const locRef = useRef<HTMLDivElement>(null)

    const looksLikeExam = isExamTitle(form.title)

    const universityResult: NominatimResult | null = universityLocation
        ? { place_id: UNIVERSITY_PLACE_ID, display_name: universityLocation, lat: '', lon: '', isUniversity: true }
        : null

    const withUniversityFirst = (query: string, apiResults: NominatimResult[]): NominatimResult[] => {
        if (!universityResult) return apiResults
        const queryLower = query.toLowerCase().trim()
        const matches = queryLower.length === 0 || universityResult.display_name.toLowerCase().includes(queryLower)
        if (!matches) return apiResults
        const filtered = apiResults.filter(r => r.display_name !== universityResult.display_name)
        return [universityResult, ...filtered]
    }

    useEffect(() => {
        if (event) {
            setForm({ ...EMPTY, ...event })
            setLocInput(event.location ?? '')
            setLocValidated(!!(event.location && event.location.trim()))
        } else {
            setForm({ ...EMPTY, date: initialDate ?? '' })
            setLocInput('')
            setLocValidated(false)
        }
        setTimeout(() => titleRef.current?.focus(), 80)
    }, [event, initialDate])

    useEffect(() => {
        if (!locOpen) return
        const h = (e: MouseEvent) => {
            if (locRef.current && !locRef.current.contains(e.target as Node)) setLocOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [locOpen])

    const handleLocInput = (val: string) => {
        setLocInput(val)
        setLocValidated(false)
        setLocOpen(true)
        if (locDebounce.current) clearTimeout(locDebounce.current)
        if (val.length < 3) {
            setLocResults(withUniversityFirst(val, []))
            return
        }
        setLocLoading(true)
        locDebounce.current = setTimeout(async () => {
            const results = await searchLocations(val)
            setLocResults(withUniversityFirst(val, results))
            setLocLoading(false)
        }, 400)
    }

    const handleLocFocus = () => {
        if (locValidated) return
        if (universityResult && !locInput) {
            setLocResults([universityResult])
            setLocOpen(true)
        } else if (locInput.length >= 3) {
            setLocOpen(true)
        }
    }

    const selectLocation = (r: NominatimResult) => {
        const name = r.isUniversity ? r.display_name : shortName(r.display_name)
        setLocInput(name)
        setLocValidated(true)
        setLocResults([])
        setLocOpen(false)
        setForm(f => ({ ...f, location: name }))
    }

    const clearLocation = () => {
        setLocInput('')
        setLocValidated(false)
        setLocResults([])
        setLocOpen(false)
        setForm(f => ({ ...f, location: '' }))
    }

    const set = <K extends keyof CalendarEvent>(key: K, val: CalendarEvent[K]) =>
        setForm(f => ({ ...f, [key]: val }))

    const handleSave = () => {
        if (!form.title.trim()) { toast("El título es obligatorio", "error"); return }
        if (!form.date) { toast("La fecha es obligatoria", "error"); return }
        if (locInput && !locValidated) {
            toast("Seleccioná una ubicación de la lista para que se pueda usar en el mapa", "error")
            return
        }
        onSave?.({ ...form, title: form.title.trim(), location: locValidated ? locInput : '' })
    }

    const handleClose = () => setOpen(false)

    const formatDateDisplay = (d: string) => {
        if (!d) return ''
        return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
    }

    const selectedImportance = IMPORTANCE_OPTIONS.find(i => i.value === form.importance) ?? IMPORTANCE_OPTIONS[1]

    const gradeColor = form.grade == null ? 'var(--muted)'
        : form.grade >= 6 ? '#4ade80'
            : form.grade >= 4 ? '#fbbf24'
                : '#f87171'

    return (
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <motion.div
                    className="evm-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    onClick={e => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        className="evm-modal"
                        style={{ '--evm-accent': form.color } as React.CSSProperties}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="evm-header">
                            <div className="evm-header-band" style={{ background: form.color }} />
                            <div className="evm-header-content">
                                <div className="evm-header-top">
                                    <span className="evm-header-eyebrow">{isEdit ? 'Editar evento' : 'Nuevo evento'}</span>
                                    <motion.button
                                        className="evm-close"
                                        onClick={handleClose}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <X size={16} />
                                    </motion.button>
                                </div>
                                <input
                                    ref={titleRef}
                                    className="evm-title-input"
                                    value={form.title}
                                    onChange={e => set('title', e.target.value)}
                                    readOnly={readOnly}
                                    placeholder="Nombre del evento..."
                                    maxLength={80}
                                />
                                {form.date && <p className="evm-header-date">{formatDateDisplay(form.date)}</p>}
                            </div>
                        </div>

                        <div className="evm-body">

                            <div className="evm-section">
                                <div className="togles">
                                    <div className="evm-section-title">
                                        <span className="evm-section-icon"><Calendar size={14} color="currentColor" /></span>
                                        Fecha y hora
                                    </div>
                                    <div className="evm-allday-row">
                                        <span className="evm-allday-label">Todo el día</span>
                                        <button
                                            type="button"
                                            disabled={readOnly}
                                            className={`evm-toggle${form.allDay ? ' evm-toggle--on' : ''}`}
                                            onClick={() => set('allDay', !form.allDay)}
                                        >
                                            <span className="evm-toggle-thumb" />
                                        </button>
                                    </div>
                                    <div className="evm-allday-row">
                                        <span className="evm-allday-label">Tiene fecha fin</span>
                                        <button
                                            disabled={readOnly}
                                            type="button"
                                            className={`evm-toggle${form.endDate ? ' evm-toggle--on' : ''}`}
                                            onClick={() => set('endDate', form.endDate ? '' : form.date)}
                                        >
                                            <span className="evm-toggle-thumb" />
                                        </button>
                                    </div>
                                </div>

                                <div className="evm-date-row">
                                    <div className="evm-field">
                                        <label className="evm-label">Fecha inicio</label>
                                        <input type="date" className="evm-input" value={form.date} readOnly={readOnly} onChange={e => set('date', e.target.value)} />
                                    </div>
                                    <AnimatePresence>
                                        {form.endDate && (
                                            <motion.div
                                                className="evm-field"
                                                variants={sectionVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <div style={{ position: "relative", top: "-12px" }}>
                                                    <label className="evm-label">Fecha fin</label>
                                                    <input type="date" className="evm-input" readOnly={readOnly} value={form.endDate} min={form.date} onChange={e => set('endDate', e.target.value)} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence>
                                    {!form.allDay && (
                                        <motion.div
                                            className="evm-date-row evm-time-row"
                                            variants={sectionVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div className="evm-field">
                                                <label className="evm-label">Hora inicio</label>
                                                <input type="time" className="evm-input" readOnly={readOnly} value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                                            </div>
                                            <div className="evm-time-sep">→</div>
                                            <div className="evm-field">
                                                <label className="evm-label">Hora fin</label>
                                                <input type="time" className="evm-input" readOnly={readOnly} value={form.endTime} onChange={e => set('endTime', e.target.value)} />
                                            </div>
                                            {form.startTime && form.endTime && form.startTime < form.endTime && (
                                                <div className="evm-duration-chip">
                                                    {(() => {
                                                        const [sh, sm] = form.startTime!.split(':').map(Number)
                                                        const [eh, em] = form.endTime!.split(':').map(Number)
                                                        const mins = (eh * 60 + em) - (sh * 60 + sm)
                                                        if (mins < 60) return `${mins} min`
                                                        const h = Math.floor(mins / 60)
                                                        const m = mins % 60
                                                        return m > 0 ? `${h}h ${m}min` : `${h}h`
                                                    })()}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <AnimatePresence>
                                {(looksLikeExam || form.grade != null || form.graded) && (
                                    <motion.div
                                        className="evm-section"
                                        variants={sectionVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div className="evm-section-title">Resultado del examen</div>
                                        <div className="evm-grade-row">
                                            <div className="evm-allday-row" style={{ marginBottom: 0 }}>
                                                <span className="evm-allday-label">Ya rendí este examen</span>
                                                <button
                                                    disabled={readOnly}
                                                    type="button"
                                                    className={`evm-toggle${form.graded ? ' evm-toggle--on' : ''}`}
                                                    onClick={() => {
                                                        const next = !form.graded
                                                        setForm(f => ({ ...f, graded: next, grade: next ? f.grade : null }))
                                                    }}
                                                >
                                                    <span className="evm-toggle-thumb" />
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {form.graded && (
                                                    <motion.div
                                                        className="evm-grade-input-wrap"
                                                        variants={sectionVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="exit"
                                                        style={{ overflow: 'hidden' }}
                                                    >
                                                        <label className="evm-label">Nota obtenida</label>
                                                        <div className="evm-grade-field">
                                                            <input
                                                                readOnly={readOnly}
                                                                type="number"
                                                                className="evm-input evm-grade-input"
                                                                min={1} max={10} step={0.5}
                                                                value={form.grade ?? ''}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? null : Math.min(10, Math.max(1, Number(e.target.value)))
                                                                    set('grade', val)
                                                                }}
                                                                placeholder="1 – 10"
                                                                style={{ borderColor: form.grade != null ? gradeColor : undefined }}
                                                            />
                                                            <AnimatePresence>
                                                                {form.grade != null && (
                                                                    <motion.span
                                                                        className="evm-grade-badge"
                                                                        style={{ background: gradeColor + '22', color: gradeColor, borderColor: gradeColor + '44' }}
                                                                        initial={{ opacity: 0, scale: 0.85 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.85 }}
                                                                        transition={{ duration: 0.15 }}
                                                                    >
                                                                        {form.grade >= 6 ? 'Aprobado' : form.grade >= 4 ? '~ Regular' : 'Desaprobado'}
                                                                    </motion.span>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="evm-section">
                                <div className="evm-section-title">
                                    <span className="evm-section-icon"><Location size={14} color="currentColor" /></span>
                                    Ubicación
                                </div>
                                <div className="evm-location-autocomplete" ref={locRef}>
                                    <div className={`evm-location-field${locValidated ? ' evm-location-field--valid' : locInput.length > 0 ? ' evm-location-field--typing' : ''}`}>
                                        <Location size={13} color={locValidated ? '#10b981' : 'var(--muted, #888)'} />
                                        <input
                                            readOnly={readOnly}
                                            type="text"
                                            className="evm-location-bare-input"
                                            value={locInput}
                                            onChange={e => handleLocInput(e.target.value)}
                                            onFocus={handleLocFocus}
                                            placeholder={universityLocation ? `Ej: ${universityLocation}` : 'Buscá la dirección o lugar...'}
                                            autoComplete="off"
                                        />
                                        {locLoading && <Loader size={13} color="var(--muted)" className="evm-loc-spin" />}
                                        {locValidated && (
                                            <span className="evm-loc-check" title="Ubicación verificada">
                                                <CheckCircle size={12} style={{ position: 'relative', top: 2 }} />
                                            </span>
                                        )}
                                        {locInput && (
                                            <motion.button
                                                type="button"
                                                className="evm-loc-clear"
                                                onClick={clearLocation}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <X size={12} />
                                            </motion.button>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {locOpen && (locLoading || locResults.length > 0) && (
                                            <motion.div
                                                className="evm-loc-dropdown"
                                                variants={dropdownVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                {locLoading && <div className="evm-loc-loading">Buscando...</div>}
                                                {!locLoading && locResults.length === 0 && locInput.length >= 3 && (
                                                    <div className="evm-loc-empty">
                                                        Sin resultados. Intentá con una dirección más específica.
                                                    </div>
                                                )}
                                                {locResults.map(r => (
                                                    <button
                                                        disabled={readOnly}
                                                        key={r.place_id}
                                                        type="button"
                                                        className="evm-loc-item"
                                                        onClick={() => selectLocation(r)}
                                                    >
                                                        {r.isUniversity && (
                                                            <span style={{
                                                                fontSize: '0.62rem', color: '#6366f1', fontWeight: 700,
                                                                letterSpacing: '0.03em', textTransform: 'uppercase',
                                                                marginBottom: 2, display: 'block',
                                                            }}>
                                                                Mi facultad
                                                            </span>
                                                        )}
                                                        <span className="evm-loc-item-name">{r.display_name.split(',')[0]}</span>
                                                        {!r.isUniversity && (
                                                            <span className="evm-loc-item-full">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence mode="wait">
                                        {locInput && !locValidated && !locLoading && (
                                            <motion.p
                                                key="warn"
                                                className="evm-loc-hint evm-loc-hint--warn"
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <Danger size={12} color="currentColor" /> Seleccioná una opción de la lista para poder usar "Cómo llegar"
                                            </motion.p>
                                        )}
                                        {locValidated && (
                                            <motion.p
                                                key="ok"
                                                className="evm-loc-hint evm-loc-hint--ok"
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                Ubicación verificada — se podrá usar en el mapa
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="evm-section">
                                <div className="evm-section-title">Importancia</div>
                                <div className="evm-importance-grid">
                                    {IMPORTANCE_OPTIONS.map((opt, i) => (
                                        <motion.button
                                            key={opt.value}
                                            disabled={readOnly}
                                            type="button"
                                            className={`evm-importance-btn${form.importance === opt.value ? ' evm-importance-btn--active' : ''}`}
                                            style={{ '--ic': opt.color } as React.CSSProperties}
                                            onClick={() => set('importance', opt.value)}
                                            variants={chipVariants}
                                            custom={i}
                                            initial="hidden"
                                            animate="visible"
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <span className="evm-importance-icon">{opt.icon}</span>
                                            <span className="evm-importance-label">{opt.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="evm-section">
                                <div className="evm-section-title">
                                    <span className="evm-section-icon"><Edit size={14} color="currentColor" /></span>
                                    Descripción
                                </div>
                                <textarea
                                    className="evm-input evm-textarea"
                                    value={form.description}
                                    onChange={e => set('description', e.target.value)}
                                    placeholder="Detalles, links, recordatorios..."
                                    rows={3}
                                    readOnly={readOnly}
                                />
                            </div>

                            <AnimatePresence>
                                {(form.title || form.date) && (
                                    <motion.div
                                        className="evm-summary"
                                        variants={sectionVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div className="evm-summary-dot" style={{ background: form.color }} />
                                        <div className="evm-summary-content">
                                            <span className="evm-summary-title" style={{ textDecoration: form.graded ? 'line-through' : 'none', opacity: form.graded ? 0.6 : 1 }}>
                                                {form.title || 'Sin título'}
                                            </span>
                                            {form.graded && form.grade != null && (
                                                <span className="evm-summary-grade" style={{ color: gradeColor }}>
                                                    Nota: {form.grade}
                                                </span>
                                            )}
                                            <span className="evm-summary-meta">
                                                {form.date && formatDateDisplay(form.date)}
                                                {!form.allDay && form.startTime && ` · ${form.startTime}${form.endTime ? ' – ' + form.endTime : ''}`}
                                                {locValidated && locInput && ` · ${locInput}`}
                                            </span>
                                            <span className="evm-summary-importance" style={{ color: selectedImportance.color }}>
                                                {selectedImportance.icon} Importancia {selectedImportance.label}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="evm-footer">
                            {readOnly ? (
                                <>
                                    <button type="button" className="btn" onClick={handleClose}>Cerrar</button>
                                    {onEdit && (
                                        <button type="button" className="btn btn--primary" onClick={onEdit}>Editar</button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {isEdit && onDelete && (
                                        <motion.button
                                            type="button"
                                            className="evm-btn evm-btn--danger"
                                            onClick={() => onDelete(form)}
                                            whileTap={{ scale: 0.96 }}
                                        >
                                            <Trash size={16} color="#ef4444" style={{ position: 'relative', top: 2 }} />
                                            <span className="evm-btn-label">Eliminar</span>
                                        </motion.button>
                                    )}
                                    <motion.button
                                        type="button"
                                        className="evm-btn"
                                        onClick={handleClose}
                                        whileTap={{ scale: 0.96 }}
                                    >
                                        Cancelar
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        className="evm-btn evm-btn--primary"
                                        style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)` }}
                                        onClick={handleSave}
                                        whileTap={{ scale: 0.96 }}
                                    >
                                        {isEdit ? 'Guardar cambios' : 'Crear evento'}
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}