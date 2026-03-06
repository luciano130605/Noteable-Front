import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase/Supabase'


export interface CareerConfig {
    totalSubjects: number
    totalYears: number
    extraSemesters: number
    currentYear: number
    currentSemester: 1 | 2
    semesterDates: {
        s1: { start: string; end: string }
        s2: { start: string; end: string }
        annual: { start: string; end: string }
    }
}
export interface Career {
    id: string
    name: string
    config: CareerConfig
    created_at?: string
}

const DEFAULT_CAREER_CONFIG: CareerConfig = {
    totalSubjects: 0,
    totalYears: 5,
    extraSemesters: 0,
    currentYear: 1,
    currentSemester: 1,
    semesterDates: {
        s1: { start: '', end: '' },
        s2: { start: '', end: '' },
        annual: { start: '', end: '' },
    },
}


export interface UseCareersReturn {
    careers: Career[]
    activeCareer: Career | null
    loading: boolean
    addCareer: (name: string) => Promise<string | null>
    deleteCareer: (id: string) => Promise<string | null>
    updateCareerConfig: (id: string, config: CareerConfig) => Promise<string | null>
    setActiveCareer: (id: string) => Promise<void>
}

export function useCareers(userId: string | null): UseCareersReturn {
    const [careers, setCareers] = useState<Career[]>([])
    const [activeCareerId, setActiveCareerId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) {
            setCareers([])
            setActiveCareerId(null)
            setLoading(false)
            return
        }

        setLoading(true)

        Promise.all([
            supabase
                .from('careers')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true }),
            supabase
                .from('profiles')
                .select('active_career_id')
                .eq('id', userId)
                .single(),
        ]).then(([careersRes, profileRes]) => {
            if (!careersRes.error && careersRes.data) {
                setCareers(careersRes.data.map(dbToCareer))
            }
            if (!profileRes.error && profileRes.data) {
                setActiveCareerId((profileRes.data as any).active_career_id ?? null)
            }
            setLoading(false)
        })
    }, [userId])

    const activeCareer = careers.find(c => c.id === activeCareerId) ?? careers[0] ?? null

    const addCareer = useCallback(async (name: string): Promise<string | null> => {
        if (!userId) return 'No autenticado';
        const trimmed = name.trim();
        if (!trimmed) return 'El nombre no puede estar vacío';

        const { data, error } = await supabase
            .from('careers')
            .insert({ user_id: userId, name: trimmed, config: DEFAULT_CAREER_CONFIG })
            .select()
            .single();
        if (error) return error.message;

        const newCareer = dbToCareer(data);
        setCareers(prev => [...prev, newCareer]);

        if (careers.length === 0) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ active_career_id: newCareer.id })
                .eq('id', userId);

            if (profileError) return profileError.message;
            setActiveCareerId(newCareer.id);
        }

        return null;
    }, [userId, careers.length]);

    const deleteCareer = useCallback(async (id: string): Promise<string | null> => {
        if (!userId) return 'No autenticado'

        const { error } = await supabase
            .from('careers')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) return error.message

        setCareers(prev => {
            const next = prev.filter(c => c.id !== id)
            return next
        })

        if (activeCareerId === id) {
            const remaining = careers.filter(c => c.id !== id)
            const nextId = remaining[0]?.id ?? null
            setActiveCareerId(nextId)
            await supabase
                .from('profiles')
                .update({ active_career_id: nextId })
                .eq('id', userId)
        }

        return null
    }, [userId, activeCareerId, careers])

    const updateCareerConfig = useCallback(async (id: string, config: CareerConfig): Promise<string | null> => {
        if (!userId) return 'No autenticado'

        const { error } = await supabase
            .from('careers')
            .update({ config, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)

        if (error) return error.message

        setCareers(prev => prev.map(c => c.id === id ? { ...c, config } : c))
        return null
    }, [userId])

    const setActiveCareer = useCallback(async (id: string): Promise<void> => {
        setActiveCareerId(id)
        if (userId) {
            await supabase
                .from('profiles')
                .update({ active_career_id: id })
                .eq('id', userId)
        }
    }, [userId])

    return {
        careers,
        activeCareer,
        loading,
        addCareer,
        deleteCareer,
        updateCareerConfig,
        setActiveCareer,
    }
}


function dbToCareer(row: any): Career {
    return {
        id: row.id,
        name: row.name,
        config: {
            totalSubjects: row.config?.totalSubjects ?? 0,
            totalYears: row.config?.totalYears ?? 5,
            extraSemesters: row.config?.extraSemesters ?? 0,
            currentYear: row.config?.currentYear ?? 1,
            currentSemester: (row.config?.currentSemester ?? 1) as 1 | 2,
            semesterDates: row.config?.semesterDates ?? {
                s1: { start: '', end: '' },
                s2: { start: '', end: '' },
                annual: { start: '', end: '' },
            },
        },
        created_at: row.created_at,
    }
}