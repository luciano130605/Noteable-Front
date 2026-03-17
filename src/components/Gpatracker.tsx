import { useRef, useState } from 'react'
import type { Subject } from '../types/types'
import { toast } from '../hooks/Usetoast'
import './Gpatracker.css'
import { Copy, CopySuccess, Share } from 'iconsax-react'
import { X } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useScrollLock } from '../hooks/Usescrolllock'

interface Props {
    subjects: Subject[]
    careerName: string
    onClose: () => void
}

const isMobile = window.innerWidth <= 768

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


const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 280 } },
    exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } },
}

const modalDesktopVariants: Variants = {
    hidden: { opacity: 1, scale: 1, y: 0 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
}

const rowVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: 0.15 + i * 0.06, duration: 0.22, ease: 'easeOut' },
    }),
}

const rowDesktopVariants: Variants = {
    hidden: { opacity: 1, x: 0 },
    visible: { opacity: 1, x: 0 },
}

const barVariants: Variants = {
    hidden: { scaleY: 0, originY: 1 },
    visible: (i: number) => ({
        scaleY: 1,
        transition: { delay: 0.1 + i * 0.05, duration: 0.3, ease: 'easeOut' },
    }),
}

const topBarVariants: Variants = {
    hidden: { scaleX: 0, originX: 0 },
    visible: (i: number) => ({
        scaleX: 1,
        transition: { delay: 0.2 + i * 0.07, duration: 0.35, ease: 'easeOut' },
    }),
}

const copyLabelVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.1 } },
}

export default function GpaModal({ subjects, careerName, onClose }: Props) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useState(true)
    useScrollLock(open)
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

    const handleClose = () => setOpen(false)

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
            `${careerName} — Promedio`, ``,
            `Promedio general: ${avg}/10  ${getGpaLabel(avg)}`,
            `Materias con nota: ${approvedWithGrade.length} de ${approvedTotal} aprobadas`, ``,
            `Mejores notas:`,
            ...best.map(s => `  ${s.name}: ${s.grade}`), ``,
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
            try { await navigator.share({ text }) } catch { /**/ }
        } else {
            navigator.clipboard.writeText(text)
            toast('Texto copiado (Web Share no disponible en este navegador)', 'info')
        }
    }

    return (
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <motion.div
                    className="gpa-overlay"
                    variants={isMobile ? overlayVariants : undefined}
                    initial={isMobile ? "hidden" : false}
                    animate={isMobile ? "visible" : undefined}
                    exit={isMobile ? "exit" : undefined}
                    transition={{ duration: 0.2 }}
                    onClick={handleClose}
                >
                    <motion.div
                        className="gpa-modal"
                        variants={isMobile ? modalVariants : modalDesktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="gpa-modal__header">
                            <div className="gpa-modal__header-left">
                                <span className="gpa-modal__header-title">Promedio académico</span>
                                <span className="gpa-modal__header-sub">{careerName}</span>
                            </div>
                            <motion.button
                                className="modal__close"
                                onClick={handleClose}
                                whileHover={isMobile ? { scale: 1.1 } : undefined}
                                whileTap={isMobile ? { scale: 0.9 } : undefined}
                            >
                                <X size={16} />
                            </motion.button>
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
                                                    <motion.span
                                                        className="gpa-card__avg"
                                                        style={{ color: getGpaColor(avg) }}
                                                        initial={{ opacity: 0, scale: isMobile ? 0.7 : 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 0.05 }}
                                                    >
                                                        {avg}
                                                    </motion.span>
                                                    <span className="gpa-card__avg-denom">/10</span>
                                                </div>
                                                <div className="gpa-card__label-row">
                                                    <motion.span
                                                        className="gpa-card__label-text"
                                                        style={{ color: getGpaColor(avg) }}
                                                        initial={{ opacity: 0, y: isMobile ? 6 : 0 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.12, duration: 0.2 }}
                                                    >
                                                        {getGpaLabel(avg)}
                                                    </motion.span>
                                                </div>
                                                <motion.div
                                                    className="gpa-card__count"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.18, duration: 0.2 }}
                                                >
                                                    {approvedWithGrade.length} materia{approvedWithGrade.length !== 1 ? 's' : ''} con nota · {approvedTotal} aprobadas
                                                </motion.div>
                                            </div>

                                            <div className="gpa-card__dist">
                                                {BUCKETS.map((b, i) => {
                                                    const count = approvedWithGrade.filter(s => Number(s.grade) >= b.min && Number(s.grade) <= b.max).length
                                                    const heightPct = count > 0 ? Math.max((count / maxBucketCount) * 100, 12) : 0
                                                    return (
                                                        <div key={b.range} className="gpa-card__bucket">
                                                            <div className="gpa-card__bucket-bar-wrap">
                                                                <motion.div
                                                                    className="gpa-card__bucket-fill"
                                                                    style={{ height: `${heightPct}%`, background: b.color }}
                                                                    variants={barVariants}
                                                                    custom={i}
                                                                    initial="hidden"
                                                                    animate="visible"
                                                                />
                                                            </div>
                                                            {count > 0 && (
                                                                <motion.span
                                                                    className="gpa-card__bucket-count"
                                                                    style={{ color: b.color }}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: 0.1 + i * 0.05 + 0.2 }}
                                                                >
                                                                    {count}
                                                                </motion.span>
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
                                                        <motion.div
                                                            key={s.id}
                                                            className="gpa-card__top-row"
                                                            variants={isMobile ? rowVariants : rowDesktopVariants}
                                                            custom={i}
                                                            initial="hidden"
                                                            animate="visible"
                                                        >
                                                            <span className="gpa-card__top-rank">#{i + 1}</span>
                                                            <span className="gpa-card__top-name">{s.name}</span>
                                                            <div className="gpa-card__top-bar-wrap">
                                                                <motion.div
                                                                    className="gpa-card__top-bar"
                                                                    style={{
                                                                        width: `${(Number(s.grade) / 10) * 100}%`,
                                                                        background: getGpaColor(Number(s.grade)),
                                                                    }}
                                                                    variants={topBarVariants}
                                                                    custom={i}
                                                                    initial="hidden"
                                                                    animate="visible"
                                                                />
                                                            </div>
                                                            <span className="gpa-card__top-grade" style={{ color: getGpaColor(Number(s.grade)) }}>
                                                                {s.grade}
                                                            </span>
                                                        </motion.div>
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
                            <motion.button
                                className={`btn share-copy-btn${copied ? ' share-copy-btn--copied' : ''}`}
                                onClick={handleCopy}
                                whileTap={isMobile ? { scale: 0.96 } : undefined}
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.span
                                            key="copied"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            variants={copyLabelVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                        >
                                            <CopySuccess size={16} color="currentColor" /> Copiado
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="copy"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            variants={copyLabelVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                        >
                                            <Copy size={16} color="currentColor" /> Copiar resumen
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            <motion.button
                                className="btn"
                                onClick={handleShare}
                                whileTap={isMobile ? { scale: 0.96 } : undefined}
                            >
                                <Share size={16} color="currentColor" /> Compartir
                            </motion.button>

                            <motion.button
                                className="btn btn--primary"
                                onClick={handleDownload}
                                disabled={loading}
                                whileTap={isMobile && !loading ? { scale: 0.96 } : undefined}
                            >
                                {loading ? 'Generando...' : 'Descargar imagen'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}