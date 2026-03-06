import { useEffect, useState } from 'react'
import type { Toast } from '../hooks/Usetoast'
import React from 'react'
import type { ConfirmOptions } from '../hooks/Usetoast'
import './Toast.css'
import { TickCircle, Danger, InfoCircle, CloseCircle } from 'iconsax-react';
import { CircleQuestionMark } from 'lucide-react';

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    const icons: Record<Toast['type'], string | React.ReactNode> = {
        success: <TickCircle size={12} color='currentColor' />,
        error: <CloseCircle size={12} color='currentColor' />,
        warning: <Danger size={12} color='currentColor' />,
        info: <InfoCircle size={12} color='currentColor' />,
        confirm: <CircleQuestionMark size={12} color='currentColor' />,
    }

    return (
        <div
            className={`toast toast--${toast.type} ${visible ? 'toast--visible' : ''}`}
            onClick={() => onRemove(toast.id)}
        >
            <span className="toast__icon">{icons[toast.type]}</span>
            <span className="toast__msg">{toast.message}</span>
        </div>
    )
}

export function ToastContainer({
    toasts,
    onRemove,
}: {
    toasts: Toast[]
    onRemove: (id: string) => void
}) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onRemove={onRemove} />
            ))}
        </div>
    )
}

export function ConfirmDialog({
    dialog,
    onClose,
}: {
    dialog: (ConfirmOptions & { id: string }) | null
    onClose: () => void
}) {
    useEffect(() => {
        if (!dialog) return
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { dialog.onCancel?.(); onClose() }
            if (e.key === 'Enter') { dialog.onConfirm(); onClose() }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [dialog, onClose])

    if (!dialog) return null

    return (
        <div className="confirm-overlay" onClick={() => { dialog.onCancel?.(); onClose() }}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                <p className="confirm-dialog__msg">{dialog.message}</p>
                <div className="confirm-dialog__actions">
                    <button
                        className="btn"
                        onClick={() => { dialog.onCancel?.(); onClose() }}
                    >
                        {dialog.cancelLabel ?? 'Cancelar'}
                    </button>
                    <button
                        className="btn btn--danger"
                        onClick={() => { dialog.onConfirm(); onClose() }}
                    >
                        {dialog.confirmLabel ?? 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}