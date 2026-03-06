

import { useRef, useState, useMemo } from 'react'
import { X } from 'lucide-react'
import type { Subject } from '../types/types'
import { Moon, Sun1 } from 'iconsax-react'

interface ScheduleExportProps {
    subjects: Subject[]
    careerName: string
    currentSemester: 1 | 2
    currentYear: number
    onClose: () => void
}

interface ScheduleBlock {
    subject: Subject
    day: string
    startTime: string
    endTime: string
    startMin: number
    durationMin: number
    color: string
}

const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DAY_LABELS: Record<string, string> = {
    lun: 'Lun', mar: 'Mar', mié: 'Mié', jue: 'Jue', vie: 'Vie', sáb: 'Sáb'
}
const HOUR_START = 7
const HOUR_END = 23
const PX_PER_MIN = 1.6

const SUBJECT_COLORS = [
    { bg: '#312e81', border: '#6366f1', text: '#c7d2fe' },
    { bg: '#164e63', border: '#22d3ee', text: '#a5f3fc' },
    { bg: '#14532d', border: '#4ade80', text: '#bbf7d0' },
    { bg: '#7c2d12', border: '#fb923c', text: '#fed7aa' },
    { bg: '#4a1d96', border: '#a78bfa', text: '#ddd6fe' },
    { bg: '#881337', border: '#fb7185', text: '#fecdd3' },
    { bg: '#713f12', border: '#facc15', text: '#fef9c3' },
    { bg: '#134e4a', border: '#2dd4bf', text: '#ccfbf1' },
]

function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}

function formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}:00`
}

export default function ScheduleExport({
    subjects,
    careerName,
    currentSemester,
    currentYear,
    onClose,
}: ScheduleExportProps) {
    const gridRef = useRef<HTMLDivElement>(null)
    const [downloading, setDownloading] = useState(false)
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')

    const colorMap = useMemo(() => {
        const map: Record<string, typeof SUBJECT_COLORS[0]> = {}
        let i = 0
        subjects.forEach(s => { map[s.id] = SUBJECT_COLORS[i++ % SUBJECT_COLORS.length] })
        return map
    }, [subjects])

    const blocks = useMemo<ScheduleBlock[]>(() => {
        const result: ScheduleBlock[] = []
        subjects.forEach(s => {
            if (!s.schedules?.length) return
            s.schedules.forEach((sch: any) => {
                if (!sch.day || !sch.timeFrom || !sch.timeTo) return
                const startMin = timeToMin(sch.timeFrom) - HOUR_START * 60
                const endMin = timeToMin(sch.timeTo) - HOUR_START * 60

                if (startMin < 0 || endMin <= startMin) return
                result.push({
                    subject: s,
                    day: sch.day,
                    startTime: sch.timeFrom,
                    endTime: sch.timeTo,
                    startMin,
                    durationMin: endMin - startMin,
                    color: colorMap[s.id]?.border ?? '#6366f1',
                })
            })
        })
        return result
    }, [subjects, colorMap])

    const occupiedMins = blocks.map(b => b.startMin + HOUR_START * 60)
        .concat(blocks.map(b => b.startMin + b.durationMin + HOUR_START * 60))
    const visibleStart = blocks.length ? Math.max(HOUR_START, Math.floor(Math.min(...occupiedMins) / 60) - 1) : HOUR_START
    const visibleEnd = blocks.length ? Math.min(HOUR_END, Math.ceil(Math.max(...occupiedMins) / 60) + 1) : HOUR_END
    const visibleMin = (visibleStart - HOUR_START) * 60
    const visibleTotal = (visibleEnd - visibleStart) * 60
    const gridHeight = visibleTotal * PX_PER_MIN

    const activeDays = blocks.length
        ? DAYS.filter(d => blocks.some(b => b.day === d))
        : DAYS

    const handleDownload = async () => {
        if (!gridRef.current) return
        setDownloading(true)
        try {
            const html2canvas = (await import('html2canvas')).default
            const canvas = await html2canvas(gridRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: theme === 'dark' ? '#0d0d1a' : '#f8fafc',
                logging: false,
            })
            const link = document.createElement('a')
            link.download = `horario_${currentYear}año_${currentSemester}C.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
        } catch (e) {
            console.error('Error al exportar:', e)
        } finally {
            setDownloading(false)
        }
    }

    const T = theme === 'dark'
        ? { bg: '#0d0d1a', surface: '#13131f', border: 'rgba(255,255,255,0.07)', text: '#e2e8f0', muted: '#475569', hour: '#1e1e30' }
        : { bg: '#f8fafc', surface: '#ffffff', border: 'rgba(0,0,0,0.08)', text: '#1e293b', muted: '#94a3b8', hour: '#f1f5f9' }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.drawer} onClick={e => e.stopPropagation()}>

                <div style={styles.toolbar}>
                    <div>
                        <div style={styles.toolbarTitle}>Exportar horario</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                            {currentYear}° año · {currentSemester}° cuatrimestre · {activeDays.length} días
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            style={{ ...styles.themeBtn, background: theme === 'dark' ? '#1e1e30' : '#f1f5f9' }}
                            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                            title="Cambiar tema"
                        >
                            {theme === 'dark' ? <Sun1 size={14} color="#f8fafc" style={{ position: "relative", top: "2" }} /> : <Moon size={14} color="#1e293b" style={{ position: "relative", top: "2" }} />}
                        </button>

                        <button style={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>

                            {downloading ? 'Exportando…' : 'Descargar'}
                        </button>

                        <button className='modal__close' onClick={onClose}><X size={16} color='currentColor' /></button>
                    </div>
                </div>

                <div style={styles.previewWrap}>
                    <div
                        ref={gridRef}
                        style={{
                            background: T.bg,
                            borderRadius: 16,
                            padding: '24px 20px 20px',
                            minWidth: 560,
                            fontFamily: '"DM Sans", system-ui, sans-serif',
                            userSelect: 'none',
                        }}
                    >
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                                {careerName}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: T.text }}>
                                Horario · {currentYear}° año · {currentSemester}° cuatrimestre
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 0 }}>

                            <div style={{ width: 44, flexShrink: 0, paddingTop: 32 }}>
                                <div style={{ position: 'relative', height: gridHeight }}>
                                    {Array.from({ length: visibleEnd - visibleStart + 1 }, (_, i) => {
                                        const h = visibleStart + i
                                        const top = (h - visibleStart) * 60 * PX_PER_MIN
                                        return (
                                            <div key={h} style={{ position: 'absolute', top, left: 0, right: 0 }}>
                                                <span style={{ fontSize: '0.6rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                                                    {formatHour(h)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flex: 1, gap: 6 }}>
                                {activeDays.map(day => {
                                    const dayBlocks = blocks.filter(b => b.day === day)
                                    return (
                                        <div key={day} style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                textAlign: 'center', fontSize: '0.68rem', fontWeight: 700,
                                                color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase',
                                                paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
                                                marginBottom: 0,
                                            }}>
                                                {DAY_LABELS[day] ?? day}
                                            </div>

                                            <div style={{ position: 'relative', height: gridHeight }}>
                                                {Array.from({ length: visibleEnd - visibleStart + 1 }, (_, i) => (
                                                    <div key={i} style={{
                                                        position: 'absolute', left: 0, right: 0,
                                                        top: i * 60 * PX_PER_MIN,
                                                        borderTop: `1px solid ${T.border}`,
                                                    }} />
                                                ))}

                                                {dayBlocks.map((b, idx) => {
                                                    const col = colorMap[b.subject.id] ?? SUBJECT_COLORS[0]
                                                    const top = (b.startMin - visibleMin) * PX_PER_MIN
                                                    const height = Math.max(b.durationMin * PX_PER_MIN, 28)
                                                    return (
                                                        <div key={idx} style={{
                                                            position: 'absolute', left: 2, right: 2, top,
                                                            height, borderRadius: 6,
                                                            background: theme === 'dark' ? col.bg : col.bg + 'cc',
                                                            borderLeft: `3px solid ${col.border}`,
                                                            padding: '4px 6px',
                                                            overflow: 'hidden',
                                                            boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
                                                        }}>
                                                            <div style={{
                                                                fontSize: '0.62rem', fontWeight: 700,
                                                                color: col.text, lineHeight: 1.2,
                                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            }}>
                                                                {b.subject.name}
                                                            </div>
                                                            {height > 36 && (
                                                                <div style={{ fontSize: '0.55rem', color: col.border, marginTop: 2 }}>
                                                                    {b.startTime} – {b.endTime}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {blocks.length > 0 && (
                            <div style={{
                                marginTop: 18, paddingTop: 14,
                                borderTop: `1px solid ${T.border}`,
                                display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
                            }}>
                                {subjects.filter(s => s.schedules?.length).map(s => {
                                    const col = colorMap[s.id] ?? SUBJECT_COLORS[0]
                                    return (
                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: col.border, flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.6rem', color: T.muted }}>{s.name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {blocks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted, fontSize: '0.8rem' }}>
                                Ninguna materia tiene horarios cargados.
                                <br />
                                <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                                    Editá una materia y agregá sus días y horarios.
                                </span>
                            </div>
                        )}

                        <div style={{ marginTop: 14, textAlign: 'right', fontSize: '0.55rem', color: T.muted, opacity: 0.5 }}>
                            Noteable
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes schedSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
    },
    drawer: {
        background: '#13131f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        display: 'flex', flexDirection: 'column',
        maxWidth: '95vw', maxHeight: '92vh',
        animation: 'schedSlideUp 0.22s ease',
        overflow: 'hidden',
    },
    toolbar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
    },
    toolbarTitle: {
        fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0',
    },
    themeBtn: {
        border: 'none', cursor: 'pointer', borderRadius: 8,
        padding: '6px 10px', fontSize: '0.9rem',
        transition: 'opacity 0.15s',
    },
    downloadBtn: {
        display: 'flex', alignItems: 'center', gap: 7,
        background: '#6366f1', color: '#fff',
        border: 'none', borderRadius: 10, cursor: 'pointer',
        padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
        transition: 'opacity 0.15s',
    },
    closeBtn: {
        all: 'unset' as any, cursor: 'pointer',
        color: '#475569', padding: 6, borderRadius: 8,
        display: 'flex', alignItems: 'center',
        transition: 'color 0.15s',
    },
    previewWrap: {
        overflowY: 'auto', overflowX: 'auto',
        padding: '24px',
        flex: 1,
    },
}