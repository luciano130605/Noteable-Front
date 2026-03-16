import { useState, useEffect } from 'react'
import type { Subject } from '../types/types'

export interface ActiveClass {
    subject: Subject
    schedule: {
        id: string
        day: string
        timeFrom: string
        timeTo: string
        location: string
    }
    minutesUntil: number 
    isOngoing: boolean
}

const DAY_MAP: Record<string, number> = {
    lun: 1, mar: 2, 'mié': 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6,
}

function parseMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

export function useClassReminder(
    subjects: Subject[],
    enabled: boolean,
    minutesBefore = 5
): ActiveClass | null {
    const [active, setActive] = useState<ActiveClass | null>(null)

    useEffect(() => {
        if (!enabled) { setActive(null); return }

        function check() {
            const now = new Date()
            const todayDow = now.getDay() 
            const nowMin = now.getHours() * 60 + now.getMinutes()

            for (const subject of subjects) {
                if (!subject.zoomLink && !subject.aulaVirtualLink) continue
                if (!['in_progress', 'retaking'].includes(subject.status)) continue
                const schedules: any[] = (subject as any).schedules ?? []

                for (const sch of schedules) {
                    if (!sch.timeFrom || !sch.timeTo) continue
                    const schDow = DAY_MAP[sch.day?.toLowerCase()] ?? DAY_MAP[sch.day]
                    if (schDow !== todayDow) continue

                    const startMin = parseMinutes(sch.timeFrom)
                    const endMin = parseMinutes(sch.timeTo)
                    const minutesUntil = startMin - nowMin

                    if (minutesUntil <= minutesBefore && nowMin < endMin) {
                        setActive({
                            subject,
                            schedule: sch,
                            minutesUntil,
                            isOngoing: minutesUntil <= 0,
                        })
                        return
                    }
                }
            }
            setActive(null)
        }

        check()
        const interval = setInterval(check, 30_000)
        return () => clearInterval(interval)
    }, [subjects, enabled, minutesBefore])

    return active
}