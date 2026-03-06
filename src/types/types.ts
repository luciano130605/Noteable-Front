import type { Icon } from 'iconsax-react'

export type SubjectStatus =
    | 'locked'
    | 'available'
    | 'in_progress'
    | 'retaking'
    | 'pending_final'
    | 'approved'
    | 'free'
    | 'failed_final'

export type FilterKey = SubjectStatus | 'all'

export interface GradeHistoryEntry {
    year: number
    semester: number
    gradeP1: number | null
    gradeP2: number | null
    gradeFinalExam: number | null
    gradeOverride: number | null
    grade: number | null
}

export interface ExamDate {
    date: string
    type: 'parcial' | 'final' | string
    notes?: string
}

export interface ClassSchedule {
    id: string
    day: 'lun' | 'mar' | 'mié' | 'jue' | 'vie' | 'sáb'
    timeFrom: string
    timeTo: string
    location: string
}

export interface SubjectSettings {
    finalAttempts: number
    freeExamMinGrade: number
    roundingMode: 'round' | 'floor'
    parcialCount: 1 | 2 | 3
}

export interface Subject {
    id: string
    name: string
    code: string
    year: number
    term: 'Q1' | 'Q2' | 'ANNUAL'
    status: SubjectStatus
    gradeP3?: number | null
    subjectSettings?: SubjectSettings
    corrApproved: string[]
    schedules?: ClassSchedule[]
    corrRegular: string[]
    statusManual?: boolean
    finalDate: string
    semester: 1 | 2 | 3
    approvedDate: string
    grade: number | null
    notes: string
    examDates: ExamDate[]
    gradeP1?: number | null
    gradeP2?: number | null
    gradeFinalExam?: number | null
    gradeOverride?: number | null
    finalAttempts?: number
    notionPageId?: string | null
    notionPageTitle?: string | null
    notionPageUrl?: string | null
    gradeHistory?: GradeHistoryEntry[]
}

export interface StatusConfig {
    label: string
    color: string
    bg: string
    borderColor: string
    icon?: typeof Icon
}

export interface FilterOption {
    key: FilterKey
    label: string
    color: string
}

export interface CareerStats {
    approved: number
    pending: number
    inProgress: number
    locked: number
    available: number
    total: number
    progress: number
}