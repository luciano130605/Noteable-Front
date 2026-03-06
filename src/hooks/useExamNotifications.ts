import { useEffect, useRef, useCallback } from 'react'

export interface ExamEvent {
    date: string
    title: string
}

export interface NotifPrefs {
    enabled: boolean
    types: ('final' | 'parcial')[]
    daysBefore: number[]
    notifyHour?: number
}

function getUpcomingAlerts(events: ExamEvent[], prefs: NotifPrefs) {
    const now = new Date()
    const alerts: { fireAt: Date; title: string; body: string }[] = []

    for (const ev of events) {
        const examDate = new Date(ev.date + 'T12:00:00')
        if (examDate < now) continue

        const lowerTitle = ev.title.toLowerCase()
        const isFinal = lowerTitle.includes('final')
        const isParcial = lowerTitle.includes('parcial') || lowerTitle.includes('p1') || lowerTitle.includes('p2')

        if (isFinal && !prefs.types.includes('final')) continue
        if (isParcial && !prefs.types.includes('parcial')) continue
        if (!isFinal && !isParcial) {
            if (prefs.types.length === 0) continue
        }

        for (const days of prefs.daysBefore) {
            const fireAt = new Date(examDate)
            fireAt.setDate(fireAt.getDate() - days)
            fireAt.setHours(prefs.notifyHour ?? 9, 0, 0, 0)

            if (fireAt > now) {
                alerts.push({
                    fireAt,
                    title: ` ${days === 1 ? 'Mañana' : `En ${days} días`}: ${ev.title}`,
                    body: `El examen es el ${examDate.toLocaleDateString('es-AR', {
                        weekday: 'long', day: 'numeric', month: 'long'
                    })}`,
                })
            }
        }
    }

    return alerts
}


export function useExamNotifications(
    events: ExamEvent[],
    prefs: NotifPrefs,
) {
    const timerIds = useRef<ReturnType<typeof setTimeout>[]>([])

    const clearAll = useCallback(() => {
        timerIds.current.forEach(clearTimeout)
        timerIds.current = []
    }, [])

    const scheduleAll = useCallback(async () => {
        clearAll()
        if (!prefs.enabled) return
        if (Notification.permission !== 'granted') return

        const alerts = getUpcomingAlerts(events, prefs)
        const now = Date.now()

        for (const alert of alerts) {
            const delay = alert.fireAt.getTime() - now
            if (delay > 2_147_483_647) continue

            const id = setTimeout(() => {
                new Notification(alert.title, {
                    body: alert.body,
                    icon: '/icon-192.png',
                    badge: '/badge-72.png',
                    tag: `exam-${alert.fireAt.toISOString()}`,
                })
            }, delay)

            timerIds.current.push(id)
        }
    }, [events, prefs, clearAll])

    const requestAndSchedule = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) return false

        let perm = Notification.permission
        if (perm === 'default') {
            perm = await Notification.requestPermission()
        }
        if (perm !== 'granted') return false

        await scheduleAll()
        return true
    }, [scheduleAll])

    useEffect(() => {
        if (!prefs.enabled) { clearAll(); return }
        scheduleAll()
        return clearAll
    }, [events, prefs, scheduleAll, clearAll])

    return { requestAndSchedule }
}