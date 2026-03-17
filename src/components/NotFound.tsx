import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
    const navigate = useNavigate()

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
                position: 'absolute', top: '20%', left: '50%',
                transform: 'translateX(-50%)', width: '600px', height: '400px', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '15%', right: '10%',
                width: '300px', height: '300px', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', inset: 0, backgroundSize: '40px 40px', pointerEvents: 'none',
                maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
            }} />

            <motion.div
                style={{ position: 'relative', textAlign: 'center', maxWidth: '480px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
            >
                <motion.div
                    style={{
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
                    }}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.05 }}
                >
                    <span style={{
                        position: 'absolute', inset: 0,
                        fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit',
                        WebkitTextStroke: '1.5px rgba(99,102,241,0.2)',
                        WebkitTextFillColor: 'transparent', color: 'transparent',
                    }}>404</span>
                    404
                </motion.div>

                <motion.div
                    style={{
                        width: '48px', height: '2px',
                        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
                        margin: '0 auto 24px',
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: 0.22, duration: 0.35, ease: 'easeOut' }}
                />

                <motion.h1
                    style={{
                        fontSize: '1.1rem', fontWeight: 600,
                        color: 'var(--text, #e8e8f4)',
                        margin: '0 0 10px', letterSpacing: '-0.01em',
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.25, ease: 'easeOut' }}
                >
                    Página no encontrada
                </motion.h1>

                <motion.p
                    style={{
                        fontSize: '0.82rem', color: 'var(--muted, #454560)',
                        lineHeight: 1.7, margin: '0 0 32px',
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.34, duration: 0.25, ease: 'easeOut' }}
                >
                    La ruta que buscás no existe o fue movida.<br />
                    Verificá la URL o volvé al inicio.
                </motion.p>

                <motion.div
                    style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, duration: 0.25, ease: 'easeOut' }}
                >
                    <motion.button
                        className="btn"
                        onClick={() => navigate(-1)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                    >
                        Volver
                    </motion.button>
                    <motion.button
                        className="btn btn--primary"
                        onClick={() => navigate('/')}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                    >
                        Ir al inicio
                    </motion.button>
                </motion.div>

                <motion.p
                    style={{
                        marginTop: '48px', fontSize: '0.68rem',
                        color: 'var(--muted-deep, #2a2a42)', letterSpacing: '0.04em',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                >
                    CÓDIGO DE ERROR · 404 NOT FOUND
                </motion.p>
            </motion.div>
        </div>
    )
}