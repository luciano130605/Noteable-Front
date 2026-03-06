import { useMemo, useState } from 'react'
import type { Subject } from '../types/types'
import { STATUS_CONFIG } from '../../src/assets/constants'
import { getEffectiveStatus } from '../App'
import './KanbanView.css'
import { DetailModal } from './SubjectCard'
import { Copy, Edit, InfoCircle, Trash } from 'iconsax-react'

interface Props {
    subjects: Subject[]
    currentYear: number
    onEdit: (id: string) => void
    onCycle: (id: string) => void
    onDelete: (id: string) => void
    onCopy?: () => void
}

const COLUMNS: { key: string; label: string; statuses: string[]; accent: string }[] = [
    { key: 'locked', label: 'Bloqueadas', statuses: ['locked'], accent: '#2e2e4a' },
    { key: 'available', label: 'Disponibles', statuses: ['available', 'free'], accent: '#38bdf8' },
    { key: 'in_progress', label: 'Cursando', statuses: ['in_progress', 'retaking'], accent: '#a78bfa' },
    { key: 'pending', label: 'Final pendiente', statuses: ['pending_final', 'failed_final'], accent: '#fbbf24' },
    { key: 'approved', label: 'Aprobadas', statuses: ['approved'], accent: '#4ade80' },
]

type SortDir = 'asc' | 'desc'

interface ContextMenuState { visible: boolean; x: number; y: number; subjectId: string }

function MiniCard({ subject, allSubjects, currentYear }: {
    subject: Subject
    allSubjects: Subject[]
    currentYear: number
}) {
    const eff = getEffectiveStatus(subject, currentYear, allSubjects)
    const cfg = STATUS_CONFIG[eff]

    return (
        <div className={`kb-card kb-card--${eff}`}>
            <div className="kb-card__band" style={{ background: cfg.color }} />
            <div className="kb-card__body">
                <span className="kb-card__name">{subject.name || 'Sin nombre'}</span>
                {subject.code && <span className="kb-card__code">{subject.code}</span>}
                <div className="kb-card__meta">
                    <span className="kb-card__year">
                        {subject.year}° · {subject.term === 'ANNUAL' ? 'Anual' : `${subject.semester}°C`}
                    </span>
                    {subject.grade !== null && eff === 'approved' && (
                        <span className="kb-card__grade" style={{ color: cfg.color }}>{subject.grade}</span>
                    )}
                    {eff === 'pending_final' && subject.finalDate && (
                        <span className="kb-card__date">
                            {new Date(subject.finalDate + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                    {eff === 'failed_final' && (
                        <span className="kb-card__attempts">{subject.finalAttempts ?? 1}/3</span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function KanbanView({ subjects, currentYear, onEdit, onDelete, onCopy }: Props) {
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>('asc')
    const [localOrder, setLocalOrder] = useState<string[]>(() => subjects.map(s => s.id))
    const [detailId, setDetailId] = useState<string | null>(null)
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
    const clickTimers = useMemo(() => new Map<string, ReturnType<typeof setTimeout>>(), [])

    useMemo(() => {
        setLocalOrder(prev => {
            const newIds = subjects.map(s => s.id)
            const kept = prev.filter(id => newIds.includes(id))
            const added = newIds.filter(id => !kept.includes(id))
            return [...kept, ...added]
        })
    }, [subjects])

    const columns = useMemo(() => {
        return COLUMNS.map(col => {
            const cards = localOrder
                .map(id => subjects.find(s => s.id === id))
                .filter((s): s is Subject =>
                    !!s && col.statuses.includes(getEffectiveStatus(s, currentYear, subjects))
                )
                .sort((a, b) => {
                    const diff =
                        a.year !== b.year
                            ? a.year - b.year
                            : a.semester - b.semester

                    return sortDir === 'asc' ? diff : -diff
                })

            return { ...col, cards }
        })
    }, [subjects, currentYear, localOrder, sortDir])

    const handleCardClick = (id: string) => {
        const existing = clickTimers.get(id)
        if (existing) {
            clearTimeout(existing)
            clickTimers.delete(id)
            onEdit(id)
        } else {
            const t = setTimeout(() => {
                clickTimers.delete(id)
                setDetailId(id)
            }, 220)
            clickTimers.set(id, t)
        }
    }

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        const menuW = 190, menuH = 160
        const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX
        const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY
        setContextMenu({ visible: true, x, y, subjectId: id })
    }

    const closeCtx = () => setContextMenu(null)

    const handleCopy = (s: Subject) => {
        navigator.clipboard.writeText([s.name, s.code].filter(Boolean).join(' — ')).catch(() => { })
        onCopy?.()
        closeCtx()
    }

    const handleDragOver = (e: React.DragEvent, overId: string) => {
        e.preventDefault()
        if (overId !== draggingId) setDragOverId(overId)
    }

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!draggingId || draggingId === targetId) return
        setLocalOrder(prev => {
            const next = [...prev]
            const fromIdx = next.indexOf(draggingId)
            const toIdx = next.indexOf(targetId)
            if (fromIdx === -1 || toIdx === -1) return prev
            next.splice(fromIdx, 1)
            next.splice(toIdx, 0, draggingId)
            return next
        })
        setDraggingId(null)
        setDragOverId(null)
    }

    const handleSort = () => {
        setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    }

    const detailSubject = detailId ? subjects.find(s => s.id === detailId) : null
    const ctxSubject = contextMenu ? subjects.find(s => s.id === contextMenu.subjectId) : null

    return (
        <div className="kb" onClick={() => contextMenu && closeCtx()}>

            <div className="kb__toolbar">
                <button className="kb__sort-btn" onClick={handleSort}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 3h9M2 6.5h6M2 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        {sortDir === 'asc'
                            ? <path d="M10 5v6M10 11l-1.5-1.5M10 11l1.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            : <path d="M10 8V2M10 2L8.5 3.5M10 2l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        }
                    </svg>
                    {sortDir === 'asc' ? 'Año' : 'Año'}
                </button>
            </div>

            <div className="kb__board">
                {columns.map(col => (
                    <div
                        key={col.key}
                        className="kb__col"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                            if (!draggingId) return
                            const lastCard = col.cards[col.cards.length - 1]
                            if (lastCard && lastCard.id !== draggingId) handleDrop(e, lastCard.id)
                        }}
                    >
                        <div className="kb__col-header" style={{ '--col-accent': col.accent } as React.CSSProperties}>
                            <span className="kb__col-line" />
                            <span className="kb__col-label">{col.label}</span>
                            <span className="kb__col-count">{col.cards.length}</span>
                        </div>

                        <div className="kb__col-cards">
                            {col.cards.length === 0 ? (
                                <div className="kb__col-empty">—</div>
                            ) : col.cards.map(s => (
                                <div
                                    key={s.id}
                                    draggable
                                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDraggingId(s.id) }}
                                    onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                                    onDragOver={e => handleDragOver(e, s.id)}
                                    onDrop={e => handleDrop(e, s.id)}
                                    onClick={e => { e.stopPropagation(); handleCardClick(s.id) }}
                                    onContextMenu={e => handleContextMenu(e, s.id)}
                                    className={[
                                        'kb-card-wrapper',
                                        dragOverId === s.id && draggingId !== s.id ? 'kb-card-wrapper--over' : '',
                                        draggingId === s.id ? 'kb-card-wrapper--dragging' : '',
                                    ].filter(Boolean).join(' ')}
                                    title="Click para ver · Doble click para editar · Click derecho para opciones"
                                >
                                    <MiniCard subject={s} allSubjects={subjects} currentYear={currentYear} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {detailSubject && (
                <DetailModal
                    subject={detailSubject}
                    allSubjects={subjects}
                    onClose={() => setDetailId(null)}
                    onEdit={() => { setDetailId(null); onEdit(detailSubject.id) }}
                />
            )}

            {contextMenu && ctxSubject && (
                <div
                    className="context-menu"
                    style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
                    onClick={e => e.stopPropagation()}
                >
                    <button className="context-menu__item" onClick={() => { setDetailId(ctxSubject.id); closeCtx() }}>
                        <InfoCircle size={14} color="currentColor" /> Ver detalle
                    </button>
                    <button className="context-menu__item" onClick={() => { onEdit(ctxSubject.id); closeCtx() }}>
                        <Edit size={14} color="currentColor" />
                        Editar
                    </button>
                    <div className="context-menu__divider" />
                    <button className="context-menu__item" onClick={() => handleCopy(ctxSubject)}>
                        <Copy size={14} color="currentColor" />

                        Copiar nombre/código
                    </button>
                    <div className="context-menu__divider" />
                    <button className="context-menu__item context-menu__item--danger" onClick={() => { onDelete(ctxSubject.id); closeCtx() }}>
                        <Trash size={14} color="currentColor" /> Eliminar
                    </button>
                </div>
            )}
        </div>
    )
}