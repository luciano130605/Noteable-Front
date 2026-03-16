import { useRef, useState } from 'react'
import type { Subject } from '../types/types'
import { toast } from '../hooks/Usetoast'
import './Gpatracker.css'
import { Copy, CopySuccess, Share } from 'iconsax-react'
import { X } from 'lucide-react'

interface Props {
    subjects: Subject[]
    careerName: string
    onClose: () => void
}

function getGpaColor(gpa: number): string {
    if (gpa >= 9) return '#4ade80'
    if (gpa >= 7) return '#86efac'
    if (gpa >= 6) return '#fbbf24'
    if (gpa >= 4) return '#f97316'
    return '#f87171'
}

function getGpaLabel(gpa: number): string {
    if (gpa >= 9) return 'Sobresaliente'
    if (gpa >= 8) return 'Muy bueno'
    if (gpa >= 7) return 'Bueno'
    if (gpa >= 6) return 'Regular alto'
    if (gpa >= 4) return 'Aprobado'
    return 'Insuficiente'
}


const BUCKETS = [
    { range: '4–5', min: 4, max: 5.99, color: '#f87171' },
    { range: '6', min: 6, max: 6.99, color: '#fb923c' },
    { range: '7', min: 7, max: 7.99, color: '#fbbf24' },
    { range: '8', min: 8, max: 8.99, color: '#86efac' },
    { range: '9', min: 9, max: 9.99, color: '#4ade80' },
    { range: '10', min: 10, max: 10, color: '#22c55e' },
]

export default function GpaModal({ subjects, careerName, onClose }: Props) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const approvedWithGrade = subjects.filter(
        s => s.status === 'approved' && s.grade !== null && !isNaN(Number(s.grade))
    )
    const approvedTotal = subjects.filter(s => s.status === 'approved').length

    const avg = approvedWithGrade.length > 0
        ? Math.round((approvedWithGrade.reduce((a, s) => a + Number(s.grade), 0) / approvedWithGrade.length) * 100) / 100
        : null

    const sorted = [...approvedWithGrade].sort((a, b) => Number(b.grade) - Number(a.grade))
    const best = sorted.slice(0, 5)
    const maxBucketCount = Math.max(...BUCKETS.map(b =>
        approvedWithGrade.filter(s => Number(s.grade) >= b.min && Number(s.grade) <= b.max).length
    ), 1)

    const handleDownload = async () => {
        if (!cardRef.current) return
        setLoading(true)
        try {
            const html2canvas = (await import('html2canvas')).default
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0d0d1a',
                scale: 2,
                useCORS: true,
                logging: false,
            })
            const link = document.createElement('a')
            link.download = `${careerName.replace(/\s+/g, '_')}_promedio.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
            toast('Imagen descargada', 'success')
        } catch {
            toast('Error al generar imagen. ¿Instalaste html2canvas?', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        if (!avg) { toast('Sin notas cargadas todavía', 'warning'); return }
        const lines = [
            `${careerName} — Promedio`,
            ``,
            `Promedio general: ${avg}/10  ${getGpaLabel(avg)}`,
            `Materias con nota: ${approvedWithGrade.length} de ${approvedTotal} aprobadas`,
            ``,
            `Mejores notas:`,
            ...best.map(s => `  ${s.name}: ${s.grade}`),
            ``,
            '— generado con Noteable',
        ]
        navigator.clipboard.writeText(lines.join('\n'))
        toast('Resumen copiado al portapapeles', 'success')

        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleShare = async () => {
        if (!avg) { toast('Sin notas cargadas todavía', 'warning'); return }
        const text = `Mi promedio en ${careerName}: ${avg}/10 — ${getGpaLabel(avg)} ${approvedWithGrade.length} materias con nota cargada. #Noteable`
        if (navigator.share) {
            try {
                await navigator.share({ text })
            } catch { /*  */ }
        } else {
            navigator.clipboard.writeText(text)
            toast('Texto copiado (Web Share no disponible en este navegador)', 'info')
        }
    }

    return (
        <div className="gpa-overlay" onClick={onClose}>
            <div className="gpa-modal" onClick={e => e.stopPropagation()}>

                <div className="gpa-modal__header">
                    <div className="gpa-modal__header-left">
                        <span className="gpa-modal__header-title">Promedio académico</span>
                        <span className="gpa-modal__header-sub">{careerName}</span>
                    </div>
                    <button className="modal__close" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="gpa-card-wrap">
                    <div className="gpa-card" ref={cardRef}>

                        <div className="gpa-card__grid" aria-hidden />

                        <div className="gpa-card__inner">
                            <div className="gpa-card__app-label">Noteable · {careerName}</div>

                            {avg !== null ? (
                                <>
                                    <div className="gpa-card__hero">
                                        <div className="gpa-card__avg-wrap">
                                            <span className="gpa-card__avg" style={{ color: getGpaColor(avg) }}>
                                                {avg}
                                            </span>
                                            <span className="gpa-card__avg-denom">/10</span>
                                        </div>
                                        <div className="gpa-card__label-row">
                                            <span className="gpa-card__label-text" style={{ color: getGpaColor(avg) }}>
                                                {getGpaLabel(avg)}
                                            </span>
                                        </div>
                                        <div className="gpa-card__count">
                                            {approvedWithGrade.length} materia{approvedWithGrade.length !== 1 ? 's' : ''} con nota · {approvedTotal} aprobadas
                                        </div>
                                    </div>

                                    <div className="gpa-card__dist">
                                        {BUCKETS.map(b => {
                                            const count = approvedWithGrade.filter(s => Number(s.grade) >= b.min && Number(s.grade) <= b.max).length
                                            const heightPct = count > 0 ? Math.max((count / maxBucketCount) * 100, 12) : 0
                                            return (
                                                <div key={b.range} className="gpa-card__bucket">
                                                    <div className="gpa-card__bucket-bar-wrap">
                                                        <div
                                                            className="gpa-card__bucket-fill"
                                                            style={{ height: `${heightPct}%`, background: b.color }}
                                                        />
                                                    </div>
                                                    {count > 0 && (
                                                        <span className="gpa-card__bucket-count" style={{ color: b.color }}>{count}</span>
                                                    )}
                                                    <span className="gpa-card__bucket-label">{b.range}</span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {best.length > 0 && (
                                        <div className="gpa-card__top">
                                            <div className="gpa-card__section-title">Mejores notas</div>
                                            {best.map((s, i) => (
                                                <div key={s.id} className="gpa-card__top-row">
                                                    <span className="gpa-card__top-rank">#{i + 1}</span>
                                                    <span className="gpa-card__top-name">{s.name}</span>
                                                    <div className="gpa-card__top-bar-wrap">
                                                        <div
                                                            className="gpa-card__top-bar"
                                                            style={{
                                                                width: `${(Number(s.grade) / 10) * 100}%`,
                                                                background: getGpaColor(Number(s.grade)),
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="gpa-card__top-grade" style={{ color: getGpaColor(Number(s.grade)) }}>
                                                        {s.grade}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="gpa-card__empty">
                                    <span className="gpa-card__empty-text">
                                        Cargá notas en tus materias aprobadas para ver el promedio
                                    </span>
                                </div>
                            )}

                            <div className="gpa-card__footer-label">Noteable.app</div>
                        </div>
                    </div>
                </div>

                <div className="gpa-modal__actions">
                    <button
                        className={`btn share-copy-btn${copied ? ' share-copy-btn--copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied
                            ? <><CopySuccess size={16} color="currentColor" /> Copiado</>
                            : <><Copy size={16} color="currentColor" /> Copiar resumen</>
                        }
                    </button>
                    <button className="btn" onClick={handleShare}>
                        <Share size={16} color="currentColor" /> Compartir
                    </button>
                    <button className="btn btn--primary" onClick={handleDownload} disabled={loading}>
                        {loading ? 'Generando...' : ' Descargar imagen'}
                    </button>
                </div>

            </div>
        </div>
    )
}