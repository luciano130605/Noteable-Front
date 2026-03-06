import { X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import Xls from '../Icon/Xls'
import './Siuimporter.css'

export interface ExportSubject {
    name: string
    code: string
    year: number
    semester: number
    grade: number
    status: string
    approvedDate: string
    gradeFinalExam: number | null
    gradeOverride: number | null
    notes?: string
    credits?: number
}

interface Props {
    subjects: ExportSubject[]
    careerName: string
    onClose: () => void
}

export default function SiuExporter({ subjects, careerName, onClose }: Props) {
    const handleExport = () => {
        const rows = subjects.map(s => ({
            'Materia': s.name,
            'Código': s.code,
            'Año': s.year,
            'Cuatrimestre': s.semester,
            'Estado': s.status,
            'Nota': s.gradeOverride ?? s.grade,
            'Nota final (examen)': s.gradeFinalExam ?? '',
            'Tipo': s.gradeFinalExam === null ? 'Promoción' : 'Examen',
            'Fecha aprobación': s.approvedDate || '',
            'Créditos': s.credits ?? '',
            'Notas': s.notes ?? '',
        }))

        const ws = XLSX.utils.json_to_sheet(rows)

        ws['!cols'] = [
            { wch: 40 }, { wch: 14 }, { wch: 6 }, { wch: 14 },
            { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 12 },
            { wch: 18 }, { wch: 10 }, { wch: 30 },
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Materias')

        const filename = `${careerName.replace(/\s+/g, '_')}_materias.xlsx`
        XLSX.writeFile(wb, filename)
        onClose()
    }

    const approved = subjects.filter(s => s.status === 'approved')
    const pending = subjects.filter(s => s.status !== 'approved')

    return (
        <div
            className="siu-importer-overlay"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="siu-importer-modal">
                <div className="siu-importer-header">
                    <div>
                        <div className="siu-importer-title">Exportar materias</div>
                        <div className="siu-importer-subtitle">
                            {subjects.length} materias · {careerName}
                        </div>
                    </div>
                    <button className="modal__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="siu-importer-body">
                    <div className="siu-dropzone" style={{ cursor: 'default', pointerEvents: 'none' }}>
                        <div className="siu-dropzone-icon">
                            <Xls size={32} strokeColor="currentColor" />
                        </div>
                        <div className="siu-dropzone-text">
                            Se va a descargar un archivo <strong>.xlsx</strong>
                        </div>
                        <div className="siu-dropzone-hint">
                            Compatible con Excel, Google Sheets y SIU
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="siu-instructions">
                        <div className="siu-instructions-title">Resumen</div>
                        <ol className="siu-instructions-list" style={{ listStyle: 'none', padding: 0 }}>
                            <li><strong>{subjects.length}</strong> materias en total</li>
                            <li> <strong>{approved.length}</strong> aprobadas</li>
                            {pending.length > 0 && (
                                <li> <strong>{pending.length}</strong> en curso / pendientes</li>
                            )}
                        </ol>
                        <div className="siu-instructions-note">
                            Se exportan todos los campos: nombre, código, año, cuatrimestre,
                            nota, tipo (examen/promoción), fecha y estado.
                        </div>
                    </div>
                </div>

                <div className="siu-importer-footer">
                    <button className="btn" onClick={onClose}>Cancelar</button>
                    <button className="btn btn--primary" onClick={handleExport}>
                        <Download size={14} color="currentColor" />
                        Descargar .xlsx
                    </button>
                </div>
            </div>
        </div>
    )
}