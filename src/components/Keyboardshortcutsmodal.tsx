import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import './KeyboardShortcutsModal.css'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useScrollLock } from '../hooks/Usescrolllock'

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

const isMobile = window.innerWidth <= 768


const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 280 } },
    exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } },
}

const modalDesktopVariants: Variants = {
    hidden: { opacity: 1, scale: 1, y: 0 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.12 } },
}

const groupVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: 0.08 + i * 0.07, duration: 0.22, ease: 'easeOut' },
    }),
}

const groupDesktopVariants: Variants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 },
}

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -8 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.04, duration: 0.18, ease: 'easeOut' },
    }),
}

const itemDesktopVariants: Variants = {
    hidden: { opacity: 1, x: 0 },
    visible: { opacity: 1, x: 0 },
}

const kbdVariants: Variants = {
    hidden: { opacity: 0, scale: 0.75 },
    visible: (i: number) => ({
        opacity: 1, scale: 1,
        transition: { delay: i * 0.05, type: 'spring', damping: 16, stiffness: 320 },
    }),
}

const kbdDesktopVariants: Variants = {
    hidden: { opacity: 1, scale: 1 },
    visible: { opacity: 1, scale: 1 },
}

export default function KeyboardShortcutsModal({ onClose }: Props) {
    const [open, setOpen] = useState(true)
    useScrollLock(open)

    const handleClose = useCallback(() => setOpen(false), [])

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [handleClose])

    return (
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <motion.div
                    className="ks-overlay"
                    variants={isMobile ? overlayVariants : undefined}
                    initial={isMobile ? "hidden" : false}
                    animate={isMobile ? "visible" : undefined}
                    exit={isMobile ? "exit" : undefined}
                    transition={{ duration: 0.2 }}
                    onClick={e => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        className="ks-modal"
                        variants={isMobile ? modalVariants : modalDesktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="ks-header">
                            <span className="ks-title">Atajos de teclado</span>
                            <motion.button
                                className="auth-modal__close"
                                onClick={handleClose}
                                whileHover={isMobile ? { scale: 1.1 } : undefined}
                                whileTap={isMobile ? { scale: 0.9 } : undefined}
                            >
                                <X size={15} />
                            </motion.button>
                        </div>

                        <div className="ks-content">
                            {GROUPS.map((group, gi) => (
                                <motion.div
                                    key={group.title}
                                    variants={isMobile ? groupVariants : groupDesktopVariants}
                                    custom={gi}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <div className="ks-group-title">{group.title}</div>

                                    <div className="ks-group-items">
                                        {group.items.map((item, ii) => (
                                            <motion.div
                                                key={ii}
                                                className="ks-item"
                                                variants={isMobile ? itemVariants : itemDesktopVariants}
                                                custom={ii}
                                                initial="hidden"
                                                animate="visible"
                                            >
                                                <span className="ks-description">{item.description}</span>

                                                <div className="ks-keys">
                                                    {item.keys.map((k, ki) => (
                                                        <motion.span
                                                            key={ki}
                                                            variants={isMobile ? kbdVariants : kbdDesktopVariants}
                                                            custom={ki}
                                                            initial="hidden"
                                                            animate="visible"
                                                        >
                                                            <kbd>{k}</kbd>
                                                        </motion.span>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            className="ks-footer"
                            initial={isMobile ? { opacity: 0 } : false}
                            animate={isMobile ? { opacity: 1 } : undefined}
                            transition={{ delay: 0.35, duration: 0.2 }}
                        >
                            Presioná <kbd className="ks-kbd-footer">Esc</kbd> para cerrar
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}