
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/Supabase'
import { useParams } from 'react-router-dom'
import { Loader } from 'lucide-react'

interface WidgetSubject {
    id: string
    name: string
    status: string
    year: number
    semester: number
    grade: number | null
    final_date: string | null
    exam_dates: any[]
}

interface WidgetCareer {
    name: string
    config: {
        totalSubjects: number
        currentYear: number
        currentSemester: number
    }
}

interface WidgetData {
    career: WidgetCareer | null
    subjects: WidgetSubject[]
    profileName: string
}

function daysUntil(d: string) {
    return Math.ceil((new Date(d + 'T12:00:00').getTime() - Date.now()) / 86400000)
}

function fmtDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

const STATUS_COLOR: Record<string, string> = {
    approved: '#4ade80',
    pending_final: '#fbbf24',
    in_progress: '#60a5fa',
    retaking: '#f472b6',
    locked: '#475569',
    available: '#a78bfa',
    failed_final: '#f87171',
    free: '#fb923c',
}


export default function WidgetView() {
    const { userId } = useParams<{ userId: string }>()
    const [data, setData] = useState<WidgetData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [now] = useState(new Date())

    useEffect(() => {
        async function load() {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, active_career_id')
                    .eq('id', userId)
                    .single()

                let career: WidgetCareer | null = null
                let careerId: string | null = profile?.active_career_id ?? null

                if (careerId) {
                    const { data: careerRow } = await supabase
                        .from('careers')
                        .select('name, config')
                        .eq('id', careerId)
                        .single()
                    if (careerRow) career = careerRow as WidgetCareer
                }

                let subjectsQuery = supabase
                    .from('subjects')
                    .select('id, name, status, year, semester, grade, final_date, exam_dates')
                    .eq('user_id', userId)

                if (careerId) subjectsQuery = subjectsQuery.eq('career_id', careerId)

                const { data: subjectsRaw, error: subErr } = await subjectsQuery
                if (subErr) throw subErr

                setData({
                    career,
                    subjects: (subjectsRaw ?? []) as WidgetSubject[],
                    profileName: profile?.full_name ?? '',
                })
            } catch (e: any) {
                setError('No se pudieron cargar los datos.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [userId])

    if (loading) return <WidgetShell><Loader size={14} color='currentColor' className='spin' /></WidgetShell>
    if (error || !data) return <WidgetShell><ErrorState msg={error ?? 'Sin datos'} /></WidgetShell>

    const { career, subjects, profileName } = data
    const total = career?.config.totalSubjects ?? subjects.length
    const approved = subjects.filter(s => s.status === 'approved').length
    const inProgress = subjects.filter(s => ['in_progress', 'retaking'].includes(s.status))
    const pendingFinal = subjects.filter(s => s.status === 'pending_final').length
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0

    const upcoming = [
        ...subjects
            .filter(s => s.final_date && daysUntil(s.final_date) >= 0 && daysUntil(s.final_date) <= 30)
            .map(s => ({ name: s.name, date: s.final_date!, type: 'Final', days: daysUntil(s.final_date!) })),
        ...subjects.flatMap(s =>
            (s.exam_dates ?? [])
                .filter((e: any) => e.date && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 30)
                .map((e: any) => ({ name: s.name, date: e.date, type: e.type ?? 'Parcial', days: daysUntil(e.date) }))
        ),
    ].sort((a, b) => a.days - b.days).slice(0, 4)

    return (
        <WidgetShell>
            <div style={s.root}>

                <div style={s.header}>
                    <div>
                        <div style={s.brand}>Noteable</div>
                        <div style={s.title}>{career?.name ?? 'Mi carrera'}</div>
                        {profileName && <div style={s.subtitle}>{profileName}</div>}
                    </div>
                    <div style={s.pctBadge}>
                        <svg width="52" height="52" viewBox="0 0 52 52">
                            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                            <circle cx="26" cy="26" r="22" fill="none" stroke="#6366f1" strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 22}`}
                                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                                strokeLinecap="round"
                                transform="rotate(-90 26 26)"
                                style={{ transition: 'stroke-dashoffset 1s ease' }}
                            />
                            <text x="26" y="30" textAnchor="middle" fill="#e2e8f0"
                                fontSize="11" fontWeight="700" fontFamily="system-ui">
                                {pct}%
                            </text>
                        </svg>
                    </div>
                </div>

                <div style={s.statsRow}>
                    {[
                        { label: 'Aprobadas', value: approved, color: '#4ade80' },
                        { label: 'En cursada', value: inProgress.length, color: '#60a5fa' },
                        { label: 'Final pend.', value: pendingFinal, color: '#fbbf24' },
                        { label: 'Total', value: total, color: '#64748b' },
                    ].map((item, i) => (
                        <div key={i} style={s.statItem}>
                            <div style={{ ...s.statValue, color: item.color }}>{item.value}</div>
                            <div style={s.statLabel}>{item.label}</div>
                        </div>
                    ))}
                </div>

                <div style={s.progressWrap}>
                    <div style={s.progressTrack}>
                        <div style={{ ...s.progressFill, width: `${pct}%` }} />
                    </div>
                    <span style={s.progressLabel}>{approved} / {total} materias</span>
                </div>

                {inProgress.length > 0 && (
                    <div style={s.section}>
                        <div style={s.sectionTitle}>En cursada</div>
                        <div style={s.chipRow}>
                            {inProgress.slice(0, 6).map(s2 => (
                                <div key={s2.id} style={s.chip}>
                                    <span style={{ ...s.chipDot, background: STATUS_COLOR[s2.status] }} />
                                    <span style={s.chipLabel}>{s2.name}</span>
                                </div>
                            ))}
                            {inProgress.length > 6 && (
                                <div style={{ ...s.chip, color: '#475569' }}>+{inProgress.length - 6} más</div>
                            )}
                        </div>
                    </div>
                )}

                {upcoming.length > 0 && (
                    <div style={s.section}>
                        <div style={s.sectionTitle}>Próximos exámenes</div>
                        <div style={s.examList}>
                            {upcoming.map((ex, i) => (
                                <div key={i} style={s.examRow}>
                                    <div style={s.examLeft}>
                                        <span style={{
                                            ...s.examBadge,
                                            background: ex.type === 'Final' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                                            color: ex.type === 'Final' ? '#f87171' : '#818cf8',
                                        }}>{ex.type}</span>
                                        <span style={s.examName}>{ex.name}</span>
                                    </div>
                                    <div style={s.examRight}>
                                        <span style={s.examDate}>{fmtDate(ex.date)}</span>
                                        <span style={{
                                            ...s.examDays,
                                            color: ex.days <= 3 ? '#f87171' : ex.days <= 7 ? '#fbbf24' : '#475569'
                                        }}>
                                            {ex.days === 0 ? '¡Hoy!' : ex.days === 1 ? 'Mañana' : `${ex.days}d`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={s.footer}>
                    Noteable · actualizado {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </WidgetShell>
    )
}

function WidgetShell({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            minHeight: '100vh', background: '#0d0d1a',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '0',
            fontFamily: '"DM Sans", system-ui, sans-serif',
        }}>
            {children}
        </div>
    )
}



function ErrorState({ msg }: { msg: string }) {
    return (
        <div style={{ padding: 32, color: '#475569', fontSize: '0.8rem', textAlign: 'center' }}>
            {msg}
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    root: {
        width: '100%', maxWidth: 480,
        padding: '20px 20px 12px',
        display: 'flex', flexDirection: 'column', gap: 14,
    },
    header: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
    },
    brand: {
        fontSize: '0.6rem', fontWeight: 700, color: '#6366f1',
        letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4,
    },
    title: {
        fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2,
    },
    subtitle: {
        fontSize: '0.72rem', color: '#475569', marginTop: 3,
    },
    pctBadge: {
        flexShrink: 0,
    },
    statsRow: {
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
    },
    statItem: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '10px 8px',
        textAlign: 'center',
    },
    statValue: {
        fontSize: '1.1rem', fontWeight: 700, lineHeight: 1,
    },
    statLabel: {
        fontSize: '0.58rem', color: '#475569', marginTop: 4,
        textTransform: 'uppercase', letterSpacing: '0.04em',
    },
    progressWrap: {
        display: 'flex', alignItems: 'center', gap: 10,
    },
    progressTrack: {
        flex: 1, height: 5, borderRadius: 99,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
    },
    progressFill: {
        height: '100%', borderRadius: 99,
        background: 'linear-gradient(90deg, #6366f1, #818cf8)',
        transition: 'width 1s ease',
    },
    progressLabel: {
        fontSize: '0.65rem', color: '#475569', whiteSpace: 'nowrap',
    },
    section: {
        display: 'flex', flexDirection: 'column', gap: 8,
    },
    sectionTitle: {
        fontSize: '0.62rem', fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.08em',
    },
    chipRow: {
        display: 'flex', flexWrap: 'wrap', gap: 5,
    },
    chip: {
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '3px 9px',
        fontSize: '0.68rem', color: '#94a3b8',
    },
    chipDot: {
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
    },
    chipLabel: {
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    examList: {
        display: 'flex', flexDirection: 'column', gap: 5,
    },
    examRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, padding: '7px 10px',
    },
    examLeft: {
        display: 'flex', alignItems: 'center', gap: 7, minWidth: 0,
    },
    examBadge: {
        fontSize: '0.58rem', fontWeight: 700, borderRadius: 4,
        padding: '2px 5px', flexShrink: 0,
    },
    examName: {
        fontSize: '0.72rem', color: '#cbd5e1',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    examRight: {
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
    },
    examDate: {
        fontSize: '0.65rem', color: '#475569',
    },
    examDays: {
        fontSize: '0.65rem', fontWeight: 700,
    },
    footer: {
        fontSize: '0.55rem', color: '#1e293b',
        textAlign: 'right', paddingTop: 4,
    },
}