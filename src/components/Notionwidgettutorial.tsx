import { useState, useEffect } from 'react'
import { CircleCheckBig, X } from 'lucide-react'
import { CopySuccess, Copy, Link, Book } from 'iconsax-react'
import './Notionwidgettutorial.css'

interface Props {
    userId: string
    onClose: () => void
}

const STEPS = [
    {
        emoji: <Link size={24} color="#e2e8f0" />,
        title: 'Copiá tu URL personal',
        description: 'Cada usuario tiene una URL única que muestra su progreso en tiempo real.',
        action: 'copy' as const,
    },
    {
        emoji: <Book size={24} color="#e2e8f0" />,
        title: 'Abrí tu página en Notion',
        description: 'Escribí /embed en cualquier página de Notion y pegá tu URL cuando te lo pida.',
        action: 'info' as const,
        hint: 'También funciona en cualquier sitio que soporte iframes.',
    },
    {
        emoji: <CircleCheckBig size={24} color="#e2e8f0" />,
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

export default function NotionWidgetTutorial({ userId, onClose }: Props) {
    const [step, setStep] = useState(0)
    const [copied, setCopied] = useState(false)
    const [visible, setVisible] = useState(false)

    const widgetUrl = `${window.location.origin}/widget/${userId}`

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10)
        return () => clearTimeout(t)
    }, [])

    const handleClose = () => {
        setVisible(false)
        setTimeout(onClose, 220)
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(widgetUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleNext = () => {
        if (step < STEPS.length - 1) setStep(s => s + 1)
        else handleClose()
    }

    const current = STEPS[step]
    const isLast = step === STEPS.length - 1

    return (
        <>
            <div
                className={`nwt-backdrop${visible ? ' nwt-backdrop--visible' : ''}`}
                onClick={handleClose}
            />

            <div className={`nwt-tooltip${visible ? ' nwt-tooltip--visible' : ''}`}>

                <div className="nwt-accent" />

                <div className="nwt-header">
                    <div className="nwt-dots">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`nwt-dot ${i === step ? 'nwt-dot--active'
                                        : i < step ? 'nwt-dot--done'
                                            : 'nwt-dot--pending'
                                    }`}
                            />
                        ))}
                    </div>
                    <button className="nwt-close" onClick={handleClose}>
                        <X size={14} />
                    </button>
                </div>

                <div className="nwt-content">
                    <div className="nwt-emoji">{current.emoji}</div>
                    <div className="nwt-title">{current.title}</div>
                    <div className="nwt-description">{current.description}</div>

                    {'hint' in current && current.hint && (
                        <div className="nwt-hint">{current.hint}</div>
                    )}

                    {current.action === 'copy' && (
                        <div className="nwt-copy-box">
                            <span className="nwt-copy-url">{widgetUrl}</span>
                            <button
                                className={`nwt-copy-btn ${copied ? 'nwt-copy-btn--copied' : 'nwt-copy-btn--default'}`}
                                onClick={handleCopy}
                            >
                                {copied
                                    ? <CopySuccess size={11} color="currentColor" />
                                    : <Copy size={11} color="currentColor" />
                                }
                                {copied ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    )}

                    {current.action === 'info' && (
                        <div className="nwt-info-box">
                            <NotionIcon size={14} />
                            <div>
                                <div className="nwt-info-box__title">En Notion</div>
                                <div className="nwt-info-box__sub">
                                    Escribí <kbd className="nwt-kbd">/embed</kbd> → pegá tu URL
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
                </div>

                <div className="nwt-footer">
                    <span className="nwt-footer__counter">
                        Paso {step + 1} de {STEPS.length}
                    </span>
                    <div className="nwt-footer__actions">
                        {step > 0 && (
                            <button className="btn" onClick={() => setStep(s => s - 1)}>
                                Atrás
                            </button>
                        )}
                        <button
                            className={`btn btn--primary`}
                            onClick={handleNext}
                        >
                            {isLast ? 'Entendido' : 'Siguiente'}
                        </button>
                    </div>
                </div>

                <div className="nwt-arrow" />
            </div>
        </>
    )
}