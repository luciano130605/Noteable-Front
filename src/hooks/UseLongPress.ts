import { useRef, useCallback } from 'react'

export function useLongPress(
    onLongPress: () => void,
    onTap?: () => void,
    delay = 500
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const didLongPress = useRef(false)
    const startPos = useRef<{ x: number; y: number } | null>(null)

    const start = useCallback((x: number, y: number) => {
        didLongPress.current = false
        startPos.current = { x, y }
        timerRef.current = setTimeout(() => {
            didLongPress.current = true
            if (navigator.vibrate) navigator.vibrate(40)
            onLongPress()
        }, delay)
    }, [onLongPress, delay])

    const cancel = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }, [])

    const end = useCallback(() => {
        cancel()
        if (!didLongPress.current) onTap?.()
    }, [cancel, onTap])

    const move = useCallback((x: number, y: number) => {
        if (!startPos.current) return
        if (Math.abs(x - startPos.current.x) > 8 || Math.abs(y - startPos.current.y) > 8) cancel()
    }, [cancel])

    return {
        onMouseDown: (e: React.MouseEvent) => {
            if (e.button !== 0) return
            e.stopPropagation()
            start(e.clientX, e.clientY)
        },
        onMouseUp: (e: React.MouseEvent) => {
            if (e.button !== 0) return
            e.stopPropagation()
            end()
        },
        onMouseLeave: cancel,
        onTouchStart: (e: React.TouchEvent) => {
            const t = e.touches[0]
            start(t.clientX, t.clientY)
        },
        onTouchEnd: (e: React.TouchEvent) => {
            e.stopPropagation()
            end()
        },
        onTouchMove: (e: React.TouchEvent) => {
            const t = e.touches[0]
            move(t.clientX, t.clientY)
        },
    }
}