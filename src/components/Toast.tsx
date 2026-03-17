import { useEffect, useState } from 'react'
import type { Toast } from '../hooks/Usetoast'
import React from 'react'
import type { ConfirmOptions } from '../hooks/Usetoast'
import './Toast.css'
import { TickCircle, Danger, InfoCircle, CloseCircle } from 'iconsax-react'
import { CircleQuestionMark } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'


const toastVariants: Variants = {
    hidden: { opacity: 0, x: 40, scale: 0.95 },
    visible: {
        opacity: 1, x: 0, scale: 1,
        transition: { type: 'spring', damping: 22, stiffness: 320 },
    },
    exit: {
        opacity: 0, x: 32, scale: 0.92,
        height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
}

const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
}

const dialogVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring', damping: 24, stiffness: 320 },
    },
    exit: {
        opacity: 0, scale: 0.95, y: 8,
        transition: { duration: 0.15, ease: 'easeIn' },
    },
}


function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const icons: Record<Toast['type'], React.ReactNode> = {
        success: <TickCircle size={12} color='currentColor' />,
        error: <CloseCircle size={12} color='currentColor' />,
        warning: <Danger size={12} color='currentColor' />,
        info: <InfoCircle size={12} color='currentColor' />,
        confirm: <CircleQuestionMark size={12} color='currentColor' />,
    }

    return (
        <motion.div
            className={`toast toast--${toast.type}`}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            onClick={() => onRemove(toast.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ overflow: 'hidden', cursor: 'pointer' }}
        >
            <span className="toast__icon">{icons[toast.type]}</span>
            <span className="toast__msg">{toast.message}</span>
        </motion.div>
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
            <AnimatePresence mode="popLayout">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onRemove={onRemove} />
                ))}
            </AnimatePresence>
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
    const [open, setOpen] = useState(false)

    useEffect(() => { setOpen(!!dialog) }, [dialog])

    useEffect(() => {
        if (!dialog) return
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { dialog.onCancel?.(); setOpen(false); setTimeout(onClose, 200) }
            if (e.key === 'Enter') { dialog.onConfirm(); setOpen(false); setTimeout(onClose, 200) }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [dialog, onClose])

    const handleCancel = () => {
        dialog?.onCancel?.()
        setOpen(false)
        setTimeout(onClose, 200)
    }

    const handleConfirm = () => {
        dialog?.onConfirm()
        setOpen(false)
        setTimeout(onClose, 200)
    }

    return (
        <AnimatePresence>
            {open && dialog && (
                <motion.div
                    className="confirm-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={handleCancel}
                >
                    <motion.div
                        className="confirm-dialog"
                        variants={dialogVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="confirm-dialog__msg">{dialog.message}</p>
                        <div className="confirm-dialog__actions">
                            <motion.button
                                className="btn"
                                onClick={handleCancel}
                                whileTap={{ scale: 0.96 }}
                            >
                                {dialog.cancelLabel ?? 'Cancelar'}
                            </motion.button>
                            <motion.button
                                className="btn btn--danger"
                                onClick={handleConfirm}
                                whileTap={{ scale: 0.96 }}
                            >
                                {dialog.confirmLabel ?? 'Confirmar'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}