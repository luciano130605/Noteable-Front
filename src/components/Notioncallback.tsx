
export default function NotionCallback() {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (window.opener) {
        window.opener.postMessage(
            { type: 'notion-callback', code, error },
            window.location.origin
        )
        window.close()
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', flexDirection: 'column', gap: 12,
            background: '#0d0d14', color: '#888899', fontFamily: 'inherit',
        }}>
            {error ? (
                <>
                    <p>Error al conectar Notion. Podés cerrar esta ventana.</p>
                </>
            ) : (
                <>
                    <p>¡Notion conectado! Cerrando...</p>
                </>
            )}
        </div>
    )
}