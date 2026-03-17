import { useRef, useState, useMemo, useCallback } from "react"
import { X } from "lucide-react"
import type { Subject } from "../types/types"
import "./ScheduleExport.css"
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useScrollLock } from '../hooks/Usescrolllock'

interface ScheduleExportProps {
    subjects: Subject[]
    careerName: string
    currentSemester: 1 | 2
    currentYear: number
    onClose: () => void
}

interface ScheduleBlock {
    subject: Subject
    day: string
    startTime: string
    endTime: string
    startMin: number
    durationMin: number
}

const DAYS = ["lun", "mar", "mié", "jue", "vie", "sáb"]

const DAY_LABELS: Record<string, string> = {
    lun: "Lun", mar: "Mar", mié: "Mié",
    jue: "Jue", vie: "Vie", sáb: "Sáb",
}

const HOUR_START = 7
const HOUR_END = 23
const PX_PER_MIN = 1.6

const SUBJECT_COLORS = [
    { bg: "#312e81", border: "#6366f1", text: "#c7d2fe" },
    { bg: "#164e63", border: "#22d3ee", text: "#a5f3fc" },
    { bg: "#14532d", border: "#4ade80", text: "#bbf7d0" },
    { bg: "#7c2d12", border: "#fb923c", text: "#fed7aa" },
    { bg: "#4a1d96", border: "#a78bfa", text: "#ddd6fe" },
    { bg: "#881337", border: "#fb7185", text: "#fecdd3" },
    { bg: "#713f12", border: "#facc15", text: "#fef9c3" },
    { bg: "#134e4a", border: "#2dd4bf", text: "#ccfbf1" },
]

function timeToMin(t: string) {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
}

function formatHour(h: number) {
    return `${String(h).padStart(2, "0")}:00`
}

const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
}

const drawerVariants: Variants = {
    hidden: { opacity: 0, y: '100%' },
    visible: {
        opacity: 1, y: 0,
        transition: { type: 'spring', damping: 30, stiffness: 280 },
    },
    exit: {
        opacity: 0, y: '100%',
        transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
    },
}

const dayVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: 0.08 + i * 0.06, duration: 0.22, ease: 'easeOut' },
    }),
}

const blockVariants: Variants = {
    hidden: { opacity: 0, scaleY: 0.6 },
    visible: (i: number) => ({
        opacity: 1, scaleY: 1,
        transition: { delay: 0.2 + i * 0.05, type: 'spring', damping: 18, stiffness: 280 },
    }),
}

export default function ScheduleExport({
    subjects,
    careerName,
    currentSemester,
    currentYear,
    onClose,
}: ScheduleExportProps) {
    const gridRef = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useState(true)
    useScrollLock(open)
    const [downloading, setDownloading] = useState(false)

    const handleClose = useCallback(() => setOpen(false), [])

    const colorMap = useMemo(() => {
        const map: Record<string, typeof SUBJECT_COLORS[0]> = {}
        let i = 0
        subjects.forEach((s) => { map[s.id] = SUBJECT_COLORS[i++ % SUBJECT_COLORS.length] })
        return map
    }, [subjects])

    const blocks = useMemo<ScheduleBlock[]>(() => {
        const result: ScheduleBlock[] = []
        subjects.forEach((s) => {
            if (!s.schedules?.length) return
            s.schedules.forEach((sch: any) => {
                if (!sch.day || !sch.timeFrom || !sch.timeTo) return
                const startMin = timeToMin(sch.timeFrom) - HOUR_START * 60
                const endMin = timeToMin(sch.timeTo) - HOUR_START * 60
                if (startMin < 0 || endMin <= startMin) return
                result.push({
                    subject: s, day: sch.day,
                    startTime: sch.timeFrom, endTime: sch.timeTo,
                    startMin, durationMin: endMin - startMin,
                })
            })
        })
        return result
    }, [subjects])


    const { visibleMin, gridHeight, activeDays, hourLabels } = useMemo(() => {
        const occupiedMins = blocks
            .map((b) => b.startMin + HOUR_START * 60)
            .concat(blocks.map((b) => b.startMin + b.durationMin + HOUR_START * 60))

        const vStart = blocks.length
            ? Math.max(HOUR_START, Math.floor(Math.min(...occupiedMins) / 60) - 1)
            : HOUR_START
        const vEnd = blocks.length
            ? Math.min(HOUR_END, Math.ceil(Math.max(...occupiedMins) / 60) + 1)
            : HOUR_END

        const vMin = (vStart - HOUR_START) * 60
        const height = (vEnd - vStart) * 60 * PX_PER_MIN

        const days = blocks.length
            ? DAYS.filter((d) => blocks.some((b) => b.day === d))
            : DAYS

        const hours = Array.from({ length: vEnd - vStart + 1 }, (_, i) => {
            const h = vStart + i
            return { h, top: (h - vStart) * 60 * PX_PER_MIN, label: formatHour(h) }
        })

        return {
            visibleStart: vStart,
            visibleEnd: vEnd,
            visibleMin: vMin,
            gridHeight: height,
            activeDays: days,
            hourLabels: hours,
        }
    }, [blocks])

    const handleDownload = useCallback(async () => {
        if (!gridRef.current) return
        setDownloading(true)
        try {
            const html2canvas = (await import("html2canvas")).default
            const canvas = await html2canvas(gridRef.current, {
                scale: 2, useCORS: true, backgroundColor: "#0a0a0f",
            })
            const link = document.createElement("a")
            link.download = `horario_${currentYear}año_${currentSemester}C.png`
            link.href = canvas.toDataURL("image/png")
            link.click()
        } finally {
            setDownloading(false)
        }
    }, [currentYear, currentSemester])

    return (
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <motion.div
                    className="schedule-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={handleClose}
                >
                    <motion.div
                        className="schedule-drawer"
                        variants={drawerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="schedule-toolbar">
                            <div>
                                <div className="schedule-title">Exportar horario</div>
                                <div className="schedule-subtitle">
                                    {currentYear}° año · {currentSemester}° cuatrimestre · {activeDays.length} días
                                </div>
                            </div>

                            <div className="schedule-actions">
                                <motion.button
                                    className="schedule-download"
                                    onClick={handleDownload}
                                    disabled={downloading}
                                    whileTap={!downloading ? { scale: 0.96 } : {}}
                                >
                                    {downloading ? 'Exportando…' : 'Descargar'}
                                </motion.button>

                                <motion.button
                                    className="modal__close"
                                    onClick={handleClose}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X size={16} />
                                </motion.button>
                            </div>
                        </div>

                        <div className="schedule-previewWrap">
                            <div ref={gridRef} className="schedule-preview">
                                <div className="schedule-header">
                                    <div className="schedule-career">{careerName}</div>
                                    <div className="schedule-mainTitle">
                                        Horario · {currentYear}° año · {currentSemester}° cuatrimestre
                                    </div>
                                </div>

                                <div className="schedule-grid">
                                    <div className="schedule-hours" style={{ height: gridHeight }}>
                                        {hourLabels.map(({ h, top, label }) => (
                                            <div key={h} className="schedule-hour" style={{ top }}>
                                                {label}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="schedule-days">
                                        {activeDays.map((day, di) => {
                                            const dayBlocks = blocks.filter((b) => b.day === day)

                                            return (
                                                <motion.div
                                                    key={day}
                                                    className="schedule-day"
                                                    variants={dayVariants}
                                                    custom={di}
                                                    initial="hidden"
                                                    animate="visible"
                                                >
                                                    <div className="schedule-dayLabel">{DAY_LABELS[day]}</div>

                                                    <div className="schedule-dayGrid" style={{ height: gridHeight }}>
                                                        {dayBlocks.map((b, idx) => {
                                                            const col = colorMap[b.subject.id] ?? SUBJECT_COLORS[0]
                                                            const top = (b.startMin - visibleMin) * PX_PER_MIN
                                                            const height = Math.max(b.durationMin * PX_PER_MIN, 28)

                                                            return (
                                                                <motion.div
                                                                    key={idx}
                                                                    className="schedule-block"
                                                                    style={{
                                                                        top, height,
                                                                        background: col.bg,
                                                                        borderLeft: `3px solid ${col.border}`,
                                                                        transformOrigin: 'top',
                                                                    }}
                                                                    variants={blockVariants}
                                                                    custom={di * 3 + idx}
                                                                    initial="hidden"
                                                                    animate="visible"
                                                                >
                                                                    <div className="schedule-blockTitle" style={{ color: col.text }}>
                                                                        {b.subject.name}
                                                                    </div>
                                                                    {height > 36 && (
                                                                        <div className="schedule-blockTime" style={{ color: col.border }}>
                                                                            {b.startTime} – {b.endTime}
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}