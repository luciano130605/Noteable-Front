import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
})


export interface NotificationPreferences {
    enabled: boolean
    daysBefore: number[]
    types: ('final' | 'parcial')[]
    notifyHour: number
}

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type Theme = 'dark' | 'light' | 'system'

export interface UserPreferences {
    notifications: NotificationPreferences
    dateFormat: DateFormat
    classReminder: boolean
    theme: Theme
    showLocked: boolean
    visibleFilters?: string[]
    promotionThreshold: number
    regularThreshold: number
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    notifications: {
        enabled: false,
        daysBefore: [1, 3],
        types: ['final', 'parcial'],
        notifyHour: 9,
    },
    dateFormat: 'DD/MM/YYYY',
    theme: 'dark',
    showLocked: true,
    classReminder: false,
    visibleFilters: ['all', 'approved', 'pending_final', 'in_progress', 'available', 'locked', 'retaking', 'failed_final', 'free'],
    promotionThreshold: 7,
    regularThreshold: 4,
}

export function formatDate(dateStr: string, format: DateFormat = 'DD/MM/YYYY'): string {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    switch (format) {
        case 'DD/MM/YYYY': return `${day}/${month}/${year}`
        case 'MM/DD/YYYY': return `${month}/${day}/${year}`
        case 'YYYY-MM-DD': return `${year}-${month}-${day}`
    }
}


export interface DbSubject {
    id: string
    schedules?: unknown[]
    zoom_link: string | null
    aula_virtual_link: string | null
    user_id: string
    career_id: string | null
    name: string
    code: string
    notion_page_id: string | null
    notion_page_title: string | null
    notion_page_url: string | null
    year: number
    semester: number
    status: string
    corr_approved: string[]
    corr_regular: string[]
    final_date: string
    approved_date: string
    grade: number | null
    notes: string
    exam_dates: unknown[]
    created_at: string
    updated_at: string
}

export interface DbProfile {
    id: string
    full_name: string
    university: string
    university_lat: number | null
    university_lon: number | null
    career_name: string
    career_config: {
        totalSubjects: number
        totalYears: number
        extraSemesters: number
        currentYear: number
    }
    active_career_id: string | null
    notion_token: string | null
    notion_workspace_name: string | null
    onboarding_done: boolean
    preferences: UserPreferences
    created_at: string
    updated_at: string
}

export interface DbCareer {
    id: string
    user_id: string
    name: string
    config: {
        totalSubjects: number
        totalYears: number
        extraSemesters: number
        currentYear: number
    }
    created_at: string
    updated_at: string
}

export interface DbCalendarEvent {
    id: string
    user_id: string
    date: string
    title: string
    end_date: string
    start_time: string
    end_time: string
    all_day: boolean
    location: string
    importance: string
    career_id: string | null
    color: string
    description: string
    created_at: string
    updated_at: string
}