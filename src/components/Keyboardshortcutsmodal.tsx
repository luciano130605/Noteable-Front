import { useEffect } from 'react'
import { X } from 'lucide-react'
import './KeyboardShortcutsModal.css'

interface ShortcutGroup {
    title: string
    items: { keys: string[]; description: string }[]
}

const GROUPS: ShortcutGroup[] = [
    {
        title: 'Navegación',
        items: [
            { keys: ['Ctrl', 'f'], description: 'Buscar materias' },
            { keys: ['Ctrl', 'y'], description: 'Abrir / cerrar calendario' },
            { keys: ['Ctrl', 'i'], description: 'Mostrar / ocultar promedio (GPA)' },
            { keys: ['Ctrl', 'b'], description: 'Alternar vista compacta' },
            { keys: ['Ctrl', 'k'], description: 'Alternar vista kanban' },
        ],
    },
    {
        title: 'Acciones',
        items: [
            { keys: ['Ctrl', 'm'], description: 'Nueva materia' },
            { keys: ['shift', 'i'], description: 'Importar desde SIU (.xls)' },
            { keys: ['shift', 'e'], description: 'Exportar materias (.xlsx)' },
            { keys: ['shift', 's'], description: 'Exportar horario (.png)' },
            { keys: ['Esc'], description: 'Cerrar modal / menú abierto' },
            { keys: ['shift', 'q'], description: 'Agregar correlativa rápida (en modal abierto)' },

        ],
    },
    {
        title: 'Ayuda',
        items: [
            { keys: ['Shift', 'a'], description: 'Mostrar esta pantalla de atajos' },
        ],
    },
]

interface Props {
    onClose: () => void
}

export default function KeyboardShortcutsModal({ onClose }: Props) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [onClose])

    return (
        <div
            className="ks-overlay"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="ks-modal">
                <div className="ks-header">
                    <span className="ks-title">Atajos de teclado</span>
                    <button className="auth-modal__close" onClick={onClose}>
                        <X size={15} />
                    </button>
                </div>

                <div className="ks-content">
                    {GROUPS.map(group => (
                        <div key={group.title}>
                            <div className="ks-group-title">
                                {group.title}
                            </div>

                            <div className="ks-group-items">
                                {group.items.map((item, i) => (
                                    <div key={i} className="ks-item">
                                        <span className="ks-description">
                                            {item.description}
                                        </span>

                                        <div className="ks-keys">
                                            {item.keys.map((k, ki) => (
                                                <span key={ki}>
                                                    <kbd>{k}</kbd>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="ks-footer">
                    Presioná <kbd className="ks-kbd-footer">Esc</kbd> para cerrar
                </div>
            </div>
        </div>
    )
}