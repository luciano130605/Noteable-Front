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

                if (!profile.university) {
                    const { data: { user } } = await supabase.auth.getUser()
                    const metaUniversity = user?.user_metadata?.university
                    if (metaUniversity) {
                        await supabase
                            .from('profiles')
                            .update({ university: metaUniversity })
                            .eq('id', userId)
                        profile.university = metaUniversity
                    }
                }
                return profile
            }

            const { data: { user } } = await supabase.auth.getUser()
            const meta = user?.user_metadata ?? {}

            const { data: created } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    preferences: DEFAULT_PREFERENCES,
                    full_name: meta.full_name ?? '',
                    university: meta.university ?? '',
                })
                .select()
                .single()

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