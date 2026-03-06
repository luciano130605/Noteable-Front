import { useState } from 'react'
import type { Subject, SubjectStatus } from '../types/types'
import { X } from 'lucide-react'
import './CloseSemesterWizard.css'

interface Props {
    subjects: Subject[]
    currentYear: number
    currentSemester: 1 | 2
    onConfirm: (
        updates: { id: string; status: SubjectStatus; finalAttempts?: number; gradeP1?: number | null; gradeP2?: number | null; gradeFinalExam?: number | null; grade?: number | null }[],
        nextYear: number,
        nextSemester: 1 | 2
    ) => void
    onClose: () => void
}


function dotColor(n: number) {
    if (n >= 7) return '#4ade80'
    if (n >= 4) return '#fbbf24'
    return '#f87171'
}

interface CoursingRow {
    id: string
    p1: string
    p2: string
    recu1: string
    recu2: string
    hasRecu: boolean
}

interface FinalRow {
    id: string
    finalGrade: string
    skip: boolean
}

export default function CloseSemesterWizard({
    subjects, currentYear, currentSemester, onConfirm, onClose
}: Props) {
    const inProgress = subjects.filter(s =>
        s.status === 'in_progress' && s.semester === currentSemester
    )
    const pendingFinal = subjects.filter(s =>
        s.status === 'pending_final' || s.status === 'failed_final'
    )
    const [showConfirm, setShowConfirm] = useState(false)

    const [coursingRows, setCoursingRows] = useState<Record<string, CoursingRow>>(() =>
        Object.fromEntries(inProgress.map(s => [s.id, {
            id: s.id, p1: s.gradeP1 != null ? String(s.gradeP1) : '',
            p2: s.gradeP2 != null ? String(s.gradeP2) : '',
            recu1: '', recu2: '', hasRecu: false,
        }]))
    )

    const [finalRows, setFinalRows] = useState<Record<string, FinalRow>>(() =>
        Object.fromEntries(pendingFinal.map(s => [s.id, {
            id: s.id,
            finalGrade: s.gradeFinalExam != null ? String(s.gradeFinalExam) : '',
            skip: false,
        }]))
    )

    const nextSemester: 1 | 2 = currentSemester === 1 ? 2 : 1
    const nextYear = currentSemester === 2 ? currentYear + 1 : currentYear

    const updateCoursing = (id: string, patch: Partial<CoursingRow>) =>
        setCoursingRows(p => ({ ...p, [id]: { ...p[id], ...patch } }))

    const updateFinal = (id: string, patch: Partial<FinalRow>) =>
        setFinalRows(p => ({ ...p, [id]: { ...p[id], ...patch } }))

    const effectiveGrade = (original: string, recu: string) => {
        const n = parseFloat(original)
        const r = parseFloat(recu)
        if (!isNaN(r)) return r
        return isNaN(n) ? null : n
    }

    const getOutcome = (row: CoursingRow) => {
        const g1 = effectiveGrade(row.p1, row.recu1)
        const g2 = effectiveGrade(row.p2, row.recu2)
        if (g1 === null || g2 === null) return null
        const avg = (g1 + g2) / 2
        if (avg >= 7) return { status: 'approved' as SubjectStatus, avg, color: '#4ade80', label: 'Aprobada directo' }
        if (avg >= 4) return { status: 'pending_final' as SubjectStatus, avg, color: '#fbbf24', label: 'Va al final' }
        return { status: 'free' as SubjectStatus, avg, color: '#f87171', label: 'Libre (perdió cursada)' }
    }

    const getFinalOutcome = (row?: FinalRow, subject?: Subject) => {
        if (!row || !subject) return null
        const n = parseFloat(row.finalGrade)
        if (isNaN(n)) return null
        if (n >= 4) return { status: 'approved' as SubjectStatus, color: '#4ade80', label: 'Aprobada' }
        const attempts = (subject.finalAttempts ?? 0) + 1
        if (attempts >= 3) return { status: 'free' as SubjectStatus, color: '#f87171', label: 'Libre (3 intentos)', attempts }
        return { status: 'failed_final' as SubjectStatus, color: '#fb923c', label: `Desaprobado (${attempts}/3)`, attempts }
    }

    const changesCount =
        inProgress.filter(s => getOutcome(coursingRows[s.id]) !== null).length +
        pendingFinal.filter(s => getFinalOutcome(finalRows[s.id], s) !== null).length

    const handleConfirm = () => {
        const updates: any[] = []

        inProgress.forEach(s => {
            const row = coursingRows[s.id]
            const outcome = getOutcome(row)
            if (!outcome) return
            const g1 = effectiveGrade(row.p1, row.recu1)
            const g2 = effectiveGrade(row.p2, row.recu2)
            updates.push({
                id: s.id,
                status: outcome.status,
                gradeP1: g1,
                gradeP2: g2,
                grade: outcome.avg,
            })
        })

        pendingFinal.forEach(s => {
            const row = finalRows[s.id]
            const outcome = getFinalOutcome(row, s)
            if (!outcome) return
            updates.push({
                id: s.id,
                status: outcome.status,
                gradeFinalExam: parseFloat(row.finalGrade),
                grade: parseFloat(row.finalGrade),
                finalAttempts: outcome.attempts ?? 0,
            })
        })

        onConfirm?.(updates, nextYear, nextSemester)
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 580 }}>
                <div className="modal__title">
                    <span>Cerrar {currentSemester}° cuatrimestre · {currentYear}° año</span>
                    <button type="button" className="modal__close" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="modal__body" style={{ gap: 24 }}>

                    {inProgress.length > 0 && (
                        <div className="csw-section">
                            <div className="csw-section__header">
                                <span className="csw-section__title">Materias en cursada</span>
                                <span className="csw-section__hint">Cargá las notas para calcular el resultado</span>
                            </div>
                            {inProgress.map(s => {
                                const row = coursingRows[s.id]
                                const outcome = getOutcome(row)
                                const g1eff = effectiveGrade(row.p1, row.recu1)
                                const g2eff = effectiveGrade(row.p2, row.recu2)
                                return (
                                    <div key={s.id} className="csw-card">
                                        <div className="csw-card__header">
                                            <div>
                                                <span className="csw-card__name">{s.name}</span>
                                                {s.code && <span className="csw-card__code">{s.code}</span>}
                                            </div>
                                            {outcome && (
                                                <span className="csw-card__outcome" style={{ color: outcome.color, borderColor: outcome.color + '44', background: outcome.color + '15' }}>
                                                    {outcome.avg.toFixed(1)} · {outcome.label}
                                                </span>
                                            )}
                                        </div>

                                        <div className="csw-grades">
                                            <div className="csw-grade-col">
                                                <label className="csw-grade-label">1er Parcial</label>
                                                <div className="csw-grade-row">
                                                    <input
                                                        className="csw-grade-input"
                                                        type="number" min={1} max={10} step={0.5}
                                                        placeholder="—"
                                                        value={row.p1}
                                                        onChange={e => updateCoursing(s.id, { p1: e.target.value })}
                                                        style={row.p1 && !isNaN(+row.p1) ? { borderColor: dotColor(+row.p1) + '88' } : {}}
                                                    />
                                                    {row.p1 && !isNaN(+row.p1) && parseFloat(row.p1) < 4 && (
                                                        <input
                                                            className="csw-grade-input csw-grade-input--recu"
                                                            type="number" min={1} max={10} step={0.5}
                                                            placeholder="Recu"
                                                            value={row.recu1}
                                                            onChange={e => updateCoursing(s.id, { recu1: e.target.value })}
                                                            style={row.recu1 && !isNaN(+row.recu1) ? { borderColor: dotColor(+row.recu1) + '88' } : {}}
                                                        />
                                                    )}
                                                    {g1eff !== null && (
                                                        <span className="csw-grade-dot" style={{ background: dotColor(g1eff) }} />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="csw-grade-sep">+</div>

                                            <div className="csw-grade-col">
                                                <label className="csw-grade-label">2do Parcial</label>
                                                <div className="csw-grade-row">
                                                    <input
                                                        className="csw-grade-input"
                                                        type="number" min={1} max={10} step={0.5}
                                                        placeholder="—"
                                                        value={row.p2}
                                                        onChange={e => updateCoursing(s.id, { p2: e.target.value })}
                                                        style={row.p2 && !isNaN(+row.p2) ? { borderColor: dotColor(+row.p2) + '88' } : {}}
                                                    />
                                                    {row.p2 && !isNaN(+row.p2) && parseFloat(row.p2) < 4 && (
                                                        <input
                                                            className="csw-grade-input csw-grade-input--recu"
                                                            type="number" min={1} max={10} step={0.5}
                                                            placeholder="Recu"
                                                            value={row.recu2}
                                                            onChange={e => updateCoursing(s.id, { recu2: e.target.value })}
                                                            style={row.recu2 && !isNaN(+row.recu2) ? { borderColor: dotColor(+row.recu2) + '88' } : {}}
                                                        />
                                                    )}
                                                    {g2eff !== null && (
                                                        <span className="csw-grade-dot" style={{ background: dotColor(g2eff) }} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {row.p1 && !isNaN(+row.p1) && parseFloat(row.p1) < 4 && !row.recu1 && (
                                            <p className="csw-hint">1er parcial &lt; 4 · ¿tenés recuperatorio? Cargalo arriba.</p>
                                        )}
                                        {row.p2 && !isNaN(+row.p2) && parseFloat(row.p2) < 4 && !row.recu2 && (
                                            <p className="csw-hint">2do parcial &lt; 4 · ¿tenés recuperatorio? Cargalo arriba.</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {pendingFinal.length > 0 && (
                        <div className="csw-section">
                            <div className="csw-section__header">
                                <span className="csw-section__title"> Finales pendientes</span>
                                <span className="csw-section__hint">Cargá la nota si ya rendiste</span>
                            </div>
                            {pendingFinal.map(s => {
                                const row = finalRows[s.id]
                                const outcome = getFinalOutcome(row, s)
                                return (
                                    <div key={s.id} className="csw-card">
                                        <div className="csw-card__header">
                                            <div>
                                                <span className="csw-card__name">{s.name}</span>
                                                {s.code && <span className="csw-card__code">{s.code}</span>}
                                                {s.status === 'failed_final' && (
                                                    <span className="csw-card__attempts">{s.finalAttempts ?? 1}/3 intentos previos</span>
                                                )}
                                            </div>
                                            {outcome && (
                                                <span className="csw-card__outcome" style={{ color: outcome.color, borderColor: outcome.color + '44', background: outcome.color + '15' }}>
                                                    {outcome.label}
                                                </span>
                                            )}
                                        </div>

                                        <div className="csw-grades" style={{ alignItems: 'center', gap: 12 }}>
                                            <div className="csw-grade-col">
                                                <label className="csw-grade-label">Nota del final</label>
                                                <div className="csw-grade-row">
                                                    <input
                                                        className="csw-grade-input csw-grade-input--lg"
                                                        type="number" min={1} max={10} step={0.5}
                                                        placeholder={row.skip ? 'no rend.' : '—'}
                                                        disabled={row.skip}
                                                        value={row.finalGrade}
                                                        onChange={e => updateFinal(s.id, { finalGrade: e.target.value })}
                                                        style={row.finalGrade && !isNaN(+row.finalGrade) ? { borderColor: dotColor(+row.finalGrade) + '88' } : {}}
                                                    />
                                                    {row.finalGrade && !isNaN(+row.finalGrade) && (
                                                        <span className="csw-grade-dot" style={{ background: dotColor(+row.finalGrade) }} />
                                                    )}
                                                </div>
                                            </div>
                                            <label className="csw-skip-label">
                                                <input
                                                    type="checkbox"
                                                    checked={row.skip}
                                                    onChange={e => updateFinal(s.id, { skip: e.target.checked, finalGrade: '' })}
                                                />
                                                Todavía no rendí
                                            </label>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {inProgress.length === 0 && pendingFinal.length === 0 && (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0', fontSize: '0.85rem' }}>
                            No hay materias en cursada ni finales pendientes.
                        </p>
                    )}

                    <div className="csw-advance">
                        <span>Al confirmar, avanzás a</span>
                        <strong>{nextSemester}° cuatrimestre · {nextYear}° año</strong>
                    </div>
                </div>

                <div className="modal__actions">
                    <button type="button" className="btn" onClick={onClose}>Cancelar</button>
                    <button type="button" className="btn btn--primary" onClick={() => setShowConfirm(true)}>
                        Confirmar{changesCount > 0 ? ` · ${changesCount} materia${changesCount !== 1 ? 's' : ''}` : ''}
                    </button>
                </div>

                {showConfirm && (
                    <div className="confirm-overlay">
                        <div className="confirm-modal">
                            <h3>Confirmar cierre de cuatrimestre</h3>

                            <p>
                                Se actualizarán {changesCount} materia{changesCount !== 1 ? 's' : ''} y
                                avanzarás al {nextSemester}° cuatrimestre · {nextYear}° año.
                            </p>

                            <div className="confirm-actions">
                                <button
                                    className="btn"
                                    onClick={() => setShowConfirm(false)}
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="btn btn--primary"
                                    onClick={() => {
                                        setShowConfirm(false)
                                        handleConfirm()
                                    }}
                                >
                                    Confirmar cierre
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </div>
    )
}