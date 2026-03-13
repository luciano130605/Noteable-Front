import { useState } from 'react'
import { ArrowLeft2, Keyboard, MessageQuestion } from 'iconsax-react'
import "./Appheader.css"

type Item = 'tutorial' | 'atajos' | 'contacto' | 'novedades' | null

interface Props {
    onBack: () => void
    onOpenOnboarding: () => void
    onOpenShortcuts: () => void
}

export default function SoportePanel({ onBack, onOpenOnboarding, onOpenShortcuts }: Props) {
    const [open, setOpen] = useState<Item>(null)

    const toggle = (id: Item) => setOpen(prev => prev === id ? null : id)

    return (
        <div className="hdr-menu__section">
            <button className="hdr-menu__back" onClick={onBack}>
                <ArrowLeft2 size={16} color="currentColor" /> Volver
            </button>
            <div className="hdr-menu__section-title">Soporte</div>

            {/* Tutorial */}
            <button className="hdr-menu__item" onClick={() => toggle('tutorial')}>
                <span className="hdr-menu__item-icon">
                    <QuestionIcon />
                </span>
                <span className="hdr-menu__item-label">Tutorial</span>
                <Chevron open={open === 'tutorial'} />
            </button>
            {open === 'tutorial' && (
                <div className="hdr-soporte__expand">
                    <p className="hdr-pref__hint">Aprendé a usar la app desde cero.</p>
                    <button className="hdr-soporte__sub-btn" onClick={onOpenOnboarding}>
                        Ver tutorial completo
                    </button>
                    <button className="hdr-soporte__sub-btn">
                        Tutorial: Widget Notion
                    </button>
                </div>
            )}

            <div className="hdr-menu__divider" />

            {/* Atajos */}
            <button className="hdr-menu__item" onClick={() => toggle('atajos')}>
                <span className="hdr-menu__item-icon">
                    <Keyboard size={14} color="currentColor" />
                </span>
                <span className="hdr-menu__item-label">Atajos de teclado</span>
                <span className="hdr-menu__item-value" style={{ display: 'flex', gap: 3 }}>
                    <kbd className="header__search-kbd">Shift</kbd>
                    <kbd className="header__search-kbd">A</kbd>
                </span>
                <Chevron open={open === 'atajos'} />
            </button>
            {open === 'atajos' && (
                <div className="hdr-soporte__expand">
                    <p className="hdr-pref__hint">Navegá más rápido sin levantar las manos.</p>
                    <button className="hdr-soporte__sub-btn" onClick={onOpenShortcuts}>
                        Ver todos los atajos
                    </button>
                </div>
            )}

            <div className="hdr-menu__divider" />

            {/* Feedback */}
            <button className="hdr-menu__item" onClick={() => toggle('contacto')}>
                <span className="hdr-menu__item-icon">
                    <MessageQuestion size={14} color="currentColor" />
                </span>
                <span className="hdr-menu__item-label">Contacto y feedback</span>
                <Chevron open={open === 'contacto'} />
            </button>
            {open === 'contacto' && (
                <div className="hdr-soporte__expand">
                    <p className="hdr-pref__hint">¿Bug o sugerencia? Contanos.</p>
                    <a className="hdr-soporte__sub-btn" href="mailto:hola@tuapp.com">
                        Mandar feedback por mail
                    </a>
                    <a className="hdr-soporte__sub-btn"
                        href="https://github.com/tu-repo/issues"
                        target="_blank" rel="noreferrer">
                        GitHub — reportar issue
                    </a>
                </div>
            )}
        </div>
    )
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={{
                marginLeft: 4, transition: 'transform .2s',
                transform: open ? 'rotate(90deg)' : 'none',
                color: 'var(--muted)'
            }}>
            <polyline points="9 18 15 12 9 6" />
        </svg>
    )
}

function QuestionIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
}