import { useState, useCallback, useEffect } from 'react'
import type { Subject, SubjectStatus, CareerStats } from '../types/types'
import { supabase } from '../../supabase/Supabase'
import type { DbSubject } from '../../supabase/Supabase'

function semesterToTerm(semester: number): Subject['term'] {
  if (semester === 1) return 'Q1'
  if (semester === 2) return 'Q2'
  return 'ANNUAL'
}

function dbToSubject(row: DbSubject): Subject {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    year: row.year as Subject['year'],
    semester: row.semester as Subject['semester'],
    term: semesterToTerm(row.semester),
    status: row.status as SubjectStatus,
    corrApproved: row.corr_approved ?? [],
    corrRegular: row.corr_regular ?? [],
    finalDate: row.final_date ?? '',
    approvedDate: row.approved_date ?? '',
    notionPageId: row.notion_page_id ?? null,
    notionPageTitle: row.notion_page_title ?? null,
    notionPageUrl: row.notion_page_url ?? null,
    gradeHistory: (row as any).grade_history ?? [],
    grade: row.grade ?? null,
    notes: row.notes ?? '',
    examDates: (row.exam_dates as any[]) ?? [],
    schedules: (row as any).schedules ?? [],
    gradeP1: (row as any).grade_p1 ?? null,
    gradeP2: (row as any).grade_p2 ?? null,
    gradeFinalExam: (row as any).grade_final_exam ?? null,
    gradeOverride: (row as any).grade_override ?? null,
    finalAttempts: (row as any).final_attempts ?? 0,
    statusManual: (row as any).status_manual ?? false,
  }
}

function subjectToDb(
  s: Subject,
  userId: string,
  careerId: string | null
): Omit<DbSubject, 'created_at' | 'updated_at'> {
  return {
    id: s.id,
    user_id: userId,
    career_id: careerId,

    name: s.name,
    grade_history: (s.gradeHistory ?? []) as unknown[],
    code: s.code,
    notion_page_id: s.notionPageId ?? null,
    notion_page_title: s.notionPageTitle ?? null,
    notion_page_url: s.notionPageUrl ?? null,
    year: s.year,
    semester: s.semester,
    status: s.status,
    corr_approved: s.corrApproved,
    corr_regular: s.corrRegular,
    final_date: s.finalDate ?? '',
    approved_date: s.approvedDate ?? '',
    grade: s.grade,
    notes: s.notes ?? '',
    exam_dates: (s.examDates ?? []) as unknown[],
    schedules: (s.schedules ?? []) as unknown[],
    grade_p1: s.gradeP1 ?? null,
    grade_p2: s.gradeP2 ?? null,
    grade_final_exam: s.gradeFinalExam ?? null,
    grade_override: s.gradeOverride ?? null,
    final_attempts: s.finalAttempts ?? 0,
    status_manual: s.statusManual ?? false,
  } as any
}


function computeAvailability(
  subjects: Subject[],
  currentYear: number,
  currentSemester: number
): Subject[] {

  const approvedCodes = new Set(
    subjects.filter(s => s.status === 'approved').map(s => s.code.toLowerCase())
  )

  return subjects.map(s => {

    if (['approved', 'pending_final', 'failed_final', 'free', 'retaking'].includes(s.status))
      return s

    const corrMet = s.corrApproved.every(c => approvedCodes.has(c.toLowerCase()))
    if (!corrMet) return { ...s, status: 'locked' }

    if (s.year > currentYear) return { ...s, status: 'available' }

    if (s.year === currentYear) {
      if (s.semester === 3) {
        return { ...s, status: 'in_progress' }
      }

      if (s.semester <= currentSemester) {
        return { ...s, status: 'in_progress' }
      }

      return { ...s, status: 'available' }
    }

    if (s.year < currentYear) {
      return { ...s, status: 'available' }
    }

    return s
  })
}


export function validateStatusChange(
  target: { status: SubjectStatus; corrApproved: string[] },
  allSubjects: Subject[],
  editingId?: string
): string | null {
  const others = editingId
    ? allSubjects.filter(s => s.id !== editingId)
    : allSubjects

  const approvedCodes = new Set(
    others.filter(s => s.status === 'approved').map(s => s.code.toLowerCase())
  )

  if (['pending_final', 'approved'].includes(target.status)) {
    const unmet = target.corrApproved.filter(c => !approvedCodes.has(c.toLowerCase()))
    if (unmet.length > 0)
      return `Faltan aprobar correlativas:\n${unmet.map(c => `• ${c}`).join('\n')}`
  }
  return null
}


export interface UseSubjectsReturn {
  subjects: Subject[]
  loading: boolean
  addSubject: (data: Omit<Subject, 'id'>) => Promise<string | null>
  updateSubject: (id: string, data: Partial<Subject>) => Promise<string | null>
  deleteSubject: (id: string) => Promise<void>
  cycleStatus: (id: string) => Promise<void>
  importSubjects: (data: Subject[]) => Promise<void>
  exportSubjects: () => void
  stats: CareerStats
}

export function useSubjects(
  userId: string | null,
  careerId: string | null,
  currentYear: number,
  currentSemester: number
): UseSubjectsReturn {
  const [subjects, setSubjectsRaw] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !careerId) {
      setSubjectsRaw([])
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .eq('career_id', careerId)
      .order('year', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando materias:', error)
          setSubjectsRaw([])
        } else {
          setSubjectsRaw(
            computeAvailability(
              (data as DbSubject[]).map(dbToSubject),
              currentYear,
              currentSemester
            )
          )
        }
        setLoading(false)
      })
  }, [userId, careerId, currentYear, currentSemester])

  const compute = useCallback(
    (list: Subject[]) => computeAvailability(list, currentYear, currentSemester),
    [currentYear, currentSemester]
  )


  const addSubject = useCallback(async (data: Omit<Subject, 'id'>): Promise<string | null> => {
    if (!userId || !careerId) return 'No hay carrera activa'
    const err = validateStatusChange(data, subjects)
    if (err) return err

    const newSubject: Subject = { id: crypto.randomUUID(), ...data }
    const { data: insertedRow, error } = await supabase
      .from('subjects')
      .insert(subjectToDb(newSubject, userId, careerId))
      .select()
      .single()

    if (error) return error.message

    const subject = dbToSubject(insertedRow)

    setSubjectsRaw(prev => compute([...prev, subject]))

    return null
  }, [subjects, userId, careerId, compute])

  const updateSubject = useCallback(async (id: string, data: Partial<Subject>): Promise<string | null> => {
    if (!userId) return null
    const current = subjects.find(s => s.id === id)
    if (!current) return null

    const merged = { ...current, ...data }

    if (data.status) {
      const err = validateStatusChange(merged, subjects, id)
      if (err) return err
    }

    const { error } = await supabase
      .from('subjects')
      .update({ ...subjectToDb(merged, userId, careerId), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return error.message
    setSubjectsRaw(prev => compute(prev.map(s => s.id === id ? merged : s)))
    return null
  }, [subjects, userId, careerId, compute])

  const deleteSubject = useCallback(async (id: string): Promise<void> => {
    if (userId) await supabase.from('subjects').delete().eq('id', id).eq('user_id', userId)
    setSubjectsRaw(prev => compute(prev.filter(s => s.id !== id)))
  }, [userId, compute])

  const cycleStatus = useCallback(async (id: string): Promise<void> => {
    const s = subjects.find(x => x.id === id)
    if (!s || s.status === 'locked') return

    const CYCLE: SubjectStatus[] = ['in_progress', 'pending_final', 'approved']
    const idx = CYCLE.indexOf(s.status as any)
    const next = idx === -1 ? 'in_progress' : CYCLE[(idx + 1) % CYCLE.length]
    await updateSubject(id, { status: next })
  }, [subjects, updateSubject])

  const importSubjects = useCallback(async (data: Subject[]): Promise<void> => {
    if (userId && careerId) {
      await supabase.from('subjects').delete().eq('user_id', userId).eq('career_id', careerId)
      const rows = data.map(s => subjectToDb(s, userId, careerId))
      if (rows.length > 0) await supabase.from('subjects').insert(rows)
    }
    setSubjectsRaw(compute(data))
  }, [userId, careerId, compute])

  const exportSubjects = useCallback(() => {
    const blob = new Blob([JSON.stringify(subjects, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `correlapp_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [subjects])

  const stats: CareerStats = {
    approved: subjects.filter(s => s.status === 'approved').length,
    pending: subjects.filter(s => s.status === 'pending_final').length,
    inProgress: subjects.filter(s => ['in_progress', 'retaking'].includes(s.status)).length,
    locked: subjects.filter(s => s.status === 'locked').length,
    available: subjects.filter(s => s.status === 'available').length,
    total: subjects.length,
    progress: subjects.length
      ? Math.round((subjects.filter(s => s.status === 'approved').length / subjects.length) * 100)
      : 0,
  }
  return { subjects, loading, addSubject, updateSubject, deleteSubject, cycleStatus, importSubjects, exportSubjects, stats }
}