import { useEffect } from 'react'
import type { ReactNode } from 'react'
import './modal.css'
import { X } from 'lucide-react'
import { useScrollLock } from '../hooks/Usescrolllock'

type Props = {
    open: boolean
    onClose: () => void
    title?: string
    children: ReactNode
}

export default function Modal({
    open,
    onClose,
    title,
    children,
}: Props) {
    if (!open) return

    useEffect(() => {
        useScrollLock(open)

        document.body.style.overflow = 'hidden'

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleKey)

        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', handleKey)
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="modal_backdrop" onClick={onClose}>
            <div
                className="modal_box"
                onClick={e => e.stopPropagation()}
            >

                {title && (
                    <div className="modal_header">
                        <h3>{title}</h3>

                        <button
                            className="modal__close"
                            onClick={onClose}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="modal__content">
                    {children}
                </div>

            </div>
        </div>
    )
}