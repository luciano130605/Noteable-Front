import { useState, useCallback, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'confirm'

export interface Toast {
    id: string
    type: ToastType
    message: string
    duration?: number
}

export interface ConfirmOptions {
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
}

let externalAdd: ((t: Omit<Toast, 'id'>) => void) | null = null
let externalConfirm: ((opts: ConfirmOptions) => void) | null = null

export function toast(message: string, type: ToastType = 'info', duration = 3000) {
    externalAdd?.({ type, message, duration })
}

export function confirm(opts: ConfirmOptions) {
    externalConfirm?.(opts)
}

export function useToastSystem() {
    const [toasts, setToasts] = useState<Toast[]>([])
    const [confirmDialog, setConfirmDialog] = useState<(ConfirmOptions & { id: string }) | null>(null)
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    const add = useCallback((t: Omit<Toast, 'id'>) => {
        const id = crypto.randomUUID()
        setToasts(prev => [...prev, { ...t, id }])
        if (t.duration !== 0) {
            timers.current[id] = setTimeout(() => {
                setToasts(prev => prev.filter(x => x.id !== id))
                delete timers.current[id]
            }, t.duration ?? 3000)
        }
        externalAdd = add
    }, [])

    const remove = useCallback((id: string) => {
        clearTimeout(timers.current[id])
        delete timers.current[id]
        setToasts(prev => prev.filter(x => x.id !== id))
    }, [])

    const showConfirm = useCallback((opts: ConfirmOptions) => {
        setConfirmDialog({ ...opts, id: crypto.randomUUID() })
    }, [])

    externalAdd = add
    externalConfirm = showConfirm

    return { toasts, remove, confirmDialog, setConfirmDialog }
}