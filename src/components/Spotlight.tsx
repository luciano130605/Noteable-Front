import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Subject } from '../types/types'
import { STATUS_CONFIG } from '../../src/assets/constants'
import { getEffectiveStatus } from '../App'
import './Spotlight.css'
import { SearchNormal } from 'iconsax-react'
import { ArrowUpDown, X } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useScrollLock } from '../hooks/Usescrolllock'

interface Props {
    subjects: Subject[]
    currentYear: number
    onSelect: (subject: Subject) => void
    onClose: () => void
}

const isMobile = window.innerWidth <= 768


const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.12 } },
}

const spotlightVariants: Variants = {
    hidden: { opacity: 0, scale: 0.97, y: -12 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] } },
    exit: { opacity: 0, scale: 0.97, y: -8, transition: { duration: 0.13, ease: 'easeIn' } },
}

const spotlightDesktopVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.08 } },
}

export default function Spotlight({ subjects, currentYear, onClose, onSelect }: Props) {
    const [open, setOpen] = useState(true)
    useScrollLock(open)
    const [query, setQuery] = useState('')
    const [cursor, setCursor] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const handleClose = useCallback(() => setOpen(false), [])

    useEffect(() => { inputRef.current?.focus() }, [])

    const results = useMemo(() => {
        if (!query.trim()) return subjects.slice(0, 8)
        const q = query.toLowerCase()
        return subjects.filter(
            s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        ).slice(0, 10)
    }, [query, subjects])

    useEffect(() => setCursor(0), [results])

    const handleKey = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
        if (e.key === 'Enter' && results[cursor]) { onSelect(results[cursor]); handleClose() }
        if (e.key === 'Escape') handleClose()
    }, [results, cursor, onSelect, handleClose])

    useEffect(() => {
        const el = listRef.current?.children[cursor] as HTMLElement
        el?.scrollIntoView({ block: 'nearest' })
    }, [cursor])

    return (
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <motion.div
                    className="spotlight-overlay"
                    variants={isMobile ? overlayVariants : undefined}
                    initial={isMobile ? "hidden" : false}
                    animate={isMobile ? "visible" : undefined}
                    exit={isMobile ? "exit" : undefined}
                    onClick={handleClose}
                >
                    <motion.div
                        className="spotlight"
                        variants={isMobile ? spotlightVariants : spotlightDesktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="spotlight__input-wrap">
                            <span className="spotlight__icon">
                                <SearchNormal size={16} color="currentColor" />
                            </span>
                            <input
                                ref={inputRef}
                                className="spotlight__input"
                                placeholder="Buscar materia..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={handleKey}
                            />
                            <motion.button
                                className="modal__close"
                                onClick={handleClose}
                                whileHover={isMobile ? { scale: 1.1 } : undefined}
                                whileTap={isMobile ? { scale: 0.9 } : undefined}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>

                        <div className="spotlight__list" ref={listRef}>
                            {results.length > 0 ? results.map((s, i) => {
                                const eff = getEffectiveStatus(s, currentYear, subjects)
                                const cfg = STATUS_CONFIG[eff]
                                return (
                                    <button
                                        key={s.id}
                                        className={`spotlight__item${i === cursor ? ' spotlight__item--active' : ''}`}
                                        onMouseEnter={() => setCursor(i)}
                                        onClick={() => { onSelect(s); handleClose() }}
                                    >
                                        <div className="spotlight__item-left">
                                            <span className="spotlight__item-dot" style={{ background: cfg.color }} />
                                            <div>
                                                <div className="spotlight__item-name">{s.name}</div>
                                                <div className="spotlight__item-meta">
                                                    {s.code} · {s.year}° año · {s.semester}° cuatri
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            className="spotlight__item-badge"
                                            style={{ color: cfg.color, background: cfg.bg }}
                                        >
                                            {cfg.label}
                                        </span>
                                    </button>
                                )
                            }) : query ? (
                                <div className="spotlight__empty">
                                    Sin resultados para "{query}"
                                </div>
                            ) : null}
                        </div>

                        <div className="spotlight__footer">
                            <span>
                                <kbd><ArrowUpDown size={12} color="currentColor" style={{ position: 'relative', top: 3 }} /></kbd> navegar
                            </span>
                            <span><kbd>esc</kbd> cerrar</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}