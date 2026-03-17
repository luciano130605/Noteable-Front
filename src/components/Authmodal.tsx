import { useState, useRef, useEffect, useCallback } from 'react'
import './Authmodal.css'
import { Danger, Eye, EyeSlash, Link2, Location } from 'iconsax-react'
import { CheckCircle, Mail, X, Loader, Check } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

interface UniversityResult {
    display_name: string
    place_id: number
    lat: string
    lon: string
}

interface Props {
    onClose: () => void
    onResetPassword: (email: string) => Promise<string | null>
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
            career_name?: string
            career_total_years?: number
            career_total_subjects?: number
            career_current_year?: number
            career_current_semester?: number
        }
    ) => Promise<string | null>
    onSignInWithMagicLink: (email: string) => Promise<string | null>
    onSignInWithOAuth: (provider: 'github' | 'discord' | 'google') => Promise<string | null>
}

const isMobile = window.innerWidth <= 768


const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring' as const, damping: 26, stiffness: 280 }
    },
    exit: {
        opacity: 0, scale: 0.96, y: 12,
        transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] as const }
    },
}

const modalDesktopVariants: Variants = {
    hidden: { opacity: 1, scale: 1, y: 0 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
}

const stepVariants: Variants = {
    hidden: { opacity: 0, x: 18 },
    visible: {
        opacity: 1, x: 0,
        transition: { duration: 0.2, ease: 'easeOut' as const }
    },
    exit: {
        opacity: 0, x: -18,
        transition: { duration: 0.14 }
    },
}

const stepDesktopVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.12 } },
    exit: { opacity: 0, transition: { duration: 0.08 } },
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

const LOGIN_ERRORS: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos.',
    'Email not confirmed': 'Confirmá tu email antes de iniciar sesión.',
    'User already registered': 'Ya existe una cuenta con ese email.',
}
const SIGNUP_ERRORS: Record<string, string> = {
    'User already registered': 'Ya existe una cuenta con ese email.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'signup_disabled': 'El registro está deshabilitado temporalmente.',
}
const RESET_ERRORS: Record<string, string> = {
    'Email rate limit exceeded': 'Demasiados intentos. Esperá unos minutos.',
    'User not found': 'No existe una cuenta con ese email.',
}
const MAGIC_ERRORS: Record<string, string> = {
    'Signups not allowed for otp': 'No existe una cuenta con ese email.',
    'Email rate limit exceeded': 'Demasiados intentos. Esperá unos minutos.',
}

export default function AuthModal({ onClose, onResetPassword, initialMode = 'login', onSignIn, onSignUp, onSignInWithMagicLink, onSignInWithOAuth }: Props) {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode)
    const [registerStep, setRegisterStep] = useState<1 | 2>(1)
    const [isClosing, setIsClosing] = useState(false)
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

    const [careerName, setCareerName] = useState('')
    const [totalYears, setTotalYears] = useState<number>(5)
    const [totalSubjects, setTotalSubjects] = useState<string>('')
    const [currentYear, setCurrentYear] = useState<number>(1)
    const [currentSemester, setCurrentSemester] = useState<1 | 2>(1)
    const [resetLoading, setResetLoading] = useState(false)
    const [resetSent, setResetSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [magicLoading, setMagicLoading] = useState(false)
    const [magicSent, setMagicSent] = useState(false)

    const emailRef = useRef<HTMLInputElement>(null)

    const handleClose = useCallback(() => setIsClosing(true), [])

    useEffect(() => { if (mode === 'login') emailRef.current?.focus() }, [mode])

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

    const handleUniInput = useCallback((val: string) => {
        setUniversityInput(val); setUniversitySelected(''); setUniversityLat(null); setUniversityLon(null); setUniOpen(true)
        if (uniDebounce.current) clearTimeout(uniDebounce.current)
        if (val.length < 3) { setUniResults([]); return }
        setUniLoading(true)
        uniDebounce.current = setTimeout(async () => {
            const results = await searchUniversities(val)
            setUniResults(results); setUniLoading(false)
        }, 400)
    }, [])

    const selectUniversity = useCallback((r: UniversityResult) => {
        const name = cleanUniversityName(r.display_name)
        setUniversityInput(name); setUniversitySelected(name)
        setUniversityLat(parseFloat(r.lat)); setUniversityLon(parseFloat(r.lon))
        setUniResults([]); setUniOpen(false)
    }, [])

    const clearUniversity = useCallback(() => {
        setUniversityInput(''); setUniversitySelected('')
        setUniversityLat(null); setUniversityLon(null)
        setUniResults([]); setUniOpen(false)
    }, [])

    const handleOAuth = useCallback(async (provider: 'github' | 'discord' | 'google') => {
        setError(null)
        const err = await onSignInWithOAuth(provider)
        if (err) setError(err)
    }, [onSignInWithOAuth])

    const handleNextStep = useCallback(() => {
        setError(null)
        if (!fullName.trim()) { setError('Ingresá tu nombre completo.'); return }
        if (!email.trim()) { setError('Ingresá tu email.'); return }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
        setRegisterStep(2)
    }, [fullName, email, password, confirm])

    const handleResetPassword = useCallback(async () => {
        setError(null)
        if (!email.trim()) { setError('Ingresá tu email primero.'); return }
        setResetLoading(true)
        const err = await onResetPassword(email.trim())
        setResetLoading(false)
        if (err) setError(RESET_ERRORS[err] ?? err)
        else setResetSent(true)
    }, [email, onResetPassword])

    const handleSubmit = useCallback(async () => {
        setError(null); setSuccess(null)
        if (mode === 'login') {
            if (!email.trim() || !password) { setError('Completá email y contraseña.'); return }
            setLoading(true)
            try {
                const err = await onSignIn(email.trim(), password)
                if (err) setError(LOGIN_ERRORS[err] ?? err)
                else onClose()
            } finally { setLoading(false) }
            return
        }
        setLoading(true)
        try {
            const err = await onSignUp(email.trim(), password, {
                full_name: fullName.trim(),
                university: universitySelected || universityInput.trim(),
                university_lat: universityLat,
                university_lon: universityLon,
                career_name: careerName.trim(),
                career_total_years: totalYears,
                career_total_subjects: parseInt(totalSubjects, 10) || 0,
                career_current_year: currentYear,
                career_current_semester: currentSemester,
            })
            if (err) {
                setError(SIGNUP_ERRORS[err] ?? err)
                setRegisterStep(1)
            } else {
                setSuccess('¡Cuenta creada! Revisá tu email para confirmar.')
            }
        } finally { setLoading(false) }
    }, [mode, email, password, fullName, universitySelected, universityInput, universityLat, universityLon, careerName, totalYears, totalSubjects, currentYear, currentSemester, onSignIn, onSignUp, onClose])

    const handleMagicLink = useCallback(async () => {
        setError(null)
        if (!email.trim()) { setError('Ingresá tu email primero.'); return }
        setMagicLoading(true)
        const err = await onSignInWithMagicLink(email.trim())
        setMagicLoading(false)
        if (err) setError(MAGIC_ERRORS[err] ?? err)
        else setMagicSent(true)
    }, [email, onSignInWithMagicLink])

    const switchMode = useCallback((m: 'login' | 'register') => {
        setMode(m); setError(null); setSuccess(null); setMagicSent(false); setRegisterStep(1)
    }, [])

    const isRegister = mode === 'register'

    return (
        <AnimatePresence onExitComplete={onClose}>
            {!isClosing && (
                <motion.div
                    className="auth-overlay"
                    variants={isMobile ? overlayVariants : undefined}
                    initial={isMobile ? "hidden" : false}
                    animate={isMobile ? "visible" : undefined}
                    exit={isMobile ? "exit" : undefined}
                    transition={{ duration: 0.2 }}
                    onClick={e => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        className="auth-modal"
                        variants={isMobile ? modalVariants : modalDesktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="auth-modal__header">
                            <motion.button
                                className="auth-modal__close"
                                onClick={handleClose}
                                whileHover={isMobile ? { scale: 1.1 } : undefined}
                                whileTap={isMobile ? { scale: 0.9 } : undefined}
                            >
                                <X size={16} />
                            </motion.button>
                            <h2 className="auth-modal__title">
                                {mode === 'login' ? 'Iniciar sesión' : registerStep === 1 ? 'Crear cuenta' : 'Tu carrera'}
                            </h2>
                            <p className="auth-modal__sub">
                                {mode === 'login'
                                    ? 'Accedé a tus materias desde cualquier dispositivo'
                                    : registerStep === 1
                                        ? 'Datos personales y acceso'
                                        : 'Opcional · podés completarlo después'}
                            </p>

                            {isRegister && !success && (
                                <div className="auth-modal__stepper">
                                    <div className={`auth-modal__step${registerStep === 1 ? ' active' : ' done'}`}>
                                        <span className="auth-modal__step-dot">{registerStep > 1 ? <Check color='currentColor' size={12} /> : '1'}</span>
                                        <span>Datos</span>
                                    </div>
                                    <div className="auth-modal__step-line" />
                                    <div className={`auth-modal__step${registerStep === 2 ? ' active' : ''}`}>
                                        <span className="auth-modal__step-dot">2</span>
                                        <span>Carrera</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="auth-modal__body">
                            <div className="auth-modal__tabs">
                                <button className={`auth-modal__tab${mode === 'login' ? ' active' : ''}`} onClick={() => switchMode('login')}>Iniciar sesión</button>
                                <button className={`auth-modal__tab${mode === 'register' ? ' active' : ''}`} onClick={() => switchMode('register')}>Crear cuenta</button>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={success ? 'success' : `${mode}-${registerStep}`}
                                    variants={isMobile ? stepVariants : stepDesktopVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    {success ? (
                                        <div className="auth-modal__success-full">
                                            <div className="auth-modal__success-title">¡Cuenta creada!</div>
                                            <p className="auth-modal__success-text">Te enviamos un email de confirmación. Revisá tu bandeja de entrada (y spam).</p>
                                        </div>
                                    ) : isRegister && registerStep === 1 ? (
                                        <div className="auth-modal__fields">
                                            <div className="auth-modal__field">
                                                <label className="auth-modal__label">Nombre completo</label>
                                                <input type="text" className="auth-modal__input" value={fullName}
                                                    onChange={e => setFullName(e.target.value)} placeholder="Juan García" autoComplete="name" />
                                            </div>
                                            <div className="auth-modal__field">
                                                <label className="auth-modal__label">Email</label>
                                                <input ref={emailRef} type="email" className="auth-modal__input" value={email}
                                                    onChange={e => { setEmail(e.target.value); setMagicSent(false) }}
                                                    placeholder="tu@email.com" autoComplete="email" />
                                            </div>
                                            <div className="auth-modal__field">
                                                <label className="auth-modal__label">Contraseña</label>
                                                <div className="auth-modal__password-wrap">
                                                    <input type={showPassword ? 'text' : 'password'} className="auth-modal__input"
                                                        value={password} onChange={e => setPassword(e.target.value)}
                                                        placeholder="••••••••" autoComplete="new-password" />
                                                    <button type="button" className="auth-modal__toggle" onClick={() => setShowPassword(v => !v)}>
                                                        {showPassword ? <EyeSlash size={14} color='currentColor' /> : <Eye size={14} color='currentColor' />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="auth-modal__field">
                                                <label className="auth-modal__label">Confirmar contraseña</label>
                                                <div className="auth-modal__password-wrap">
                                                    <input type={showConfirm ? 'text' : 'password'} className="auth-modal__input"
                                                        value={confirm} onChange={e => setConfirm(e.target.value)}
                                                        placeholder="••••••••" autoComplete="new-password"
                                                        onKeyDown={e => e.key === 'Enter' && handleNextStep()} />
                                                    <button type="button" className="auth-modal__toggle" onClick={() => setShowConfirm(v => !v)}>
                                                        {showConfirm ? <EyeSlash size={14} color='currentColor' /> : <Eye size={14} color='currentColor' />}
                                                    </button>
                                                </div>
                                            </div>

                                            {error && <div className="auth-modal__error"><Danger size={12} color='currentColor' /> {error}</div>}

                                            <button className="auth-modal__submit" onClick={handleNextStep}>
                                                Siguiente
                                            </button>

                                            <p className="auth-modal__note">
                                                <>¿Ya tenés cuenta? <button className="auth-modal__link" onClick={() => switchMode('login')}>Iniciá sesión</button></>
                                            </p>
                                        </div>
                                    ) : isRegister && registerStep === 2 ? (
                                        <div className="auth-modal__fields">
                                            <div className="auth-modal__field" ref={uniRef}>
                                                <label className="auth-modal__label">
                                                    Universidad / Facultad <span className="auth-modal__optional">(opcional)</span>
                                                </label>
                                                <div className="evm-location-autocomplete">
                                                    <div className={`evm-location-field${universitySelected ? ' evm-location-field--valid' : universityInput.length > 0 ? ' evm-location-field--typing' : ''}`}>
                                                        <Location size={13} color={universitySelected ? '#10b981' : 'var(--muted, #888)'} />
                                                        <input type="text" className="evm-location-bare-input" value={universityInput}
                                                            onChange={e => handleUniInput(e.target.value)}
                                                            onFocus={() => universityInput.length >= 3 && !universitySelected && setUniOpen(true)}
                                                            placeholder="Buscá tu universidad..." autoComplete="off" />
                                                        {uniLoading && <Loader size={13} color="var(--muted)" className="evm-loc-spin" />}
                                                        {universitySelected && <span className="evm-loc-check"><CheckCircle size={12} color='currentColor' style={{ position: "relative", top: "2" }} /></span>}
                                                        {universityInput && <button type="button" className="evm-loc-clear" onClick={clearUniversity}><X size={12} /></button>}
                                                    </div>
                                                    {uniOpen && (uniLoading || uniResults.length > 0 || universityInput.length >= 3) && (
                                                        <div className="evm-loc-dropdown">
                                                            {uniLoading && <div className="evm-loc-loading">Buscando...</div>}
                                                            {!uniLoading && uniResults.length === 0 && universityInput.length >= 3 && <div className="evm-loc-empty">Sin resultados. Podés escribirla manualmente.</div>}
                                                            {uniResults.map(r => (
                                                                <button key={r.place_id} type="button" className="evm-loc-item" onClick={() => selectUniversity(r)}>
                                                                    <span className="evm-loc-item-name">{cleanUniversityName(r.display_name)}</span>
                                                                    <span className="evm-loc-item-full">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                                                                </button>
                                                            ))}
                                                            {!uniLoading && universityInput.length >= 3 && (
                                                                <button type="button" className="evm-loc-item evm-loc-item--manual"
                                                                    onClick={() => { setUniversitySelected(universityInput); setUniversityLat(null); setUniversityLon(null); setUniOpen(false) }}>
                                                                    <span className="evm-loc-item-name">Usar "{universityInput}"</span>
                                                                    <span className="evm-loc-item-full">Sin ubicación exacta en el mapa</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {universitySelected && universityLat && <p className="evm-loc-hint evm-loc-hint--ok">Ubicación exacta guardada</p>}
                                                    {universitySelected && !universityLat && <p className="evm-loc-hint evm-loc-hint--warn"><Danger size={12} color='currentColor' /> Sin ubicación exacta</p>}
                                                </div>
                                            </div>

                                            <div className="auth-modal__field">
                                                <div className="auth-modal__career-header">
                                                    <label className="auth-modal__label">
                                                        Nombre de tu carrera <span className="auth-modal__optional">(Podés saltear esto y cargarlo después)</span>
                                                    </label>
                                                </div>
                                                <input
                                                    type="text"
                                                    className="auth-modal__input"
                                                    value={careerName}
                                                    onChange={e => setCareerName(e.target.value)}
                                                    placeholder="ej. Ingeniería en Sistemas"
                                                    maxLength={60}
                                                    autoComplete="off"
                                                />

                                                {careerName.trim() && (<>
                                                    <div className="auth-modal__field">
                                                        <label className="auth-modal__label">Duración</label>
                                                        <div className="auth-modal__chip-row">
                                                            {[3, 4, 5, 6].map(y => (
                                                                <button key={y} type="button"
                                                                    className={`auth-modal__chip${totalYears === y ? ' active' : ''}`}
                                                                    onClick={() => setTotalYears(y)}>
                                                                    {y} años
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="auth-modal__field">
                                                        <label className="auth-modal__label">
                                                            Total de materias <span className="auth-modal__optional">(opcional)</span>
                                                        </label>
                                                        <input type="number" className="auth-modal__input" value={totalSubjects}
                                                            onChange={e => setTotalSubjects(e.target.value)}
                                                            placeholder="ej. 42" min={1} max={999} />
                                                    </div>
                                                    <div className="auth-modal__field">
                                                        <label className="auth-modal__label">¿En qué año estás?</label>
                                                        <div className="auth-modal__chip-row">
                                                            {[1, 2, 3, 4, 5, 6].map(y => (
                                                                <button key={y} type="button"
                                                                    className={`auth-modal__chip${currentYear === y ? ' active' : ''}`}
                                                                    onClick={() => setCurrentYear(y)}>
                                                                    {y}°
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="auth-modal__field">
                                                        <label className="auth-modal__label">¿En qué cuatrimestre?</label>
                                                        <div className="auth-modal__chip-row">
                                                            {([1, 2] as const).map(s => (
                                                                <button key={s} type="button"
                                                                    className={`auth-modal__chip${currentSemester === s ? ' active' : ''}`}
                                                                    onClick={() => setCurrentSemester(s)}>
                                                                    {s}° cuatrimestre
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="auth-modal__career-preview">
                                                        <span>{currentYear}° año · {currentSemester}° cuatri</span>
                                                        {totalSubjects && <span>· {totalSubjects} materias</span>}
                                                        <span>· {totalYears} años</span>
                                                    </div>
                                                </>)}
                                            </div>

                                            {error && <div className="auth-modal__error"><Danger size={12} color='currentColor' /> {error}</div>}

                                            <div className="auth-modal__step2-actions">
                                                <button className="auth-modal__back-btn" onClick={() => { setRegisterStep(1); setError(null) }}>
                                                    Volver
                                                </button>
                                                <button className="auth-modal__submit auth-modal__submit--flex" onClick={handleSubmit} disabled={loading}>
                                                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                                                </button>
                                            </div>

                                            <p className="auth-modal__confirm-note">
                                                <Mail size={13} color="currentColor" style={{ display: 'inline', marginRight: 5, position: "relative", top: "2" }} />
                                                Te enviaremos un email de confirmación.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="auth-modal__fields">
                                            <div className="auth-modal__field">
                                                <label className="auth-modal__label">Email</label>
                                                <input ref={emailRef} type="email" className="auth-modal__input" value={email}
                                                    onChange={e => { setEmail(e.target.value); setMagicSent(false) }}
                                                    placeholder="tu@email.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoComplete="email" />
                                            </div>
                                            <div className="auth-modal__field">
                                                <label className="auth-modal__label">Contraseña</label>
                                                <div className="auth-modal__password-wrap">
                                                    <input type={showPassword ? 'text' : 'password'} className="auth-modal__input"
                                                        value={password} onChange={e => setPassword(e.target.value)}
                                                        placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoComplete="current-password" />
                                                    <button type="button" className="auth-modal__toggle" onClick={() => setShowPassword(v => !v)}>
                                                        {showPassword ? <EyeSlash size={14} color='currentColor' /> : <Eye size={14} color='currentColor' />}
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={`auth-modal__forgot-btn${resetSent ? ' sent' : ''}`}
                                                    onClick={handleResetPassword}
                                                    disabled={resetLoading}
                                                >
                                                    {resetLoading ? 'Enviando...' : resetSent ? 'Link enviado' : '¿Olvidaste tu contraseña?'}
                                                </button>
                                                {resetSent && (
                                                    <div className="auth-modal__reset-sent">
                                                        <Mail size={15} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
                                                        <div>
                                                            <strong>Link enviado</strong>
                                                            <p>Revisá tu bandeja de entrada para restablecer tu contraseña.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {error && <div className="auth-modal__error"><Danger size={12} color='currentColor' /> {error}</div>}

                                            <button className="auth-modal__submit" onClick={handleSubmit} disabled={loading}>
                                                {loading ? 'Cargando...' : 'Entrar'}
                                            </button>

                                            <div className="auth-modal__divider"><span>o</span></div>
                                            <div className="auth-modal__social">
                                                <button className="auth-modal__social-btn auth-modal__social-btn--github" onClick={() => handleOAuth('github')} type="button">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                                                    GitHub
                                                </button>
                                                <button className="auth-modal__social-btn auth-modal__social-btn--discord" onClick={() => handleOAuth('discord')} type="button">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.004.028.019.056.04.073a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .041-.074c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                                                    Discord
                                                </button>
                                            </div>

                                            {magicSent ? (
                                                <div className="auth-modal__magic-sent">
                                                    <Mail size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                                                    <div>
                                                        <p>Revisá el email <strong>{email}</strong> y hacé clic en el link para entrar.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button className="auth-modal__magic-btn" onClick={handleMagicLink} disabled={magicLoading}>
                                                    <Link2 size={18} color="currentColor" />
                                                    {magicLoading ? 'Enviando link...' : 'Entrar sin contraseña'}
                                                </button>
                                            )}

                                            <p className="auth-modal__note">
                                                <button className="auth-modal__link" onClick={() => switchMode('register')}>Registrate gratis</button> si no tenés cuenta
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}