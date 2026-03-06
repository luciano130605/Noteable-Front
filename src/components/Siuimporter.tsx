import { X } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import Xls from '../Icon/Xls'
import './SiuImporter.css'
import { Trash, Copy, Status } from 'iconsax-react'

export interface SiuSubject {
    name: string
    code: string
    year: number
    semester: number
    grade: number
    status: 'approved'
    approvedDate: string
    gradeFinalExam: number | null
    gradeOverride: number | null
}

interface Props {
    onImport: (subjects: SiuSubject[]) => void
    onClose: () => void
}

function parseCode(raw: string): { code: string; year: number; semester: number } | null {
    const match = raw.match(/(\d+)\.(\d+)\.(\d+)/)
    if (!match) return null

    return {
        code: `${match[1]}.${match[2]}.${match[3]}`,
        year: parseInt(match[1], 10),
        semester: parseInt(match[2], 10),
    }
}

function parseGrade(raw: string | number): number | null {
    if (typeof raw === 'number') return raw
    const cleaned = String(raw).replace(',', '.')
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
}

function parseDate(raw: string): string {
    if (!raw) return ''
    const parts = raw.split('/')
    if (parts.length === 3)
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    return ''
}

export default function SiuImporter({ onImport, onClose }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<SiuSubject[]>([])
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState<'upload' | 'preview'>('upload')
    const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number; idx: number }>({
        visible: false, x: 0, y: 0, idx: -1
    })
    const ctxMenuRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        if (!ctxMenu.visible) return
        const h = (e: MouseEvent) => {
            if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node))
                setCtxMenu(m => ({ ...m, visible: false }))
        }
        window.addEventListener('mousedown', h)
        return () => window.removeEventListener('mousedown', h)
    }, [ctxMenu.visible])

    useEffect(() => {
        if (!ctxMenu.visible) return
        const h = (e: MouseEvent) => {
            if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node))
                setCtxMenu(m => ({ ...m, visible: false }))
        }
        window.addEventListener('mousedown', h)
        return () => window.removeEventListener('mousedown', h)
    }, [ctxMenu.visible])

    const handlePreviewContextMenu = (e: React.MouseEvent, idx: number) => {
        e.preventDefault()
        const menuW = 200, menuH = 160
        const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX
        const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY
        setCtxMenu({ visible: true, x, y, idx })
    }

    const handleFile = (file: File) => {
        setError(null)
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

                let headerRow = -1
                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    if (rows[i].some((c: any) => String(c).toLowerCase().includes('actividad'))) {
                        headerRow = i
                        break
                    }
                }

                if (headerRow === -1) {
                    setError('No se encontró la cabecera del archivo.')
                    return
                }

                const headers: string[] = rows[headerRow].map((h: any) =>
                    String(h).toLowerCase().trim()
                )

                const colIdx = (name: string) =>
                    headers.findIndex(h => h.includes(name))

                const iActividad = colIdx('actividad')
                const iFecha = colIdx('fecha')
                const iNota = colIdx('nota')
                const iResultado = colIdx('resultado')

                if (iActividad === -1 || iFecha === -1 || iNota === -1) {
                    setError('No se encontraron las columnas esperadas.')
                    return
                }

                const subjects: SiuSubject[] = []

                for (let i = headerRow + 1; i < rows.length; i++) {
                    const row = rows[i]
                    const actividadRaw = String(row[iActividad] ?? '').trim()
                    if (!actividadRaw) continue

                    const nameMatch = actividadRaw.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
                    const name = nameMatch ? nameMatch[1].trim() : actividadRaw
                    const codeRaw = nameMatch ? nameMatch[2] : actividadRaw

                    const parsed = parseCode(codeRaw)
                    if (!parsed) continue

                    const grade = parseGrade(row[iNota])
                    if (grade === null) continue

                    const fecha = parseDate(String(row[iFecha] ?? ''))
                    const resultado = String(row[iResultado] ?? '').toLowerCase()

                    const isTipo = headers.findIndex(h => h.includes('tipo'))
                    const tipo = isTipo >= 0 ? String(row[isTipo] ?? '').toLowerCase() : ''
                    const isPromocion = tipo.includes('promo') || resultado.includes('promo')

                    subjects.push({
                        name,
                        code: parsed.code,
                        year: parsed.year,
                        semester: parsed.semester,
                        grade,
                        status: 'approved',
                        approvedDate: fecha,
                        gradeFinalExam: isPromocion ? null : grade,
                        gradeOverride: null,
                    })
                }

                if (subjects.length === 0) {
                    setError('No se encontraron materias aprobadas.')
                    return
                }

                setPreview(subjects)
                setStep('preview')
            } catch {
                setError('Error al leer el archivo.')
            }
        }

        reader.readAsArrayBuffer(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    return (
        <div
            className="siu-importer-overlay"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="siu-importer-modal">
                <div className="siu-importer-header">
                    <div>
                        <div className="siu-importer-title">
                            Importar desde SIU Guaraní
                        </div>
                        <div className="siu-importer-subtitle">
                            {step === 'upload'
                                ? 'Subí el .xls exportado desde el SIU'
                                : `${preview.length} materias encontradas · revisá antes de importar`}
                        </div>

                    </div>

                    <button className="modal__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="siu-importer-body">
                    {step === 'upload' && (
                        <>
                            <div
                                className="siu-dropzone"
                                onDrop={handleDrop}
                                onDragOver={e => e.preventDefault()}
                                onClick={() => inputRef.current?.click()}
                            >
                                <div className="siu-dropzone-icon">
                                    <Xls size={32} strokeColor="currentColor" />
                                </div>

                                <div className="siu-dropzone-text">
                                    Arrastrá el archivo acá o{' '}
                                    <span className="siu-dropzone-link">
                                        hacé clic para buscarlo
                                    </span>
                                </div>

                                <div className="siu-dropzone-hint">
                                    .xls o .xlsx exportado desde SIU Guaraní
                                </div>

                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".xls,.xlsx"
                                    className="siu-hidden-input"
                                    onChange={e => {
                                        if (e.target.files?.[0])
                                            handleFile(e.target.files[0])
                                    }}
                                />
                            </div>

                            {error && (
                                <div className="siu-error">
                                    {error}
                                </div>
                            )}
                            <div className="siu-instructions">
                                <div className="siu-instructions-title">
                                    ¿Cómo exportar?
                                </div>

                                <div className="siu-instructions-note">
                                    Solo se importan las materias aprobadas. No se agregan correlativas,
                                    notas parciales ni fechas adicionales.
                                </div>

                                <ol className="siu-instructions-list">
                                    <li>Entrá al SIU Guaraní con tu usuario</li>
                                    <li>
                                        Ir a <strong className="siu-highlight">Reportes → Historia académica</strong>
                                    </li>
                                    <li>
                                        Buscá el icono de <strong className="siu-highlight">Excel</strong>
                                    </li>
                                    <li>Subí ese archivo acá</li>
                                </ol>
                            </div>
                        </>
                    )}


                    {step === 'preview' && (
                        <div className="siu-preview">
                            {preview.map((s, i) => (
                                <div key={i} className="siu-preview-card" onContextMenu={e => handlePreviewContextMenu(e, i)}>
                                    <div>
                                        <div className="siu-preview-name">
                                            {s.name}
                                        </div>
                                        <div className="siu-preview-meta">
                                            {s.code} · {s.year}° año · {s.semester}° cuatri
                                        </div>
                                    </div>

                                    <div className="siu-preview-date">
                                        {s.approvedDate || '—'}
                                    </div>

                                    <div
                                        className={`siu-grade ${s.grade >= 7
                                            ? 'grade-high'
                                            : s.grade >= 4
                                                ? 'grade-mid'
                                                : 'grade-low'
                                            }`}
                                    >
                                        {s.grade}
                                    </div>

                                    <div
                                        className={`siu-badge ${s.gradeFinalExam === null
                                            ? 'badge-promo'
                                            : 'badge-exam'
                                            }`}
                                    >
                                        {s.gradeFinalExam === null
                                            ? 'Promoción'
                                            : 'Examen'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {ctxMenu.visible && (() => {
                    const s = preview[ctxMenu.idx]
                    if (!s) return null
                    return (
                        <div
                            ref={ctxMenuRef}
                            className="context-menu"
                            style={{ top: ctxMenu.y, left: ctxMenu.x, position: 'fixed', zIndex: 9999 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                padding: '6px 12px 8px',
                                fontSize: '0.72rem', color: '#64748b',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                marginBottom: 4,
                                maxWidth: 180, overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {s.name}
                            </div>

                            <button className="context-menu__item" onClick={() => {
                                setPreview(p => p.map((item, i) =>
                                    i === ctxMenu.idx
                                        ? { ...item, gradeFinalExam: item.gradeFinalExam === null ? item.grade : null }
                                        : item
                                ))
                                setCtxMenu(m => ({ ...m, visible: false }))
                            }}>
                                <Status size={14} color="currentColor" />
                                {s.gradeFinalExam === null ? 'Cambiar a Examen' : 'Cambiar a Promoción'}
                            </button>

                            <div className="context-menu__divider" />

                            <button className="context-menu__item" onClick={() => {
                                navigator.clipboard.writeText([s.name, s.code].filter(Boolean).join(' — ')).catch(() => { })
                                setCtxMenu(m => ({ ...m, visible: false }))
                            }}>
                                <Copy size={14} color="currentColor" /> Copiar nombre/código
                            </button>

                            <div className="context-menu__divider" />

                            <button className="context-menu__item context-menu__item--danger" onClick={() => {
                                setPreview(p => p.filter((_, i) => i !== ctxMenu.idx))
                                setCtxMenu(m => ({ ...m, visible: false }))
                            }}>
                                <Trash size={14} color="currentColor" /> Quitar de la importación
                            </button>
                        </div>
                    )
                })()}

                <div className="siu-importer-footer">
                    {step === 'preview' && (
                        <button
                            className="btn"
                            onClick={() => {
                                setStep('upload')
                                setPreview([])
                                setError(null)
                            }}
                        >
                            Volver
                        </button>
                    )}

                    <button className="btn " onClick={onClose}>
                        Cancelar
                    </button>

                    {step === 'preview' && (
                        <button
                            className="btn btn--primary"
                            onClick={() => {
                                onImport(preview)
                                onClose()
                            }}
                        >
                            Importar {preview.length} materias
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}