import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, DEFAULT_PREFERENCES } from '../../supabase/Supabase'
import type { DbProfile, UserPreferences } from '../../supabase/Supabase'

export interface AuthState {
    user: User | null
    session: Session | null
    profile: DbProfile | null
    loading: boolean
}

const clearClientSession = () => {
    Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k))
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        profile: null,
        loading: true,
    })


    const loadProfile = useCallback(async (userId: string) => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            const meta = authUser?.user_metadata ?? {}

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (data) {
                const profile = data as DbProfile

                if (!profile.preferences) {
                    profile.preferences = DEFAULT_PREFERENCES
                }

                const profileUpdates: Record<string, unknown> = {}
                if (!profile.university && meta.university) {
                    profileUpdates.university = meta.university
                    profile.university = meta.university
                }
                if (!profile.full_name && meta.full_name) {
                    profileUpdates.full_name = meta.full_name
                    profile.full_name = meta.full_name
                }
                if (Object.keys(profileUpdates).length > 0) {
                    await supabase.from('profiles').update(profileUpdates).eq('id', userId)
                }

                if (meta.career_name?.trim()) {
                    const { data: existingCareers } = await supabase
                        .from('careers')
                        .select('id')
                        .eq('user_id', userId)
                        .limit(1)

                    if (!existingCareers || existingCareers.length === 0) {
                        const careerConfig = {
                            totalSubjects: meta.career_total_subjects ?? 0,
                            totalYears: meta.career_total_years ?? 5,
                            extraSemesters: 0,
                            currentYear: meta.career_current_year ?? 1,
                            currentSemester: meta.career_current_semester ?? 1,
                            semesterDates: {
                                s1: { start: '', end: '' },
                                s2: { start: '', end: '' },
                                annual: { start: '', end: '' },
                            },
                        }
                        const { data: newCareer } = await supabase
                            .from('careers')
                            .insert({ user_id: userId, name: meta.career_name.trim(), config: careerConfig })
                            .select()
                            .single()

                        if (newCareer) {
                            await supabase
                                .from('profiles')
                                .update({ active_career_id: newCareer.id })
                                .eq('id', userId)
                            profile.active_career_id = newCareer.id
                        }
                    }
                }

                return profile
            }

            const { data: created } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    preferences: DEFAULT_PREFERENCES,
                    full_name: meta.full_name ?? '',
                    university: meta.university ?? '',
                    university_lat: meta.university_lat ?? null,
                    university_lon: meta.university_lon ?? null,
                })
                .select()
                .single()

            if (meta.career_name?.trim() && created) {
                const careerConfig = {
                    totalSubjects: meta.career_total_subjects ?? 0,
                    totalYears: meta.career_total_years ?? 5,
                    extraSemesters: 0,
                    currentYear: meta.career_current_year ?? 1,
                    currentSemester: meta.career_current_semester ?? 1,
                    semesterDates: {
                        s1: { start: '', end: '' },
                        s2: { start: '', end: '' },
                        annual: { start: '', end: '' },
                    },
                }
                const { data: newCareer } = await supabase
                    .from('careers')
                    .insert({ user_id: userId, name: meta.career_name.trim(), config: careerConfig })
                    .select()
                    .single()

                if (newCareer) {
                    await supabase.from('profiles').update({ active_career_id: newCareer.id }).eq('id', userId)
                        ; (created as any).active_career_id = newCareer.id
                }
            }

            return created ?? null

        } catch (e) {
            console.error('[Auth] loadProfile:', e)
            return null
        }
    }, [])


    useEffect(() => {
        let mounted = true

        const setEmpty = () => {
            if (!mounted) return
            setState({
                user: null,
                session: null,
                profile: null,
                loading: false,
            })
        }

        const setFull = async (session: Session) => {
            const profile = await loadProfile(session.user.id)

            if (!mounted) return

            setState({
                user: session.user,
                session,
                profile,
                loading: false,
            })
        }

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return

            if (data.session) {
                setFull(data.session)
            } else {
                setEmpty()
            }
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {

            if (!mounted) return

            if (session) {
                setFull(session)
            } else {
                setEmpty()
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }

    }, [loadProfile])



    const signUp = async (email: string, password: string, metadata?: any) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata ?? {} },
        })
        return error?.message ?? null
    }

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error?.message ?? null
    }

    const signInWithMagicLink = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email })
        return error?.message ?? null
    }

    const signInWithOAuth = async (provider: 'github' | 'discord' | 'google') => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.origin,
            },
        })

        return error?.message ?? null
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        clearClientSession()

        setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
        })
    }

    const updateProfile = async (updates: Partial<DbProfile>) => {
        if (!state.user) return 'No autenticado'

        const { error } = await supabase
            .from('profiles')
            .update({ ...updates })
            .eq('id', state.user.id)

        if (error) return error.message

        setState(p => ({
            ...p,
            profile: p.profile ? { ...p.profile, ...updates } : p.profile,
        }))

        return null
    }

    const deleteAccount = async (): Promise<string | null> => {
        if (!state.user) return "No autenticado"

        const { error } = await supabase.rpc("delete_user")

        if (error) return error.message

        await supabase.auth.signOut()
        return null
    }

    const updatePreferences = async (preferences: UserPreferences) => {
        if (!state.user) return 'No autenticado'

        const { error } = await supabase
            .from('profiles')
            .update({ preferences })
            .eq('id', state.user.id)

        if (error) return error.message

        setState(p => ({
            ...p,
            profile: p.profile
                ? { ...p.profile, preferences }
                : p.profile,
        }))

        return null
    }

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        return error?.message ?? null
    }

    return {
        ...state,

        signUp,
        signIn,
        signInWithMagicLink,
        signInWithOAuth,
        signOut,
        deleteAccount,
        updateProfile,
        updatePreferences,
        updatePassword,
    }
}