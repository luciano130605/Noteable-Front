import { useState } from 'react'
import { CircleCheckBig, X } from 'lucide-react'
import { CopySuccess, Copy, Link, Book } from 'iconsax-react'
import './Notionwidgettutorial.css'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

interface Props {
    userId: string
    onClose: () => void
}

const STEPS = [
    {
        emoji: <Link size={24} color='currentColor' />,
        title: 'Copiá tu URL personal',
        description: 'Cada usuario tiene una URL única que muestra su progreso en tiempo real.',
        action: 'copy' as const,
    },
    {
        emoji: <Book size={24} color='currentColor' />,
        title: 'Abrí tu página en Notion',
        description: 'Escribí /Insertar en cualquier página de Notion y pegá tu URL cuando te lo pida.',
        action: 'info' as const,
        hint: 'También funciona en cualquier sitio que soporte iframes.',
    },
    {
        emoji: <CircleCheckBig size={24} color='currentColor' />,
        title: '¡Listo! Tu widget está activo',
        description: 'Se actualiza automáticamente cada vez que cargás la página. Mostrá tu progreso, materias en cursada y próximos exámenes.',
        action: 'done' as const,
    },
]

function NotionIcon({ size = 13 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z" />
        </svg>
    )
}


const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
}

const tooltipVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring', damping: 24, stiffness: 300 },
    },
    exit: {
        opacity: 0, scale: 0.95, y: 8,
        transition: { duration: 0.16, ease: 'easeIn' },
    },
}

const stepVariants: Variants = {
    enter: (dir: number) => ({
        opacity: 0, x: dir > 0 ? 28 : -28,
    }),
    center: {
        opacity: 1, x: 0,
        transition: { type: 'spring', damping: 22, stiffness: 300 },
    },
    exit: (dir: number) => ({
        opacity: 0, x: dir > 0 ? -20 : 20,
        transition: { duration: 0.15, ease: 'easeIn' },
    }),
}

const copyLabelVariants: Variants = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.14 } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.1 } },
}


export default function NotionWidgetTutorial({ userId, onClose }: Props) {
    const [open, setOpen] = useState(true)
    const [step, setStep] = useState(0)
    const [dir, setDir] = useState(1)        
    const [copied, setCopied] = useState(false)

    const widgetUrl = `${window.location.origin}/widget/${userId}`

    const handleClose = () => setOpen(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(widgetUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const goTo = (next: number) => {
        setDir(next > step ? 1 : -1)
        setStep(next)
    }

    const handleNext = () => {
        if (step < STEPS.length - 1) goTo(step + 1)
        else handleClose()
    }

    const current = STEPS[step]
    const isLast = step === STEPS.length - 1

    return (
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <>
                    <motion.div
                        className="nwt-backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={handleClose}
                    />

                    <motion.div
                        className="nwt-tooltip"
                        variants={tooltipVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="nwt-accent" />

                        <div className="nwt-header">
                            <div className="nwt-dots">
                                {STEPS.map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className={`nwt-dot ${i === step ? 'nwt-dot--active' : i < step ? 'nwt-dot--done' : 'nwt-dot--pending'}`}
                                        animate={{ scale: i === step ? 1.2 : 1 }}
                                        transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                                    />
                                ))}
                            </div>
                            <motion.button
                                className="nwt-close"
                                onClick={handleClose}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={14} />
                            </motion.button>
                        </div>

                        <AnimatePresence mode="wait" custom={dir}>
                            <motion.div
                                key={step}
                                className="nwt-content"
                                custom={dir}
                                variants={stepVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                            >
                                <div className="nwt-emoji">{current.emoji}</div>
                                <div className="nwt-title">{current.title}</div>
                                <div className="nwt-description">{current.description}</div>

                                {'hint' in current && current.hint && (
                                    <div className="nwt-hint">{current.hint}</div>
                                )}

                                {current.action === 'copy' && (
                                    <div className="nwt-copy-box">
                                        <span className="nwt-copy-url">{widgetUrl}</span>
                                        <motion.button
                                            className={`nwt-copy-btn ${copied ? 'nwt-copy-btn--copied' : 'nwt-copy-btn--default'}`}
                                            onClick={handleCopy}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <AnimatePresence mode="wait">
                                                {copied ? (
                                                    <motion.span
                                                        key="copied"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                        variants={copyLabelVariants}
                                                        initial="hidden" animate="visible" exit="exit"
                                                    >
                                                        <CopySuccess size={11} color="currentColor" /> Copiado
                                                    </motion.span>
                                                ) : (
                                                    <motion.span
                                                        key="copy"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                        variants={copyLabelVariants}
                                                        initial="hidden" animate="visible" exit="exit"
                                                    >
                                                        <Copy size={11} color="currentColor" /> Copiar
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    </div>
                                )}

                                {current.action === 'info' && (
                                    <div className="nwt-info-box">
                                        <NotionIcon size={14} />
                                        <div>
                                            <div className="nwt-info-box__title">En Notion</div>
                                            <div className="nwt-info-box__sub">
                                                Escribí <kbd className="nwt-kbd">/Insertar</kbd> → pegá tu URL
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {current.action === 'done' && (
                                    <div className="nwt-done-box">
                                        <span>
                                            Tu widget muestra <strong>progreso</strong>, <strong>materias en cursada</strong> y <strong>próximos exámenes</strong>.
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="nwt-footer">
                            <span className="nwt-footer__counter">
                                Paso {step + 1} de {STEPS.length}
                            </span>
                            <div className="nwt-footer__actions">
                                <AnimatePresence>
                                    {step > 0 && (
                                        <motion.button
                                            className="nwt-btn-back"
                                            onClick={() => goTo(step - 1)}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -8 }}
                                            transition={{ duration: 0.15 }}
                                            whileTap={{ scale: 0.96 }}
                                        >
                                            Atrás
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                                <motion.button
                                    className={`nwt-btn-next ${isLast ? 'nwt-btn-next--done' : 'nwt-btn-next--default'}`}
                                    onClick={handleNext}
                                    whileTap={{ scale: 0.96 }}
                                    layout
                                >
                                    {isLast ? 'Entendido' : 'Siguiente'}
                                </motion.button>
                            </div>
                        </div>

                        <div className="nwt-arrow" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}