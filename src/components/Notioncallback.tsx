import { useEffect, useState } from 'react'

export default function NotionCallback() {
    const [status, setStatus] = useState<'sending' | 'success' | 'error' | 'no-opener'>('sending')
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    useEffect(() => {
        if (error) {
            setStatus('error')
            return
        }

        if (!window.opener) {
            setStatus('no-opener')
            return
        }

        try {
            window.opener.postMessage(
                { type: 'notion-callback', code, error },
                window.location.origin
            )
            setStatus('success')
            setTimeout(() => window.close(), 500)
        } catch {
            setStatus('error')
        }
    }, [])

    const messages = {
        sending: 'Conectando con Notion...',
        success: '¡Notion conectado! Cerrando...',
        error: ' Error al conectar Notion. Podés cerrar esta ventana.',
        'no-opener': ' No se pudo comunicar con la app. Cerrá esta ventana y volvé a intentarlo.',
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', flexDirection: 'column', gap: 12,
            background: '#0d0d14', color: '#888899', fontFamily: 'inherit',
            fontSize: '0.9rem',
        }}>
            <p style={{ margin: 0 }}>{messages[status]}</p>
            {(status === 'error' || status === 'no-opener') && (
                <button
                    onClick={() => window.close()}
                    style={{
                        all: 'unset', cursor: 'pointer', color: '#6366f1',
                        fontSize: '0.8rem', textDecoration: 'underline',
                    }}
                >
                    Cerrar ventana
                </button>
            )}
        </div>
    )
}