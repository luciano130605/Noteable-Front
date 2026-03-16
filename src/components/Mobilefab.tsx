import { useState, useEffect, useRef } from 'react'
import { Add, CalendarAdd, SearchNormal } from 'iconsax-react'
import './Mobilefab.css'

interface Props {
    onAddSubject: () => void
    onOpenCalendar: () => void
    onOpenUpcoming: () => void
    onOpenSpotlight: () => void
    urgentCount?: number
}

export default function MobileFAB({
    onAddSubject,
    onOpenUpcoming,
    onOpenSpotlight,
    urgentCount = 0,
}: Props) {
    const [open, setOpen] = useState(false)
    const fabRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        const onOutside = (e: MouseEvent) => {
            if (fabRef.current && !fabRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('keydown', onKey)
        document.addEventListener('mousedown', onOutside)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('mousedown', onOutside)
        }
    }, [open])

    const actions = [
        {
            icon: <Add size={18} color="currentColor" />,
            label: 'Nueva materia',
            color: '#6366f1',
            onClick: () => { setOpen(false); onAddSubject() },
        },
        {
            icon: <SearchNormal size={18} color="currentColor" />,
            label: 'Buscar materias',
            color: '#10b981',
            onClick: () => { setOpen(false); onOpenSpotlight() },
        },
        {
            icon: <CalendarAdd size={18} color="currentColor" />,
            label: 'Próximos eventos',
            color: '#f59e0b',
            onClick: () => { setOpen(false); onOpenUpcoming() },
            badge: urgentCount > 0 ? urgentCount : undefined,
        },
    ]

    return (
        <div className="mfab" ref={fabRef}>
            {open && (
                <div
                    className="mfab__backdrop"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            <div className={`mfab__dial${open ? ' mfab__dial--open' : ''}`} aria-hidden={!open}>
                {actions.map((action, i) => (
                    <div
                        key={i}
                        className="mfab__item"
                        style={{
                            '--fab-color': action.color,
                            '--fab-delay': `${i * 45}ms`,
                        } as React.CSSProperties}
                    >
                        <span className="mfab__item-label">{action.label}</span>
                        <button
                            className="mfab__item-btn"
                            onClick={action.onClick}
                            tabIndex={open ? 0 : -1}
                            aria-label={action.label}
                        >
                            {action.icon}
                            {action.badge != null && (
                                <span className="mfab__item-badge">{action.badge}</span>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <button
                className={`mfab__trigger${open ? ' mfab__trigger--open' : ''}`}
                onClick={() => setOpen(v => !v)}
                aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={open}
            >
                <span className="mfab__trigger-icon">
                    <Add size={22} color="currentColor" />
                </span>

            </button>
        </div>
    )
}