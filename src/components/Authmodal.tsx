import { useState, useRef, useEffect } from 'react'
import './AuthModal.css'
import { Danger, Eye, EyeSlash, Link2, Location } from 'iconsax-react'
import { CheckCircle, Mail, X, Loader } from 'lucide-react'

interface UniversityResult {
    display_name: string
    place_id: number
    lat: string
    lon: string
}

interface Props {
    onClose: () => void
    initialMode?: 'login' | 'register'
    onSignIn: (email: string, password: string) => Promise<string | null>
    onSignUp: (
        email: string,
        password: string,
        metadata?: {
            full_name?: string
            university?: string
            university_lat?: number | null
            university_lon?: number | null
        }
    ) => Promise<string | null>
    onSignInWithMagicLink: (email: string) => Promise<string | null>
    onSignInWithOAuth: (provider: 'github' | 'discord' | 'google') => Promise<string | null>
}

async function searchUniversities(query: string): Promise<UniversityResult[]> {
    if (query.length < 3) return []
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0&countrycodes=ar`,
            { headers: { 'Accept-Language': 'es', 'User-Agent': 'CorrelApp/1.0' } }
        )
        return await res.json()
    } catch { return [] }
}

function cleanUniversityName(displayName: string): string {
    return displayName.split(',')[0].trim()
}

export default function AuthModal({ onClose, initialMode = 'login', onSignIn, onSignUp, onSignInWithMagicLink, onSignInWithOAuth }: Props) {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const [universityInput, setUniversityInput] = useState('')
    const [universitySelected, setUniversitySelected] = useState('')
    const [universityLat, setUniversityLat] = useState<number | null>(null)
    const [universityLon, setUniversityLon] = useState<number | null>(null)
    const [uniResults, setUniResults] = useState<UniversityResult[]>([])
    const [uniLoading, setUniLoading] = useState(false)
    const [uniOpen, setUniOpen] = useState(false)
    const uniDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const uniRef = useRef<HTMLDivElement>(null)

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const [magicLoading, setMagicLoading] = useState(false)
    const [magicSent, setMagicSent] = useState(false)

    const emailRef = useRef<HTMLInputElement>(null)

    useEffect(() => { emailRef.current?.focus() }, [mode])
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [onClose])

    useEffect(() => {
        if (!uniOpen) return
        const h = (e: MouseEvent) => {
            if (uniRef.current && !uniRef.current.contains(e.target as Node)) setUniOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [uniOpen])

    const handleUniInput = (val: string) => {
        setUniversityInput(val)
        setUniversitySelected('')
        setUniversityLat(null)
        setUniversityLon(null)
        setUniOpen(true)
        if (uniDebounce.current) clearTimeout(uniDebounce.current)
        if (val.length < 3) { setUniResults([]); return }
        setUniLoading(true)
        uniDebounce.current = setTimeout(async () => {
            const results = await searchUniversities(val)
            setUniResults(results)
            setUniLoading(false)
        }, 400)
    }

    const selectUniversity = (r: UniversityResult) => {
        const name = cleanUniversityName(r.display_name)
        setUniversityInput(name)
        setUniversitySelected(name)
        setUniversityLat(parseFloat(r.lat))
        setUniversityLon(parseFloat(r.lon))
        setUniResults([])
        setUniOpen(false)
    }

    const clearUniversity = () => {
        setUniversityInput('')
        setUniversitySelected('')
        setUniversityLat(null)
        setUniversityLon(null)
        setUniResults([])
        setUniOpen(false)
    }

    const handleOAuth = async (provider: 'github' | 'discord' | 'google') => {
        setError(null)
        const err = await onSignInWithOAuth(provider)
        if (err) setError(err)
    }

    const handleSubmit = async () => {
        setError(null); setSuccess(null)
        if (!email.trim() || !password) { setError('Completá email y contraseña.'); return }
        if (mode === 'register') {
            if (!fullName.trim()) { setError('Ingresá tu nombre completo.'); return }
            if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
            if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
        }
        setLoading(true)
        try {
            let err: string | null = null
            if (mode === 'login') {
                err = await onSignIn(email.trim(), password)
            } else {
                err = await onSignUp(email.trim(), password, {
                    full_name: fullName.trim(),
                    university: universitySelected || universityInput.trim(),
                    university_lat: universityLat,
                    university_lon: universityLon,
                })
            }
            if (err) {
                const translations: Record<string, string> = {
                    'Invalid login credentials': 'Email o contraseña incorrectos.',
                    'Email not confirmed': 'Confirmá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.',
                    'User already registered': 'Ya existe una cuenta con ese email.',
                    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
                    'signup_disabled': 'El registro está deshabilitado temporalmente.',
                }
                setError(translations[err] ?? err)
            } else if (mode === 'register') {
                setSuccess('¡Cuenta creada! Te enviamos un email de confirmación. Revisá tu bandeja de entrada (y spam).')
            } else {
                onClose()
            }
        } finally {
            setLoading(false)
        }
    }

    const handleMagicLink = async () => {
        setError(null)
        if (!email.trim()) { setError('Ingresá tu email primero.'); return }
        setMagicLoading(true)
        const err = await onSignInWithMagicLink(email.trim())
        setMagicLoading(false)
        if (err) {
            const translations: Record<string, string> = {
                'Signups not allowed for otp': 'No existe una cuenta con ese email. Registrate primero.',
                'Email rate limit exceeded': 'Demasiados intentos. Esperá unos minutos.',
            }
            setError(translations[err] ?? err)
        } else {
            setMagicSent(true)
        }
    }

    const switchMode = (m: 'login' | 'register') => {
        setMode(m); setError(null); setSuccess(null); setMagicSent(false)
    }

    return (
        <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="auth-modal">

                <div className="auth-modal__header">
                    <button className="auth-modal__close" onClick={onClose} style={{ position: 'relative', bottom: '10px' }}><X size={16} /></button>
                    <h2 className="auth-modal__title">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
                    <p className="auth-modal__sub">
                        {mode === 'login'
                            ? 'Accedé a tus materias desde cualquier dispositivo'
                            : 'Guardá tu progreso académico en la nube'}
                    </p>
                </div>

                <div className="auth-modal__body">
                    <div className="auth-modal__tabs">
                        <button className={`auth-modal__tab${mode === 'login' ? ' active' : ''}`} onClick={() => switchMode('login')}>Iniciar sesión</button>
                        <button className={`auth-modal__tab${mode === 'register' ? ' active' : ''}`} onClick={() => switchMode('register')}>Crear cuenta</button>
                    </div>

                    <div className="auth-modal__fields">
                        {mode === 'register' && (
                            <div className="auth-modal__field">
                                <label className="auth-modal__label">Nombre completo</label>
                                <input type="text" className="auth-modal__input" value={fullName}
                                    onChange={e => setFullName(e.target.value)} placeholder="Juan García" autoComplete="name" />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="auth-modal__field" ref={uniRef}>
                                <label className="auth-modal__label">
                                    Universidad / Facultad <span className="auth-modal__optional">(opcional)</span>
                                </label>

                                <div className="evm-location-autocomplete">
                                    <div className={`evm-location-field${universitySelected ? ' evm-location-field--valid' : universityInput.length > 0 ? ' evm-location-field--typing' : ''}`}>
                                        <Location size={13} color={universitySelected ? '#10b981' : 'var(--muted, #888)'} />
                                        <input
                                            type="text"
                                            className="evm-location-bare-input"
                                            value={universityInput}
                                            onChange={e => handleUniInput(e.target.value)}
                                            onFocus={() => universityInput.length >= 3 && !universitySelected && setUniOpen(true)}
                                            placeholder="Buscá tu universidad..."
                                            autoComplete="off"
                                        />
                                        {uniLoading && <Loader size={13} color="var(--muted)" className="evm-loc-spin" />}
                                        {universitySelected && (
                                            <span className="evm-loc-check" title="Universidad verificada"><CheckCircle size={12} color='currentColor' style={{ position: "relative", top: "2" }} /></span>
                                        )}
                                        {universityInput && (
                                            <button type="button" className="evm-loc-clear" onClick={clearUniversity}>
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {uniOpen && (uniLoading || uniResults.length > 0 || universityInput.length >= 3) && (
                                        <div className="evm-loc-dropdown">
                                            {uniLoading && (
                                                <div className="evm-loc-loading">Buscando...</div>
                                            )}
                                            {!uniLoading && uniResults.length === 0 && universityInput.length >= 3 && (
                                                <div className="evm-loc-empty">
                                                    Sin resultados. Podés escribirla manualmente.
                                                </div>
                                            )}
                                            {uniResults.map(r => (
                                                <button
                                                    key={r.place_id}
                                                    type="button"
                                                    className="evm-loc-item"
                                                    onClick={() => selectUniversity(r)}
                                                >
                                                    <span className="evm-loc-item-name">{cleanUniversityName(r.display_name)}</span>
                                                    <span className="evm-loc-item-full">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                                                </button>
                                            ))}
                                            {!uniLoading && universityInput.length >= 3 && (
                                                <button
                                                    type="button"
                                                    className="evm-loc-item evm-loc-item--manual"
                                                    onClick={() => {
                                                        setUniversitySelected(universityInput)
                                                        setUniversityLat(null)
                                                        setUniversityLon(null)
                                                        setUniOpen(false)
                                                    }}
                                                >
                                                    <span className="evm-loc-item-name">Usar "{universityInput}"</span>
                                                    <span className="evm-loc-item-full">Sin ubicación exacta en el mapa</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {universitySelected && universityLat && (
                                        <p className="evm-loc-hint evm-loc-hint--ok">
                                            Ubicación exacta guardada · se usará en el mapa
                                        </p>
                                    )}
                                    {universitySelected && !universityLat && (
                                        <p className="evm-loc-hint evm-loc-hint--warn">
                                            <Danger size={12} color='currentColor' /> Sin ubicación exacta — podés buscarla en el mapa más adelante
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="auth-modal__field">
                            <label className="auth-modal__label">Email</label>
                            <input ref={emailRef} type="email" className="auth-modal__input" value={email}
                                onChange={e => { setEmail(e.target.value); setMagicSent(false) }}
                                placeholder="tu@email.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoComplete="email" />
                        </div>

                        <div className="auth-modal__field auth-modal__password">
                            <label className="auth-modal__label">Contraseña</label>
                            <div className="auth-modal__password-wrap">
                                <input type={showPassword ? 'text' : 'password'} className="auth-modal__input"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                                <button type="button" className="auth-modal__toggle" onClick={() => setShowPassword(v => !v)}>
                                    {showPassword ? <EyeSlash size={14} color='currentColor' /> : <Eye size={14} color='currentColor' />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div className="auth-modal__field auth-modal__password">
                                <label className="auth-modal__label">Confirmar contraseña</label>
                                <div className="auth-modal__password-wrap">
                                    <input type={showConfirm ? 'text' : 'password'} className="auth-modal__input"
                                        value={confirm} onChange={e => setConfirm(e.target.value)}
                                        placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoComplete="new-password" />
                                    <button type="button" className="auth-modal__toggle" onClick={() => setShowConfirm(v => !v)}>
                                        {showConfirm ? <EyeSlash size={14} color='currentColor' /> : <Eye size={14} color='currentColor' />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="auth-modal__error"><span><Danger size={12} color='currentColor' /></span> {error}</div>}
                    {success && <div className="auth-modal__success"><span><CheckCircle size={12} color='#10b981' /></span> {success}</div>}

                    <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                    </button>

                    {mode === 'login' && (
                        <>
                            <div className="auth-modal__divider"><span> o </span></div>
                            <div className="auth-modal__social">
                                <button className="auth-modal__social-btn auth-modal__social-btn--github" onClick={() => handleOAuth('github')} type="button">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                    </svg>
                                    GitHub
                                </button>
                                <button className="auth-modal__social-btn auth-modal__social-btn--discord" onClick={() => handleOAuth('discord')} type="button">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.004.028.019.056.04.073a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .041-.074c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                    Discord
                                </button>
                            </div>

                            {magicSent ? (
                                <div className="auth-modal__magic-sent">
                                    <Mail size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                                    <div>
                                        <strong>¡Link enviado!</strong>
                                        <p>Revisá el email <strong>{email}</strong> y hacé clic en el link para entrar. No necesitás contraseña.</p>
                                    </div>
                                </div>
                            ) : (
                                <button className="auth-modal__magic-btn" onClick={handleMagicLink} disabled={magicLoading}>
                                    <Link2 size={18} color="currentColor" />
                                    {magicLoading ? 'Enviando link...' : 'Entrar sin contraseña'}
                                </button>
                            )}
                        </>
                    )}

                    {mode === 'register' && !success && (
                        <p className="auth-modal__confirm-note">
                            <Mail size={16} color="currentColor" style={{ position: 'relative', top: '2' }} /> Te enviaremos un email de confirmación. Sin confirmarlo no podrás iniciar sesión.
                        </p>
                    )}

                    <p className="auth-modal__note">
                        {mode === 'login'
                            ? <><button className="auth-modal__link" onClick={() => switchMode('register')}>Registrate gratis</button> si no tenés cuenta</>
                            : <>¿Ya tenés cuenta? <button className="auth-modal__link" onClick={() => switchMode('login')}>Iniciá sesión</button></>
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}