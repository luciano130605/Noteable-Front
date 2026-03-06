import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../supabase/Supabase'

export interface NotionPage {
    id: string
    title: string
    url: string
    lastEdited: string
    icon: string | null
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-oauth`
export const NOTION_REDIRECT_URI = `${window.location.origin}/notion/callback`

console.log('[Notion] redirect_uri:', NOTION_REDIRECT_URI)

async function getAuthHeader(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    return `Bearer ${data.session?.access_token ?? ''}`
}

function isValidNotionUrl(url: string) {
    try {
        const u = new URL(url)

        return (
            u.protocol === 'https:' &&
            (
                u.hostname === 'notion.so' ||
                u.hostname.endsWith('.notion.so')
            )
        )
    } catch {
        return false
    }
}
export function useNotion() {
    const [connecting, setConnecting] = useState(false)
    const [searching, setSearching] = useState(false)
    const [pages, setPages] = useState<NotionPage[]>([])
    const [error, setError] = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const connectNotion = useCallback(async () => {
        setConnecting(true)
        setError(null)

        try {
            const auth = await getAuthHeader()

            // 1. Primero obtener la URL
            const res = await fetch(
                `${EDGE_URL}?action=authorize&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}`,
                { headers: { Authorization: auth } }
            )
            const data = await res.json()

            if (!data.url) {
                setError(data.error ?? 'Error conectando Notion')
                setConnecting(false)
                return
            }

            if (!isValidNotionUrl(data.url)) {
                setError('URL de autorización inválida')
                setConnecting(false)
                return
            }

            const popup = window.open(
                data.url,
                'notion-oauth',
                'width=600,height=700,noopener,noreferrer'
            )

            if (!popup) {
                setError('El navegador bloqueó el popup. Permitilo e intentá de nuevo.')
                setConnecting(false)
                return
            }

            popup.opener = null


            const handler = async (e: MessageEvent) => {
                if (e.origin !== window.location.origin) return
                if (e.data?.type !== 'notion-callback') return
                window.removeEventListener('message', handler)
                popup.close()

                const { code } = e.data
                if (!code) {
                    setError('No se recibió código de autorización')
                    setConnecting(false)
                    return
                }

                const { data: { user } } = await supabase.auth.getUser()
                const cbRes = await fetch(`${EDGE_URL}?action=callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        redirect_uri: NOTION_REDIRECT_URI,
                        user_id: user?.id,
                    }),
                })
                const cbData = await cbRes.json()
                if (cbData.error) {
                    setError(cbData.error)
                } else {
                    window.dispatchEvent(new CustomEvent('notion-connected', {
                        detail: { workspace_name: cbData.workspace_name }
                    }))
                }
                setConnecting(false)
            }

            window.addEventListener('message', handler)

            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed)
                    window.removeEventListener('message', handler)
                    setConnecting(false)
                }
            }, 1000)

        } catch {
            setError('Error de red al conectar Notion')
            setConnecting(false)
        }
    }, [])

    const disconnectNotion = useCallback(async (): Promise<string | null> => {
        const auth = await getAuthHeader()
        const res = await fetch(`${EDGE_URL}?action=disconnect`, {
            method: 'POST',
            headers: { Authorization: auth },
        })
        const data = await res.json()
        return data.error ?? null
    }, [])

    const searchPages = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            setError(null)
            try {
                const auth = await getAuthHeader()
                const res = await fetch(
                    `${EDGE_URL}?action=search&q=${encodeURIComponent(query)}`,
                    { headers: { Authorization: auth } }
                )
                const data = await res.json()
                if (data.error) { setError(data.error); setPages([]) }
                else setPages(data.pages ?? [])
            } catch {
                setError('Error buscando páginas')
            } finally {
                setSearching(false)
            }
        }, 350)
    }, [])

    const clearPages = useCallback(() => {
        setPages([])
        setError(null)
    }, [])

    return {
        connectNotion,
        disconnectNotion,
        searchPages,
        clearPages,
        connecting,
        searching,
        pages,
        error,
    }
}