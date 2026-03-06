import { useState, useEffect, useRef, useMemo } from 'react'
import type { Subject } from '../types/types'
import { STATUS_CONFIG } from '../../src/assets/constants'
import { getEffectiveStatus } from '../App'
import './Spotlight.css'
import { SearchNormal } from 'iconsax-react'
import { ArrowUpDown, X } from 'lucide-react';

interface Props {
    subjects: Subject[]
    currentYear: number
    onSelect: (subject: Subject) => void
    onClose: () => void
}

export default function Spotlight({ subjects, currentYear, onClose, onSelect }: Props) {
    const [query, setQuery] = useState('')
    const [cursor, setCursor] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const results = useMemo(() => {
        if (!query.trim()) return subjects.slice(0, 8)
        const q = query.toLowerCase()
        return subjects.filter(
            s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        ).slice(0, 10)
    }, [query, subjects])

    useEffect(() => setCursor(0), [results])

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
        if (e.key === 'Enter' && results[cursor]) { onSelect(results[cursor]); onClose() }
        if (e.key === 'Escape') onClose()
    }

    useEffect(() => {
        const el = listRef.current?.children[cursor] as HTMLElement
        el?.scrollIntoView({ block: 'nearest' })
    }, [cursor])

    return (
        <div className="spotlight-overlay" onClick={onClose}>
            <div className="spotlight" onClick={e => e.stopPropagation()}>
                <div className="spotlight__input-wrap">
                    <span className="spotlight__icon"><SearchNormal size={16} color='currentColor' /></span>
                    <input
                        ref={inputRef}
                        className="spotlight__input"
                        placeholder="Buscar materia aprobadas..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                    />
                    <button className="modal__close" onClick={onClose}><X size={16} /></button>
                </div>

                {results.length > 0 && (
                    <div className="spotlight__list" ref={listRef}>
                        {results.map((s, i) => {
                            const eff = getEffectiveStatus(s, currentYear, subjects)
                            const cfg = STATUS_CONFIG[eff]
                            return (
                                <button
                                    key={s.id}
                                    className={`spotlight__item ${i === cursor ? 'spotlight__item--active' : ''}`}
                                    onMouseEnter={() => setCursor(i)}
                                    onClick={() => { onSelect(s); onClose() }}
                                >
                                    <div className="spotlight__item-left">
                                        <span className="spotlight__item-dot" style={{ background: cfg.color }} />
                                        <div>
                                            <div className="spotlight__item-name">{s.name}</div>
                                            <div className="spotlight__item-meta">{s.code} · {s.year}° año · {s.semester}° cuatri</div>
                                        </div>
                                    </div>
                                    <span className="spotlight__item-badge" style={{ color: cfg.color, background: cfg.bg }}>
                                        {cfg.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {results.length === 0 && query && (
                    <div className="spotlight__empty">Sin resultados para "{query}"</div>
                )}

                <div className="spotlight__footer">
                    <span><kbd><ArrowUpDown size={12} color='currentColor' style={{ position: "relative", top: "3" }} /></kbd> navegar</span>
                    <span><kbd>esc</kbd> cerrar</span>
                </div>
            </div>
        </div>
    )
}