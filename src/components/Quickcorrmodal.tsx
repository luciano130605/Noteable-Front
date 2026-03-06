import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Subject } from '../types/types'

interface Props {
    subjects: Subject[]
    onSave: (targetId: string, newCorrs: string[]) => Promise<void>
    onClose: () => void
}

function formatCodeStr(raw: string): string {
    const digits = raw.replace(/\./g, '').replace(/[^0-9]/g, '')
    let out = ''
    for (let i = 0; i < digits.length && i < 3; i++) { out += digits[i]; if (i < 2) out += '.' }
    return out
}

export default function QuickCorrModal({ subjects, onSave, onClose }: Props) {
    const [targetSearch, setTargetSearch] = useState('')
    const [targetOpen, setTargetOpen] = useState(false)
    const [target, setTarget] = useState<Subject | null>(null)
    const [corrInput, setCorrInput] = useState('')
    const [corrOpen, setCorrOpen] = useState(false)
    const [corrs, setCorrs] = useState<string[]>([])
    const [saving, setSaving] = useState(false)

    const targetRef = useRef<HTMLInputElement>(null)
    const corrRef = useRef<HTMLInputElement>(null)
    const targetWrapRef = useRef<HTMLDivElement>(null)
    const corrWrapRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (targetWrapRef.current && !targetWrapRef.current.contains(e.target as Node)) setTargetOpen(false)
            if (corrWrapRef.current && !corrWrapRef.current.contains(e.target as Node)) setCorrOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [onClose])

    useEffect(() => { setTimeout(() => targetRef.current?.focus(), 50) }, [])

    const selectTarget = (s: Subject) => {
        setTarget(s)
        setTargetSearch(s.name)
        setTargetOpen(false)
        setCorrs([...s.corrApproved])
        setTimeout(() => corrRef.current?.focus(), 50)
    }

    const targetSuggestions = subjects.filter(s =>
        !targetSearch ||
        s.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(targetSearch.toLowerCase())
    )

    const corrSuggestions = subjects.filter(s =>
        s.code &&
        s.id !== target?.id &&
        !corrs.includes(s.code) &&
        (corrInput === '' ||
            s.code.includes(corrInput) ||
            s.name.toLowerCase().includes(corrInput.toLowerCase()))
    )

    const addCorr = (code: string) => {
        if (!corrs.includes(code)) setCorrs(prev => [...prev, code])
        setCorrInput('')
        setCorrOpen(false)
        corrRef.current?.focus()
    }

    const handleCorrInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fmt = formatCodeStr(e.target.value)
        setCorrInput(fmt)
        setCorrOpen(true)
        if (fmt.length === 5) {
            addCorr(fmt)
        }
    }

    const handleCorrKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && corrInput.length === 5) {
            e.preventDefault(); addCorr(corrInput)
        }
        if (e.key === 'Backspace' && corrInput === '' && corrs.length > 0) {
            setCorrs(prev => prev.slice(0, -1))
        }
        if (e.key === 'Escape') setCorrOpen(false)
    }

    const handleSave = async () => {
        if (!target) return
        setSaving(true)
        await onSave(target.id, corrs)
        setSaving(false)
        onClose()
    }

    return (
        <div className="qcm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="qcm-modal">

                <div className="qcm-header">
                    <span className="qcm-title">Correlativas rápidas</span>
                    <button type="button" className="qcm-close" onClick={onClose}><X size={15} /></button>
                </div>

                <div className="qcm-body">

                    <div className="qcm-row">
                        <label className="qcm-label">Materia</label>
                        <div ref={targetWrapRef} className="qcm-field-wrap">
                            <input
                                ref={targetRef}
                                className="qcm-input"
                                value={targetSearch}
                                onChange={e => { setTargetSearch(e.target.value); setTargetOpen(true); setTarget(null) }}
                                onFocus={() => setTargetOpen(true)}
                                onBlur={() => setTimeout(() => setTargetOpen(false), 150)}
                                placeholder="Buscar materia..."
                            />
                            {targetOpen && targetSuggestions.length > 0 && (
                                <div className="qcm-dropdown">
                                    {targetSuggestions.slice(0, 7).map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className="qcm-dropdown__item"
                                            onMouseDown={e => { e.preventDefault(); selectTarget(s) }}
                                        >
                                            <span className="qcm-dropdown__code">{s.code}</span>
                                            <span className="qcm-dropdown__name">{s.name}</span>
                                            <span className="qcm-dropdown__year">{s.year}°</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="qcm-row">
                        <label className="qcm-label">Correlativas</label>
                        <div ref={corrWrapRef} className="qcm-field-wrap">
                            <div
                                className={`qcm-tags-input${!target ? ' qcm-tags-input--disabled' : ''}`}
                                onClick={() => target && corrRef.current?.focus()}
                            >
                                {corrs.map(code => {
                                    const matched = subjects.find(s => s.code === code)
                                    return (
                                        <span key={code} className="qcm-tag" title={matched?.name}>
                                            {code}
                                            {matched && <span className="qcm-tag__name">{matched.name.length > 12 ? matched.name.slice(0, 12) + '…' : matched.name}</span>}
                                            <button type="button" onClick={e => { e.stopPropagation(); setCorrs(prev => prev.filter(c => c !== code)) }}>×</button>
                                        </span>
                                    )
                                })}
                                <input
                                    ref={corrRef}
                                    className="qcm-tags-input__field"
                                    value={corrInput}
                                    onChange={handleCorrInput}
                                    onKeyDown={handleCorrKey}
                                    onFocus={() => { if (target) setCorrOpen(true) }}
                                    onBlur={() => setTimeout(() => setCorrOpen(false), 150)}
                                    placeholder={!target ? 'Primero elegí una materia' : corrs.length === 0 ? 'Buscar o escribir código…' : ''}
                                    disabled={!target}
                                    maxLength={5}
                                />
                            </div>
                            {corrOpen && target && corrSuggestions.length > 0 && (
                                <div className="qcm-dropdown">
                                    {corrSuggestions.slice(0, 7).map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className="qcm-dropdown__item"
                                            onMouseDown={e => { e.preventDefault(); addCorr(s.code) }}
                                        >
                                            <span className="qcm-dropdown__code">{s.code}</span>
                                            <span className="qcm-dropdown__name">{s.name}</span>
                                            <span className="qcm-dropdown__year">{s.year}°</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="qcm-footer">
                    <button type="button" className="btn" onClick={onClose}>Cancelar</button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleSave}
                        disabled={!target || saving}
                    >
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>

            </div>

            <style>{`
        .qcm-overlay {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(2px);
        }
        .qcm-modal {
          background: var(--surface, #1e1e2e);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          width: 520px; max-width: calc(100vw - 32px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .qcm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .qcm-title {
          font-size: 0.88rem; font-weight: 600; color: var(--text, #e2e8f0);
        }
        .qcm-close {
          all: unset; cursor: pointer; color: var(--muted, #888);
          display: flex; align-items: center; padding: 2px;
          border-radius: 4px; transition: color 0.15s;
        }
        .qcm-close:hover { color: var(--text, #e2e8f0); }
        .qcm-body {
          padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .qcm-row {
          display: grid; grid-template-columns: 90px 1fr; align-items: start; gap: 10px;
        }
        .qcm-label {
          font-size: 0.78rem; color: var(--muted, #888);
          padding-top: 8px; font-weight: 500;
        }
        .qcm-field-wrap { position: relative; }
        .qcm-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px; padding: 7px 10px;
          font-size: 0.83rem; color: var(--text, #e2e8f0);
          outline: none; font-family: inherit;
          transition: border-color 0.15s;
        }
        .qcm-input:focus { border-color: rgba(99,102,241,0.5); }
        .qcm-tags-input {
          min-height: 36px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px; padding: 4px 8px;
          display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
          cursor: text; transition: border-color 0.15s;
        }
        .qcm-tags-input:focus-within { border-color: rgba(99,102,241,0.5); }
        .qcm-tags-input--disabled { opacity: 0.45; cursor: not-allowed; }
        .qcm-tags-input__field {
          all: unset; font-family: inherit; font-size: 0.83rem;
          color: var(--text, #e2e8f0); flex: 1; min-width: 80px;
          padding: 2px 2px;
        }
        .qcm-tags-input__field::placeholder { color: var(--muted, #888); font-size: 0.78rem; }
        .qcm-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
          border-radius: 5px; padding: 1px 6px;
          font-size: 0.74rem; color: #a5b4fc; font-family: monospace;
        }
        .qcm-tag__name {
          opacity: 0.6; font-family: inherit; font-size: 0.7rem;
        }
        .qcm-tag button {
          all: unset; cursor: pointer; color: #a5b4fc;
          font-size: 0.85rem; line-height: 1; padding: 0 1px;
          opacity: 0.7;
        }
        .qcm-tag button:hover { opacity: 1; }
        .qcm-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: var(--surface, #1e1e2e);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 400; overflow: hidden;
          max-height: 220px; overflow-y: auto;
        }
        .qcm-dropdown__item {
          all: unset; display: flex; align-items: center; gap: 8px;
          width: 100%; box-sizing: border-box;
          padding: 7px 12px; cursor: pointer;
          transition: background 0.1s;
        }
        .qcm-dropdown__item:hover { background: rgba(99,102,241,0.12); }
        .qcm-dropdown__code {
          font-size: 0.74rem; font-weight: 600; color: #6366f1;
          font-family: monospace; min-width: 34px;
        }
        .qcm-dropdown__name {
          flex: 1; font-size: 0.81rem; color: var(--text, #e2e8f0);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .qcm-dropdown__year {
          font-size: 0.71rem; color: var(--muted, #888);
        }
        .qcm-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
      `}</style>
        </div>
    )
}