import { useRef, useState, useMemo } from "react"
import { X } from "lucide-react"
import type { Subject } from "../types/types"
import "./ScheduleExport.css"

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
    lun: "Lun",
    mar: "Mar",
    mié: "Mié",
    jue: "Jue",
    vie: "Vie",
    sáb: "Sáb",
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

export default function ScheduleExport({
    subjects,
    careerName,
    currentSemester,
    currentYear,
    onClose,
}: ScheduleExportProps) {
    const gridRef = useRef<HTMLDivElement>(null)
    const [downloading, setDownloading] = useState(false)

    const colorMap = useMemo(() => {
        const map: Record<string, typeof SUBJECT_COLORS[0]> = {}
        let i = 0
        subjects.forEach((s) => {
            map[s.id] = SUBJECT_COLORS[i++ % SUBJECT_COLORS.length]
        })
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
                    subject: s,
                    day: sch.day,
                    startTime: sch.timeFrom,
                    endTime: sch.timeTo,
                    startMin,
                    durationMin: endMin - startMin,
                })
            })
        })

        return result
    }, [subjects])

    const occupiedMins = blocks
        .map((b) => b.startMin + HOUR_START * 60)
        .concat(blocks.map((b) => b.startMin + b.durationMin + HOUR_START * 60))

    const visibleStart = blocks.length
        ? Math.max(HOUR_START, Math.floor(Math.min(...occupiedMins) / 60) - 1)
        : HOUR_START

    const visibleEnd = blocks.length
        ? Math.min(HOUR_END, Math.ceil(Math.max(...occupiedMins) / 60) + 1)
        : HOUR_END

    const visibleMin = (visibleStart - HOUR_START) * 60
    const visibleTotal = (visibleEnd - visibleStart) * 60
    const gridHeight = visibleTotal * PX_PER_MIN

    const activeDays = blocks.length
        ? DAYS.filter((d) => blocks.some((b) => b.day === d))
        : DAYS

    const handleDownload = async () => {
        if (!gridRef.current) return
        setDownloading(true)

        try {
            const html2canvas = (await import("html2canvas")).default

            const canvas = await html2canvas(gridRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#0a0a0f",
            })

            const link = document.createElement("a")
            link.download = `horario_${currentYear}año_${currentSemester}C.png`
            link.href = canvas.toDataURL("image/png")
            link.click()
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="schedule-overlay" onClick={onClose}>
            <div className="schedule-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="schedule-toolbar">
                    <div>
                        <div className="schedule-title">Exportar horario</div>
                        <div className="schedule-subtitle">
                            {currentYear}° año · {currentSemester}° cuatrimestre ·{" "}
                            {activeDays.length} días
                        </div>
                    </div>

                    <div className="schedule-actions">
                        <button
                            className="schedule-download"
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            {downloading ? "Exportando…" : "Descargar"}
                        </button>

                        <button className="modal__close" onClick={onClose}>
                            <X size={16} />
                        </button>
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
                                {Array.from(
                                    { length: visibleEnd - visibleStart + 1 },
                                    (_, i) => {
                                        const h = visibleStart + i
                                        const top = (h - visibleStart) * 60 * PX_PER_MIN

                                        return (
                                            <div
                                                key={h}
                                                className="schedule-hour"
                                                style={{ top }}
                                            >
                                                {formatHour(h)}
                                            </div>
                                        )
                                    }
                                )}
                            </div>

                            <div className="schedule-days">
                                {activeDays.map((day) => {
                                    const dayBlocks = blocks.filter((b) => b.day === day)

                                    return (
                                        <div key={day} className="schedule-day">
                                            <div className="schedule-dayLabel">
                                                {DAY_LABELS[day]}
                                            </div>

                                            <div
                                                className="schedule-dayGrid"
                                                style={{ height: gridHeight }}
                                            >
                                                {dayBlocks.map((b, idx) => {
                                                    const col =
                                                        colorMap[b.subject.id] ?? SUBJECT_COLORS[0]

                                                    const top =
                                                        (b.startMin - visibleMin) * PX_PER_MIN

                                                    const height = Math.max(
                                                        b.durationMin * PX_PER_MIN,
                                                        28
                                                    )

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="schedule-block"
                                                            style={{
                                                                top,
                                                                height,
                                                                background: col.bg,
                                                                borderLeft: `3px solid ${col.border}`,
                                                            }}
                                                        >
                                                            <div
                                                                className="schedule-blockTitle"
                                                                style={{ color: col.text }}
                                                            >
                                                                {b.subject.name}
                                                            </div>

                                                            {height > 36 && (
                                                                <div
                                                                    className="schedule-blockTime"
                                                                    style={{ color: col.border }}
                                                                >
                                                                    {b.startTime} – {b.endTime}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}