import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function NotFound() {
    const navigate = useNavigate()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg, #0a0a0f)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'DM Sans', sans-serif",
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
        }}>

            <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '400px',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '15%',
                right: '10%',
                width: '300px',
                height: '300px',
                pointerEvents: 'none',
            }} />

            <div style={{
                position: 'absolute',
                inset: 0,

                backgroundSize: '40px 40px',
                pointerEvents: 'none',
                maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
            }} />

            <div style={{
                position: 'relative',
                textAlign: 'center',
                maxWidth: '480px',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}>

                <div style={{
                    fontSize: 'clamp(6rem, 20vw, 10rem)',
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(129,140,248,0.08) 100%)',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                    position: 'relative',
                    userSelect: 'none',
                }}>
                    <span style={{
                        position: 'absolute',
                        inset: 0,
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        letterSpacing: 'inherit',
                        WebkitTextStroke: '1.5px rgba(99,102,241,0.2)',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                    }}>404</span>
                    404
                </div>

                <div style={{
                    width: '48px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
                    margin: '0 auto 24px',
                }} />

                <h1 style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'var(--text, #e8e8f4)',
                    margin: '0 0 10px',
                    letterSpacing: '-0.01em',
                }}>
                    Página no encontrada
                </h1>

                <p style={{
                    fontSize: '0.82rem',
                    color: 'var(--muted, #454560)',
                    lineHeight: 1.7,
                    margin: '0 0 32px',
                }}>
                    La ruta que buscás no existe o fue movida.<br />
                    Verificá la URL o volvé al inicio.
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate(-1)}
                        className='btn'
                    >
                        Volver
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className='btn btn--primary'

                    >
                        Ir al inicio
                    </button>
                </div>

                <p style={{
                    marginTop: '48px',
                    fontSize: '0.68rem',
                    color: 'var(--muted-deep, #2a2a42)',
                    letterSpacing: '0.04em',
                }}>
                    CÓDIGO DE ERROR · 404 NOT FOUND
                </p>
            </div>
        </div>
    )
}