import { useEffect } from 'react'

export interface ShortcutAction {
    key: string
    ctrl?: boolean
    shift?: boolean
    description: string
    action: () => void
    allowInInputs?: boolean
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName
            const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)

            for (const s of shortcuts) {
                const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
                const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey

                if (ctrlMatch && shiftMatch && e.key.toLowerCase() === s.key.toLowerCase()) {
                    if (inInput && !s.allowInInputs) return  
                    e.preventDefault()
                    s.action()
                    return
                }
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [shortcuts])
}