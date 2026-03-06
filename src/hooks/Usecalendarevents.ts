import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase/Supabase'
import type { DbCalendarEvent } from '../../supabase/Supabase'
import type { CalendarEvent } from '../components/Eventmodal'

function dbToEvent(row: DbCalendarEvent): CalendarEvent {
    return {
        date: row.date,
        title: row.title,
        endDate: row.end_date || undefined,
        startTime: row.start_time || undefined,
        endTime: row.end_time || undefined,
        allDay: row.all_day,
        location: row.location || undefined,
        importance: row.importance as CalendarEvent['importance'],
        color: row.color,
        description: row.description || undefined,
        grade: (row as any).grade ?? null,
        graded: (row as any).graded ?? false,
    }
}

async function getTableColumns(): Promise<string[]> {
    try {
        const { data } = await supabase
            .from('calendar_events')
            .select('*')
            .limit(1)
        if (data && data.length > 0) return Object.keys(data[0])
        return []
    } catch { return [] }
}

let _hasGradeColumn: boolean | null = null

async function hasGradeColumn(): Promise<boolean> {
    if (_hasGradeColumn !== null) return _hasGradeColumn
    const cols = await getTableColumns()
    if (cols.length === 0) { _hasGradeColumn = true; return true }
    _hasGradeColumn = cols.includes('grade')
    return _hasGradeColumn
}

function eventToDb(event: CalendarEvent, userId: string, includeGrade = true) {
    const base = {
        user_id: userId,
        date: event.date,
        title: event.title,
        end_date: event.endDate ?? '',
        start_time: event.startTime ?? '',
        end_time: event.endTime ?? '',
        all_day: event.allDay ?? true,
        location: event.location ?? '',
        importance: event.importance ?? 'media',
        color: event.color ?? '#6366f1',
        description: event.description ?? '',
    }
    if (includeGrade) {
        return {
            ...base,
            grade: event.grade ?? null,
            graded: event.graded ?? false,
        }
    }
    return base
}

export function useCalendarEvents(userId: string | null, careerId: string | null) {
    const [userEvents, setUserEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId || !careerId) {
            setUserEvents([])
            setLoading(false)
            return
        }

        setLoading(true)
        supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', userId)
            .eq('career_id', careerId)
            .then(({ data, error }) => {
                if (!error && data) {
                    setUserEvents((data as DbCalendarEvent[]).map(dbToEvent))
                }
                setLoading(false)
            })
    }, [userId, careerId])

    const calendarEvents = [...userEvents]

    const addEvent = useCallback(async (event: CalendarEvent) => {
        if (!userId) {
            setUserEvents(prev => [...prev, event])
            return
        }

        const canUseGrade = await hasGradeColumn()
        const payload = {
            ...eventToDb(event, userId, canUseGrade),
            career_id: careerId,
        }

        const { error } = await supabase
            .from('calendar_events')
            .insert(payload)

        if (!error) {
            setUserEvents(prev => [...prev, event])
            return
        }
        console.error('[useCalendarEvents] addEvent error:', error)
    }, [userId, careerId])

    const removeEvent = useCallback(async (date: string, title: string) => {
        setUserEvents(prev => prev.filter(e => !(e.date === date && e.title === title)))

        if (userId) {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('user_id', userId)
                .eq('date', date)
                .eq('title', title)
            if (error) console.error('[useCalendarEvents] removeEvent error:', error)
        }
    }, [userId])

    const updateEvent = useCallback(async (oldEv: CalendarEvent, newEv: CalendarEvent) => {
        setUserEvents(prev =>
            prev.map(e => e.date === oldEv.date && e.title === oldEv.title ? newEv : e)
        )

        if (!userId) return

        const canUseGrade = await hasGradeColumn()
        const payload = {
            ...eventToDb(newEv, userId, canUseGrade),
            career_id: careerId,
            updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
            .from('calendar_events')
            .update(payload)
            .eq('user_id', userId)
            .eq('date', oldEv.date)
            .eq('title', oldEv.title)

        if (error) {
            console.error('[useCalendarEvents] updateEvent error:', error)
            setUserEvents(prev =>
                prev.map(e => e.date === newEv.date && e.title === newEv.title ? oldEv : e)
            )
        }
    }, [userId, careerId])

    return { calendarEvents, userEvents, loading, addEvent, removeEvent, updateEvent }
}