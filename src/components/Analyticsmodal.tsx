import { useMemo, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import type { Subject } from '../types/types'
import './Analyticsmodal.css'
import { TrendDown, TrendUp } from 'iconsax-react'
import CharAverage from '../Icon/CharAverage'
import PinLocation from '../Icon/PinLocation'
import { useScrollLock } from '../hooks/Usescrolllock'


interface Props {
    subjects: Subject[]
    careerName: string
    currentYear: number
    currentSemester: number
    totalSubjects?: number
    onClose: () => void
}

function avg(nums: number[]) {
    if (!nums.length) return null
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

function gradeColor(g: number) {
    if (g >= 8) return '#16a34a'
    if (g >= 6) return '#4ade80'
    if (g >= 4) return '#d97706'
    return '#dc2626'
}

const STATUS_LABELS: Record<string, string> = {
    approved: 'Aprobadas', in_progress: 'En cursada', pending_final: 'Final pendiente',
    retaking: 'Recursadas', locked: 'Bloqueadas', available: 'Disponibles',
    failed_final: 'Final desaprobado', free: 'Libre',
}

const STATUS_COLORS: Record<string, string> = {
    approved: '#4ade80', in_progress: '#6366f1', pending_final: '#fbbf24',
    retaking: '#f97316', locked: '#334155', available: '#38bdf8',
    failed_final: '#f87171', free: '#a78bfa',
}


const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 20 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring' as const, damping: 26, stiffness: 280, mass: 0.8 }
    },
    exit: {
        opacity: 0, scale: 0.96, y: 16,
        transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const }
    },
}

const kpiVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const }
    }),
}

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: 0.1 + i * 0.07, duration: 0.35, ease: 'easeOut' as const }
    }),
}

const barVariants: Variants = {
    hidden: { scaleY: 0 },
    visible: (i: number) => ({
        scaleY: 1,
        transition: { delay: 0.2 + i * 0.05, duration: 0.4, ease: 'easeOut' as const }
    }),
}

const rankVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' as const }
    }),
}


function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
    const total = segments.reduce((a, b) => a + b.value, 0)
    if (!total) return <div className="an-donut-empty">Sin datos</div>

    const r = 54, cx = 60, cy = 60, stroke = 14
    const circumference = 2 * Math.PI * r
    let offset = 0

    const arcs = segments
        .filter(s => s.value > 0)
        .map(s => {
            const pct = s.value / total
            const dash = pct * circumference
            const gap = circumference - dash
            const arc = { ...s, dash, gap, offset }
            offset += dash
            return arc
        })

    return (
        <div className="an-donut-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-faint)" strokeWidth={stroke} />
                {arcs.map((arc, i) => (
                    <motion.circle
                        key={i}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={stroke}
                        strokeDasharray={`${arc.dash} ${arc.gap}`}
                        strokeDashoffset={-arc.offset}
                        strokeLinecap="butt"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
                        transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: 'easeOut' as const }}
                    />
                ))}
                <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="700" fontFamily="DM Sans">{total}</text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="DM Sans" letterSpacing="1">MATERIAS</text>
            </svg>
            <div className="an-donut-legend">
                {arcs.map((arc, i) => (
                    <motion.div
                        key={i}
                        className="an-legend-item"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.06, duration: 0.25 }}
                    >
                        <span className="an-legend-dot" style={{ background: arc.color }} />
                        <span className="an-legend-label">{arc.label}</span>
                        <span className="an-legend-val">{arc.value}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

function GradeHistogram({ grades }: { grades: number[] }) {
    const buckets = [
        { label: '1–3', min: 1, max: 3.9, color: '#f87171' },
        { label: '4–5', min: 4, max: 5.9, color: '#fbbf24' },
        { label: '6–7', min: 6, max: 7.9, color: '#86efac' },
        { label: '8–9', min: 8, max: 9.9, color: '#4ade80' },
        { label: '10', min: 10, max: 10, color: '#a78bfa' },
    ]
    const counts = buckets.map(b => grades.filter(g => g >= b.min && g <= b.max).length)
    const maxCount = Math.max(...counts, 1)

    return (
        <div className="an-histogram">
            {buckets.map((b, i) => (
                <div key={i} className="an-hist-col">
                    <div className="an-hist-bar-wrap">
                        <motion.div
                            className="an-hist-bar"
                            style={{ background: b.color, originY: 1 }}
                            variants={barVariants}
                            custom={i}
                            initial="hidden"
                            animate="visible"
                            whileHover={{ scaleX: 1.08 }}
                        />
                        <motion.div
                            className="an-hist-bar"
                            style={{
                                background: b.color,
                                height: `${(counts[i] / maxCount) * 100}%`,
                                originY: 1,
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                            }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.45, ease: 'easeOut' as const }}
                        />
                    </div>
                    <span className="an-hist-label">{b.label}</span>
                    {counts[i] > 0 && (
                        <motion.span
                            className="an-hist-count"
                            style={{ color: b.color }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                        >
                            {counts[i]}
                        </motion.span>
                    )}
                </div>
            ))}
        </div>
    )
}

function ProgressRing({ value, max, label, color = '#6366f1' }: { value: number; max: number; label: string; color?: string }) {
    const r = 36, cx = 44, cy = 44, stroke = 6
    const circ = 2 * Math.PI * r
    const pct = max > 0 ? Math.min(value / max, 1) : 0
    const dash = pct * circ

    return (
        <div className="an-ring-wrap">
            <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-faint)" strokeWidth={stroke} />
                <motion.circle
                    cx={cx} cy={cy} r={r}
                    fill="none" stroke={color} strokeWidth={stroke}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '44px 44px' }}
                    initial={{ strokeDasharray: `0 ${circ}` }}
                    animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
                    transition={{ duration: 0.7, ease: 'easeOut' as const, delay: 0.15 }}
                />
                <motion.text
                    x={cx} y={cy + 2}
                    textAnchor="middle" fill="var(--text)"
                    fontSize="14" fontWeight="700" fontFamily="DM Sans"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    {Math.round(pct * 100)}%
                </motion.text>
            </svg>
            <span className="an-ring-label">{label}</span>
        </div>
    )
}


export default function AnalyticsModal({ subjects, careerName, currentYear, totalSubjects: cfgTotal, onClose }: Props) {
    const [isClosing, setIsClosing] = useState(false)
    const [open] = useState(true)
    useScrollLock(open)
    const handleClose = () => setIsClosing(true)

    const stats = useMemo(() => {
        const approved = subjects.filter(s => s.status === 'approved')
        const grades = approved.map(s => s.grade).filter((g): g is number => g != null && !isNaN(g))
        const gpa = avg(grades)
        const highGrades = grades.filter(g => g >= 7).length
        const byYear: Record<number, { total: number; approved: number; grades: number[] }> = {}
        subjects.forEach(s => {
            if (!byYear[s.year]) byYear[s.year] = { total: 0, approved: 0, grades: [] }
            byYear[s.year].total++
            if (s.status === 'approved') {
                byYear[s.year].approved++
                if (s.grade != null) byYear[s.year].grades.push(s.grade)
            }
        })
        const bySem: Record<string, { total: number; approved: number }> = {}
        subjects.forEach(s => {
            const key = `${s.year}C${s.semester}`
            if (!bySem[key]) bySem[key] = { total: 0, approved: 0 }
            bySem[key].total++
            if (s.status === 'approved') bySem[key].approved++
        })
        const statusMap: Record<string, number> = {}
        subjects.forEach(s => { statusMap[s.status] = (statusMap[s.status] || 0) + 1 })
        const semKeys = Object.keys(bySem).sort()
        const recentSems = semKeys.slice(-6)

        const velocity = recentSems.map(k => bySem[k].approved)
        const retaking = subjects.filter(s => s.status === 'retaking').length
        const gradeSubjects = approved.filter(s => s.grade != null).sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0))
        return {
            total: subjects.length, approved: approved.length,
            grades, gpa, highGrades,
            passingRate: approved.length > 0 ? Math.round((approved.filter(s => (s.grade ?? 0) >= 4).length / approved.length) * 100) : 0,
            byYear, bySem, statusMap,
            velocity, recentSems,
            retaking, retakingRate: subjects.length > 0 ? Math.round((retaking / subjects.length) * 100) : 0,
            best5: gradeSubjects.slice(0, 5),
            worst5: gradeSubjects.slice(-5).reverse(),
            pendingFinal: subjects.filter(s => s.status === 'pending_final').length,
            inProgress: subjects.filter(s => s.status === 'in_progress').length,
        }
    }, [subjects])




    const totalForProgress = cfgTotal && cfgTotal > 0 ? cfgTotal : stats.total
    const donutSegments = Object.entries(stats.statusMap)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ label: STATUS_LABELS[k] ?? k, value: v, color: STATUS_COLORS[k] ?? '#444' }))
        .sort((a, b) => b.value - a.value)
    const years = Object.keys(stats.byYear).map(Number).sort()

    const kpis = [
        { value: stats.approved, color: '#4ade80', label: 'Aprobadas' },
        { value: stats.gpa ?? '—', color: stats.gpa != null ? gradeColor(stats.gpa) : 'var(--muted-deep)', label: 'Promedio GPA' },
        { value: stats.inProgress, color: '#6366f1', label: 'En cursada' },
        { value: stats.pendingFinal, color: '#fbbf24', label: 'Final pendiente' },
        { value: stats.highGrades, color: stats.highGrades > 0 ? '#a78bfa' : 'var(--muted-deep)', label: 'Nota ≥ 7' },
    ]

    return (
        <AnimatePresence onExitComplete={onClose}>
            {!isClosing && (
                <motion.div
                    className="an-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.22 }}
                    onClick={e => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        className="an-modal"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="an-header">
                            <div>
                                <p className="an-eyebrow">Analítica académica</p>
                                <h2 className="an-title">{careerName || 'Mi carrera'}</h2>
                            </div>
                            <motion.button
                                className="an-close"
                                onClick={handleClose}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>

                        <div className="an-body">

                            <div className="an-kpi-row">
                                {kpis.map((kpi, i) => (
                                    <motion.div
                                        key={i}
                                        className="an-kpi"
                                        variants={kpiVariants}
                                        custom={i}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        <span className="an-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
                                        <span className="an-kpi-label">{kpi.label}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div className="an-section" variants={sectionVariants} custom={0} initial="hidden" animate="visible">
                                <h3 className="an-section-title">Progreso general</h3>
                                <div className="an-rings-row">
                                    <ProgressRing value={stats.approved} max={totalForProgress} label="Avance carrera" color="#6366f1" />
                                    <ProgressRing value={stats.grades.filter(g => g >= 4).length} max={stats.approved} label="Tasa aprobación" color="#4ade80" />
                                    <ProgressRing value={stats.highGrades} max={stats.approved || 1} label="Notas altas (≥8)" color="#a78bfa" />
                                    <ProgressRing value={stats.retaking} max={stats.total || 1} label="Recursadas" color="#f97316" />
                                </div>
                            </motion.div>

                            <div className="an-grid-2">
                                <motion.div className="an-section" variants={sectionVariants} custom={1} initial="hidden" animate="visible">
                                    <h3 className="an-section-title">Distribución de estados</h3>
                                    <Donut segments={donutSegments} />
                                </motion.div>
                                <motion.div className="an-section" variants={sectionVariants} custom={2} initial="hidden" animate="visible">
                                    <h3 className="an-section-title">Distribución de notas</h3>
                                    {stats.grades.length > 0
                                        ? <GradeHistogram grades={stats.grades} />
                                        : <p className="an-empty">Sin notas cargadas aún</p>
                                    }
                                    {stats.gpa != null && (
                                        <motion.div
                                            className="an-gpa-chip"
                                            style={{ color: gradeColor(stats.gpa), borderColor: gradeColor(stats.gpa) + '33' }}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            Promedio general: <strong>{stats.gpa}</strong>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>

                            {stats.velocity.some(v => v > 0) && (
                                <motion.div className="an-section" variants={sectionVariants} custom={3} initial="hidden" animate="visible">
                                    <h3 className="an-section-title">Aprobadas por cuatrimestre</h3>
                                    <div className="an-velocity-row">
                                        {stats.recentSems.map((k, i) => {
                                            const val = stats.velocity[i]
                                            const max = Math.max(...stats.velocity, 1)
                                            return (
                                                <div key={k} className="an-vel-col">
                                                    <motion.span
                                                        className="an-vel-count"
                                                        style={{ color: val > 0 ? 'var(--accent)' : 'var(--muted-deep)' }}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.3 + i * 0.05 }}
                                                    >
                                                        {val}
                                                    </motion.span>
                                                    <div className="an-vel-bar-wrap">
                                                        <motion.div
                                                            className="an-vel-bar"
                                                            style={{ originY: 1 }}
                                                            initial={{ scaleY: 0, height: `${Math.max(val > 0 ? 8 : 0, (val / max) * 100)}%` }}
                                                            animate={{ scaleY: 1 }}
                                                            transition={{ delay: 0.2 + i * 0.06, duration: 0.45, ease: 'easeOut' as const }}
                                                        />
                                                    </div>
                                                    <span className="an-vel-label">{k.replace('C', '°C ')}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {years.length > 0 && (
                                <motion.div className="an-section" variants={sectionVariants} custom={4} initial="hidden" animate="visible">
                                    <h3 className="an-section-title">Progreso por año</h3>
                                    <div className="an-year-list">
                                        {years.map((y, i) => {
                                            const d = stats.byYear[y]
                                            const pct = d.total > 0 ? (d.approved / d.total) * 100 : 0
                                            const yearAvg = avg(d.grades)
                                            const isActive = y === currentYear
                                            return (
                                                <motion.div
                                                    key={y}
                                                    className={`an-year-row${isActive ? ' an-year-row--active' : ''}`}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
                                                >
                                                    <div className="an-year-meta">
                                                        <span className="an-year-label">
                                                            {y}° año
                                                            {isActive && <span className="an-year-badge"><PinLocation size={12} /></span>}
                                                        </span>
                                                        <span className="an-year-stats">
                                                            <span style={{ color: '#4ade80' }}>{d.approved}</span>
                                                            <span style={{ color: 'var(--muted)' }}> / {d.total}</span>
                                                            {yearAvg != null && (
                                                                <span className="an-year-avg" style={{ color: gradeColor(yearAvg) }}>
                                                                    <CharAverage size={10} /> {yearAvg}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="an-year-track">
                                                        <motion.div
                                                            className="an-year-fill"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ delay: 0.25 + i * 0.06, duration: 0.5, ease: 'easeOut' as const }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {(stats.best5.length > 0 || stats.worst5.length > 0) && (
                                <div className="an-grid-2">
                                    {stats.best5.length > 0 && (
                                        <motion.div className="an-section movil" variants={sectionVariants} custom={5} initial="hidden" animate="visible">
                                            <h3 className="an-section-title"><TrendUp size={14} color="currentColor" /> Mejores notas</h3>
                                            <div className="an-rank-list">
                                                {stats.best5.map((s, i) => (
                                                    <motion.div
                                                        key={s.id}
                                                        className="an-rank-row"
                                                        variants={rankVariants}
                                                        custom={i}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover={{ x: 4 }}
                                                    >
                                                        <span className="an-rank-pos">{i + 1}</span>
                                                        <span className="an-rank-name">{s.name}</span>
                                                        <span className="an-rank-grade" style={{ color: gradeColor(s.grade!) }}>{s.grade}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                    {stats.worst5.length > 0 && stats.worst5[0]?.id !== stats.best5[0]?.id && (
                                        <motion.div className="an-section movil" variants={sectionVariants} custom={6} initial="hidden" animate="visible">
                                            <h3 className="an-section-title"><TrendDown size={14} color="currentColor" /> Notas más bajas</h3>
                                            <div className="an-rank-list">
                                                {stats.worst5.map((s, i) => (
                                                    <motion.div
                                                        key={s.id}
                                                        className="an-rank-row"
                                                        variants={rankVariants}
                                                        custom={i}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover={{ x: 4 }}
                                                    >
                                                        <span className="an-rank-pos">{i + 1}</span>
                                                        <span className="an-rank-name">{s.name}</span>
                                                        <span className="an-rank-grade" style={{ color: gradeColor(s.grade!) }}>{s.grade}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}