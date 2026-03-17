import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import {
    Add, Calendar as CalIcon,
    MaximizeCircle, MinusSquare, NotificationBing,
    HambergerMenu, Setting2,
    ArrowRight2, Teacher, ArrowLeft2, Logout, Edit2, EyeSlash,
    Keyboard, Setting4, Copy, CopySuccess, MessageQuestion,
    TickSquare, Diagram, Chart, Location,
    Trash,
    Video,
} from 'iconsax-react'
import type { Career, CareerConfig } from '../hooks/Usecareers'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import type { UserPreferences } from '../../supabase/Supabase'
import { DEFAULT_PREFERENCES } from '../../supabase/Supabase'
import './Appheader.css'
import { Eye, Bell, BellOff, EyeOff, TrashIcon, Loader, X, CheckCircle, SunMoon, Headset, CircleQuestionMark, Mail } from 'lucide-react'
import CharAverage from '../Icon/CharAverage'
import CloudDown from '../Icon/CloudDown'
import Cloud from '../Icon/Cloud'
import ViewAgendal from '../Icon/ViewAgendal'
import CloudExport from '../Icon/CloudExport'
import Archive from '../Icon/Archive'
import CalendarUp from '../Icon/CalendarUp'
import Ranking from '../Icon/Ranking'
import NotionWidgetTutorial from './Notionwidgettutorial'
import { useTheme, ThemeCycleButton, type ThemeOption } from './Themetoggle'
import ContactModal from './Contactmodal'
import AdminMessagesPanel from './Adminmessagespanel'

export interface HeaderEvent { date: string; title: string }

interface Props {
    user: User | null
    profile: { full_name?: string; university?: string; preferences?: UserPreferences; notion_token?: string | null; notion_workspace_name?: string | null } | null
    onOpenAuth: () => void
    onSignOut: () => void
    onUpdateProfile: (updates: { full_name?: string; university?: string }) => Promise<string | null>
    onUpdatePassword: (newPassword: string) => Promise<string | null>
    onDeleteAccount: () => Promise<string | null>
    onUpdatePreferences: (prefs: UserPreferences) => Promise<string | null>
    search: string
    onSearch: (v: string) => void
    onOpenOnboarding: () => void
    careers: Career[]
    activeCareer: Career | null
    onOpenScheduleExport: () => void
    onCloseSemester: () => void
    onSelectCareer: (id: string) => void
    onAddCareer: (name: string) => Promise<string | null>
    onDeleteCareer: (id: string) => Promise<string | null>
    onSaveCareerConfig: (id: string, config: CareerConfig) => Promise<string | null>
    onAddSubject: () => void
    onImportSiu: () => void
    onCopyWidget: () => void
    onExportXls: () => void
    onOpenCalendar: () => void
    onToggleCompact: () => void
    compactView: boolean
    kanbanView: boolean
    onToggleKanban: () => void
    onToggleGpa: () => void
    showGpa: boolean
    onOpenAnalytics: () => void
    upcomingExam: HeaderEvent | null
    onOpenShortcuts: () => void
}

const ADMIN_HASH = 'a4d8f49dcf69f4ef82e8701d5977c9c3e3ef47e93d05801beeaa80a7add2d02e'

const isMobile = window.innerWidth <= 768

async function hashUid(uid: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(uid))
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

interface UniversityResult { display_name: string; place_id: number; lat: string; lon: string }

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

function cleanUniversityName(dn: string) { return dn.split(',')[0].trim() }

function UniversityPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
    const [input, setInput] = useState(value)
    const [selected, setSelected] = useState(!!value)
    const [results, setResults] = useState<UniversityResult[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const ref = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

    useEffect(() => { setInput(value); setSelected(!!value) }, [value])

    useEffect(() => {
        if (!open) return
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [open])

    const updateDropdownPos = () => {
        if (!inputRef.current) return
        const rect = inputRef.current.closest('.evm-location-field')?.getBoundingClientRect()
        if (!rect) return
        setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
        })
    }

    const handleInput = (val: string) => {
        setInput(val)
        setSelected(false)
        onChange(val)

        if (val.length < 3) {
            setResults([])
            setOpen(false)
            return
        }

        setOpen(true)
        updateDropdownPos()

        if (debounce.current) clearTimeout(debounce.current)
        setLoading(true)
        debounce.current = setTimeout(async () => {
            const res = await searchUniversities(val)
            setResults(res)
            setLoading(false)
        }, 400)
    }

    const handleFocus = () => {
        if (input.length >= 3 && !selected) {
            setOpen(true)
            updateDropdownPos()
        }
    }

    const select = (r: UniversityResult) => {
        const name = cleanUniversityName(r.display_name)
        setInput(name); setSelected(true); onChange(name); setResults([]); setOpen(false)
    }

    const clear = () => { setInput(''); setSelected(false); onChange(''); setResults([]); setOpen(false) }

    const showDropdown = open && (loading || results.length > 0 || input.length >= 3)

    return (
        <div className="evm-location-autocomplete" ref={ref}>
            <div className={`evm-location-field${selected ? ' evm-location-field--valid' : input.length > 0 ? ' evm-location-field--typing' : ''}`}>
                <Location size={13} color={selected ? '#10b981' : 'var(--muted, #888)'} />
                <input
                    ref={inputRef}
                    type="text"
                    className="evm-location-bare-input"
                    value={input}
                    onChange={e => handleInput(e.target.value)}
                    onFocus={handleFocus}
                    placeholder="Buscá tu universidad..."
                    autoComplete="off"
                />
                {loading && <Loader size={13} color="var(--muted)" className="evm-loc-spin" />}
                {selected && <span className="evm-loc-check"><CheckCircle size={12} color='currentColor' style={{ position: 'relative', top: 2 }} /></span>}
                {input && <button type="button" className="evm-loc-clear" onClick={clear}><X size={12} /></button>}
            </div>

            {showDropdown && createPortal(
                <div className="evm-loc-dropdown" style={dropdownStyle} data-menu-portal="true">
                    {loading && <div className="evm-loc-loading">Buscando...</div>}
                    {!loading && results.length === 0 && input.length >= 3 && (
                        <div className="evm-loc-empty">Sin resultados. Podés escribirla manualmente.</div>
                    )}
                    {results.map(r => (
                        <button key={r.place_id} type="button" className="evm-loc-item" onClick={() => select(r)}>
                            <span className="evm-loc-item-name">{cleanUniversityName(r.display_name)}</span>
                            <span className="evm-loc-item-full">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                        </button>
                    ))}
                    {!loading && input.length >= 3 && (
                        <button type="button" className="evm-loc-item" style={{ borderTop: '1px solid var(--border-faint)' }}
                            onClick={() => { setSelected(true); onChange(input); setOpen(false) }}>
                            <span className="evm-loc-item-name" style={{ color: 'var(--accent)' }}>Usar "{input}"</span>
                            <span className="evm-loc-item-full">Sin ubicación exacta en el mapa</span>
                        </button>
                    )}
                </div>,
                document.body
            )}
            {selected && <p className="evm-loc-hint evm-loc-hint--ok">Universidad guardada</p>}
        </div>
    )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" className={`hdr-toggle${checked ? ' hdr-toggle--on' : ''}`}
            onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
            <span className="hdr-toggle__thumb" />
        </button>
    )
}

function NotionIcon({ size = 13 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z" />
        </svg>
    )
}

function ProgConfigPanel({ career, onSave, onClose }: { career: Career; onSave: (id: string, config: CareerConfig) => Promise<string | null>; onClose: () => void }) {
    const cfg = career.config
    const [subjects, setSubjects] = useState(String(cfg.totalSubjects || ''))
    const [years, setYears] = useState(String(cfg.totalYears || ''))
    const [extraSemesters, setExtraSemesters] = useState(cfg.extraSemesters ?? 0)
    const [currentYear, setCurrentYear] = useState(cfg.currentYear ?? 1)
    const [currentSemester, setCurrentSemester] = useState<1 | 2>(cfg.currentSemester ?? 1)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    const totalYearsNum = parseInt(years, 10) || 0
    const durationLabel = totalYearsNum > 0 ? `${totalYearsNum} año${totalYearsNum !== 1 ? 's' : ''}${extraSemesters === 1 ? ' y 1 cuatrimestre' : ''}` : '—'
    const handle = async () => {
        setSaving(true); setErr(null)
        const error = await onSave(career.id, { totalSubjects: parseInt(subjects, 10) || 0, totalYears: parseInt(years, 10) || 0, extraSemesters, currentYear, currentSemester, semesterDates: career.config.semesterDates })
        setSaving(false)
        if (error) { setErr(error); return }
        onClose()
    }
    return (
        <div className="hdr-menu__section">
            <div className="hdr-menu__section-title">Configurar — {career.name}</div>
            <div className="hdr-cfg__field">
                <label>¿En qué año y cuatrimestre estás?</label>
                <div className="hdr-cfg__year-row">
                    {[1, 2, 3, 4, 5, 6].map(y => <button key={y} type="button" className={`hdr-pref__chip ${currentYear === y ? ' active' : ''}`} onClick={() => setCurrentYear(y)}>{y}°</button>)}
                </div>
                <div className="hdr-cfg__year-row" style={{ marginTop: 6 }}>
                    {([1, 2] as const).map(s => <button key={s} type="button" className={`hdr-pref__chip ${currentSemester === s ? ' active' : ''}`} onClick={() => setCurrentSemester(s)}>{s}° cuatri</button>)}
                </div>
            </div>
            <div className="hdr-cfg__field">
                <label>Total de materias</label>
                <input type="number" min={0} max={999} value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="ej. 42" className="hdr-cfg__input" />
            </div>
            <div className="hdr-cfg__field">
                <label>Duración</label>
                <div className="hdr-cfg__dur-row">
                    <input type="number" min={1} max={10} value={years} onChange={e => setYears(e.target.value)} placeholder="años" className="hdr-cfg__input hdr-cfg__input--sm" />
                    <span className="hdr-cfg__unit">años</span>
                    <button type="button" className={`hdr-pref__chip${extraSemesters === 0 ? ' active' : ''}`} onClick={() => setExtraSemesters(0)}>sin extra</button>
                    <button type="button" className={`hdr-pref__chip${extraSemesters === 1 ? ' active' : ''}`} onClick={() => setExtraSemesters(1)}>+1 cuatri</button>
                </div>
                {totalYearsNum > 0 && <span className="hdr-cfg__hint">Total: <strong>{durationLabel}</strong></span>}
            </div>
            {err && <div className="hdr-cfg__error">{err}</div>}
            <div className="hdr-cfg__actions">
                <button className="btn" onClick={onClose} disabled={saving}>Cancelar</button>
                <button className="btn btn--primary" onClick={handle} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </div>
    )
}

function EditProfilePanel({ profile, onUpdateProfile, onUpdatePassword, onDeleteAccount, onSignOut }: {
    profile: { full_name?: string; university?: string } | null
    onUpdateProfile: (updates: { full_name?: string; university?: string }) => Promise<string | null>
    onUpdatePassword: (newPassword: string) => Promise<string | null>
    onDeleteAccount: () => Promise<string | null>
    onClose: () => void
    onSignOut: () => void
}) {
    const [fullName, setFullName] = useState(profile?.full_name ?? '')
    const [university, setUniversity] = useState(profile?.university ?? '')
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPwd, setShowNewPwd] = useState(false)
    const [showConfirmPwd, setShowConfirmPwd] = useState(false)
    const [savingPwd, setSavingPwd] = useState(false)
    const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [deletingAccount, setDeletingAccount] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(false)
    const [deleteMsg, setDeleteMsg] = useState<string | null>(null)

    const handleSaveProfile = async () => {
        setSavingProfile(true); setProfileMsg(null)
        const err = await onUpdateProfile({ full_name: fullName.trim(), university: university.trim() })
        setSavingProfile(false)
        if (err) setProfileMsg({ type: 'err', text: err })
        else { setProfileMsg({ type: 'ok', text: '¡Perfil actualizado!' }); setTimeout(() => setProfileMsg(null), 3000) }
    }

    const handleSavePassword = async () => {
        if (!newPassword) { setPwdMsg({ type: 'err', text: 'Ingresá la nueva contraseña.' }); return }
        if (newPassword.length < 6) { setPwdMsg({ type: 'err', text: 'Mínimo 6 caracteres.' }); return }
        if (newPassword !== confirmPassword) { setPwdMsg({ type: 'err', text: 'Las contraseñas no coinciden.' }); return }
        setSavingPwd(true); setPwdMsg(null)
        const err = await onUpdatePassword(newPassword)
        setSavingPwd(false)
        if (err) setPwdMsg({ type: 'err', text: err })
        else { setPwdMsg({ type: 'ok', text: '¡Contraseña actualizada!' }); setNewPassword(''); setConfirmPassword(''); setTimeout(() => setPwdMsg(null), 3000) }
    }

    const handleDeleteAccount = async () => {
        if (!deleteConfirm) { setDeleteConfirm(true); return }
        setDeletingAccount(true); setDeleteMsg(null)
        const err = await onDeleteAccount()
        if (err) {
            setDeletingAccount(false)
            setDeleteMsg(err)
        } else {
            onSignOut()
        }
    }

    const handleUniversityChange = useCallback((name: string) => {
        setUniversity(name)
    }, [])

    return (
        <div className="hdr-menu__section">
            <div className="hdr-menu__section-title">Editar perfil</div>
            <div className="hdr-cfg__field">
                <label>Nombre completo</label>
                <input className="hdr-cfg__input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan García" maxLength={80} />
            </div>
            <div className="hdr-cfg__field">
                <label>Universidad / Facultad</label>
                <UniversityPicker value={university} onChange={handleUniversityChange} />
            </div>
            {profileMsg && <div className={profileMsg.type === 'ok' ? 'hdr-cfg__ok' : 'hdr-cfg__error'}>{profileMsg.text}</div>}
            <div className="hdr-cfg__actions">
                <button className="btn btn--primary" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Guardando...' : 'Guardar datos'}
                </button>
            </div>
            <div className="hdr-menu__divider" />
            <div className="hdr-menu__section-title" style={{ marginTop: '4px' }}>Cambiar contraseña</div>
            <div className="hdr-cfg__field">
                <label>Nueva contraseña</label>
                <div className="hdr-cfg__pwd-wrap">
                    <input className="hdr-cfg__input" type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                    <button type="button" className="hdr-cfg__pwd-eye" onClick={() => setShowNewPwd(v => !v)}>
                        {showNewPwd ? <EyeSlash size={13} color='currentColor' /> : <Eye size={13} color='currentColor' />}
                    </button>
                </div>
            </div>
            <div className="hdr-cfg__field">
                <label>Confirmar contraseña</label>
                <div className="hdr-cfg__pwd-wrap">
                    <input className="hdr-cfg__input" type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" onKeyDown={e => e.key === 'Enter' && handleSavePassword()} />
                    <button type="button" className="hdr-cfg__pwd-eye" onClick={() => setShowConfirmPwd(v => !v)}>
                        {showConfirmPwd ? <EyeSlash size={13} color='currentColor' /> : <Eye size={13} color='currentColor' />}
                    </button>
                </div>
            </div>
            {pwdMsg && <div className={pwdMsg.type === 'ok' ? 'hdr-cfg__ok' : 'hdr-cfg__error'}>{pwdMsg.text}</div>}
            <div className="hdr-cfg__actions">
                <button className="btn btn--primary" onClick={handleSavePassword} disabled={savingPwd}>
                    {savingPwd ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
            </div>
            <div className="hdr-menu__divider hdr-desktop-only" />
            <div className="hdr-desktop-only">
                {deleteMsg && <div className="hdr-cfg__error">{deleteMsg}</div>}
                {deleteConfirm && <p className="hdr-cfg__delete-warning">Esto eliminará permanentemente tu cuenta, materias y datos. No tiene vuelta atrás.</p>}
                <button className={`btn btn--danger${deleteConfirm ? ' hdr-cfg__btn--danger-confirm' : ''}`} onClick={handleDeleteAccount} disabled={deletingAccount}>
                    <Trash size={12} color='currentColor' />
                    {deletingAccount ? 'Eliminando...' : deleteConfirm ? 'Sí, eliminar mi cuenta' : 'Eliminar cuenta'}
                </button>
                {deleteConfirm && <button className="btn" style={{ marginTop: '6px' }} onClick={() => { setDeleteConfirm(false); setDeleteMsg(null) }}>Cancelar</button>}
            </div>
        </div>
    )
}

function PreferencesPanel({
    preferences,
    onSave,
    userEmail,
    theme,
}: {
    preferences: UserPreferences
    onSave: (prefs: UserPreferences) => Promise<string | null>
    userEmail?: string
    notionToken?: string | null
    notionWorkspaceName?: string | null
    theme: 'dark' | 'light'
}) {
    const [prefs, setPrefs] = useState<UserPreferences>(() => ({ ...DEFAULT_PREFERENCES, ...preferences, notifications: { ...DEFAULT_PREFERENCES.notifications, ...preferences?.notifications }, promotionThreshold: preferences?.promotionThreshold ?? DEFAULT_PREFERENCES.promotionThreshold, regularThreshold: preferences?.regularThreshold ?? DEFAULT_PREFERENCES.regularThreshold }))
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const notif = prefs.notifications
    const toggleEnabled = (v: boolean) => setPrefs(p => ({ ...p, notifications: { ...p.notifications, enabled: v } }))
    const toggleType = (type: 'final' | 'parcial') => { const types = notif.types.includes(type) ? notif.types.filter(t => t !== type) : [...notif.types, type]; setPrefs(p => ({ ...p, notifications: { ...p.notifications, types } })) }
    const toggleDay = (day: number) => { const daysBefore = notif.daysBefore.includes(day) ? notif.daysBefore.filter(d => d !== day) : [...notif.daysBefore, day].sort((a, b) => a - b); setPrefs(p => ({ ...p, notifications: { ...p.notifications, daysBefore } })) }
    const handleSave = async () => { setSaving(true); setMsg(null); const err = await onSave(prefs); setSaving(false); if (err) setMsg({ type: 'err', text: err }); else { setMsg({ type: 'ok', text: '¡Preferencias guardadas!' }); setTimeout(() => setMsg(null), 3000) } }
    const DAYS_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 30]
    const [hourDir, setHourDir] = useState<'up' | 'down'>('up')
    const hour = prefs.notifications.notifyHour ?? 9
    const d1 = Math.floor(hour / 10); const d2 = hour % 10
    const promoThreshold = prefs.promotionThreshold ?? 7; const regularThreshold = prefs.regularThreshold ?? 4
    const PROMO_OPTIONS = [6, 7, 8, 9, 10]; const REGULAR_OPTIONS = [3, 4, 5, 6]
    return (
        <div className="hdr-menu__section">
            <div className="hdr-pref__section-label"><Ranking size={12} />Notas</div>
            <div className="hdr-cfg__field">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Nota para promocionar directo</span><span className="hdr-pref__threshold-badge">≥ {promoThreshold}</span></label>
                <p className="hdr-pref__hint" style={{ marginBottom: 6 }}>Con esta nota o más, aprobás sin rendir final</p>
                <div className="hdr-pref__threshold-row">{PROMO_OPTIONS.map(n => <button key={n} type="button" className={`hdr-pref__chip ${promoThreshold === n ? ' active' : ''}`} disabled={n <= regularThreshold} onClick={() => setPrefs(p => ({ ...p, promotionThreshold: n }))}>{n}</button>)}</div>
                {promoThreshold !== 7 && <p className="hdr-pref__hint" style={{ color: 'var(--muted)', marginTop: 4 }}>Configurado para tu universidad</p>}
            </div>
            <div className="hdr-menu__divider2" />
            <div className="hdr-cfg__field">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Nota para regularizar</span><span className="hdr-pref__threshold-badge">≥ {regularThreshold}</span></label>
                <p className="hdr-pref__hint" style={{ marginBottom: 6 }}>Con esta nota o más (pero menos de {promoThreshold}), vas al final</p>
                <div className="hdr-pref__threshold-row">{REGULAR_OPTIONS.map(n => <button key={n} type="button" className={`hdr-pref__chip${regularThreshold === n ? ' active' : ''}`} disabled={n >= promoThreshold} onClick={() => setPrefs(p => ({ ...p, regularThreshold: n }))}>{n}</button>)}</div>
            </div>
            <div className="">
                <div className="hdr-pref__grade-preview-row"><span className="hdr-pref__grade-dot" style={{ background: '#4ade80' }} /><span>Promedio <strong>≥ {promoThreshold}</strong> → Aprobado directo</span></div>
                <div className="hdr-pref__grade-preview-row"><span className="hdr-pref__grade-dot" style={{ background: '#fbbf24' }} /><span>Promedio <strong>{regularThreshold}–{promoThreshold - 1}</strong> → Va al final</span></div>
                <div className="hdr-pref__grade-preview-row"><span className="hdr-pref__grade-dot" style={{ background: '#f87171' }} /><span>Promedio <strong>{'<'} {regularThreshold}</strong> → Recursada</span></div>
            </div>
            <div className="hdr-menu__divider" />
            <div className="hdr-pref__section-label"><Bell size={11} color="currentColor" /> Notificaciones push</div>
            <div className="hdr-pref__group">
                <div className="hdr-pref__group-header">
                    <span className="hdr-pref__group-icon">{notif.enabled ? <Bell size={13} color="var(--accent2)" /> : <BellOff size={13} color="var(--muted)" />}</span>
                    <span className="hdr-pref__group-label">Notificaciones del navegador</span>
                    <Toggle checked={notif.enabled} onChange={toggleEnabled} />
                </div>
                {userEmail && <p className="hdr-pref__hint">Avisos antes de finales y parciales</p>}
            </div>
            {notif.enabled && (<>
                <div className="hdr-menu__divider2" />
                <div className="hdr-cfg__field">
                    <label>Avisar para</label>
                    <div className="hdr-pref__chips">{(['final', 'parcial'] as const).map(type => <button key={type} type="button" className={`hdr-pref__chip${notif.types.includes(type) ? ' active' : ''}`} onClick={() => toggleType(type)}>{type === 'final' ? 'Finales' : 'Parciales'}</button>)}</div>
                </div>
                <div className="hdr-menu__divider2" />
                <div className="hdr-cfg__field">
                    <label>Hora del aviso</label>
                    <div className='HoraAviso'>
                        <button type="button" className="btnHs" onClick={() => { setHourDir('down'); setPrefs(p => ({ ...p, notifications: { ...p.notifications, notifyHour: Math.max(0, (p.notifications.notifyHour ?? 9) - 1) } })) }}>−</button>
                        <span className="HoraAviso__display">
                            <span className="HoraAviso__digit-wrap"><span key={`d1-${d1}`} className={`HoraAviso__digit HoraAviso__digit--${hourDir}`} style={{ opacity: d1 === 0 ? 0 : 1 }}>{d1}</span></span>
                            <span className="HoraAviso__digit-wrap"><span key={`d2-${hour}`} className={`HoraAviso__digit HoraAviso__digit--${hourDir}`}>{d2}</span></span>
                            <span className="HoraAviso__colon">:</span>
                            <span className="HoraAviso__digit-wrap"><span className="HoraAviso__digit" style={{ opacity: 0.35 }}>0</span></span>
                            <span className="HoraAviso__digit-wrap"><span className="HoraAviso__digit" style={{ opacity: 0.35 }}>0</span></span>
                        </span>
                        <button type="button" className="btnHs" onClick={() => { setHourDir('up'); setPrefs(p => ({ ...p, notifications: { ...p.notifications, notifyHour: Math.min(23, (p.notifications.notifyHour ?? 9) + 1) } })) }}>+</button>
                    </div>
                </div>
                <div className="hdr-menu__divider2" />
                <div className="hdr-cfg__field">
                    <label>Avisar con anticipación</label>
                    <div className="hdr-pref__chips">{DAYS_OPTIONS.map(day => <button key={day} type="button" className={`hdr-pref__chip${notif.daysBefore.includes(day) ? ' active' : ''}`} onClick={() => toggleDay(day)}>{day === 1 ? '1 día' : `${day} días`}</button>)}</div>
                    {notif.daysBefore.length === 0 && <span className="hdr-cfg__hint" style={{ color: 'var(--danger)' }}>Seleccioná al menos un día</span>}
                </div>
                {notif.types.length > 0 && notif.daysBefore.length > 0 && (
                    <div className="hdr-pref__summary">Vas a recibir una notificación{' '}{notif.daysBefore.map((d, i) => <span key={d}>{i > 0 && i === notif.daysBefore.length - 1 ? ' y ' : i > 0 ? ', ' : ''}<strong>{d === 1 ? '1 día' : `${d} días`}</strong></span>)}{' '}antes de cada{' '}{notif.types.includes('final') && notif.types.includes('parcial') ? 'final y parcial' : notif.types.includes('final') ? 'final' : 'parcial'}.</div>
                )}
            </>)}
            <div className="hdr-menu__divider" />
            <div className="hdr-pref__section-label">
                <SunMoon size={13} color='currentColor' />
                Apariencia
            </div>
            <div className="hdr-pref__group">
                <div className="hdr-pref__group-header">
                    <span className="hdr-pref__group-label">
                        {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                    </span>
                </div>
            </div>
            <div className="hdr-menu__divider" />
            <div className="hdr-pref__section-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Vista</div>
            <div className="hdr-cfg__field">
                <div className="hdr-pref__group-header">
                    <span className="hdr-pref__group-icon">{prefs.showLocked ? <Eye size={13} color="var(--muted)" /> : <EyeOff size={13} color="var(--muted)" />}</span>
                    <span className="hdr-pref__group-label">Mostrar materias bloqueadas</span>
                    <Toggle checked={prefs.showLocked} onChange={v => setPrefs(p => ({ ...p, showLocked: v }))} />
                </div>
                <p className="hdr-pref__hint">{prefs.showLocked ? 'Las materias bloqueadas son visibles' : 'Las materias bloqueadas están ocultas'}</p>
            </div>
            <div className="hdr-menu__divider" />
            <div className="hdr-pref__section-label">
                <Video size={13} color='currentColor' />
                Clases virtuales
            </div>
            <div className="hdr-pref__group">
                <div className="hdr-pref__group-header">
                    <span className="hdr-pref__group-label">Aviso de clase (Zoom/Meet)</span>
                    <Toggle checked={prefs.classReminder ?? false} onChange={v => setPrefs(p => ({ ...p, classReminder: v }))} />
                </div>
                <p className="hdr-pref__hint">
                    {prefs.classReminder
                        ? 'Te avisa 5 min antes y al inicio de cada clase con link cargado'
                        : 'Activalo para recibir avisos de tus clases virtuales'}
                </p>
            </div>
            {msg && <div className={msg.type === 'ok' ? 'hdr-cfg__ok' : 'hdr-cfg__error'}>{msg.text}</div>}
            <div className="hdr-cfg__actions">
                <button className="btn btn--primary" onClick={handleSave} disabled={saving || (notif.enabled && (notif.daysBefore.length === 0 || notif.types.length === 0))}>
                    {saving ? 'Guardando...' : 'Guardar preferencias'}
                </button>
            </div>
        </div>
    )
}

export default function AppHeader({ user, profile, onOpenShortcuts, onOpenOnboarding, onCloseSemester, onOpenScheduleExport, onOpenAuth, onSignOut, onUpdateProfile, onUpdatePassword, onDeleteAccount, onUpdatePreferences, careers, activeCareer, kanbanView, onToggleCompact, onToggleKanban, onSelectCareer, onAddCareer, onDeleteCareer, onSaveCareerConfig, onAddSubject, onOpenCalendar, onImportSiu, onExportXls, compactView, onToggleGpa, showGpa, onCopyWidget, onOpenAnalytics, upcomingExam }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuSection, setMenuSection] = useState<'main' | 'account' | 'career' | 'config' | 'edit-profile' | 'preferences' | 'widget' | 'datos' | 'ver' | 'stats' | 'support'>('main')
    const [newCareerName, setNewCareerName] = useState('')
    const [addingCareer, setAddingCareer] = useState(false)
    const [careerError, setCareerError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showWidgetTutorial, setShowWidgetTutorial] = useState(false)
    const [copied, setCopied] = useState(false)
    const [holdProgress, setHoldProgress] = useState<Record<string, number>>({})
    const holdTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({})
    const holdTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const [showContact, setShowContact] = useState(false)
    const [showAdmin, setShowAdmin] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)

    const [theme, themeOption, setThemeOption] = useTheme()
    const cycleTheme = () => {
        const cycle: ThemeOption[] = ['dark', 'light', 'system']
        const idx = cycle.indexOf(themeOption)
        setThemeOption(cycle[(idx + 1) % cycle.length])
    }
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!user?.id) { setIsAdmin(false); return }
        hashUid(user.id).then(h => setIsAdmin(h === ADMIN_HASH))
    }, [user?.id])

    useEffect(() => {
        if (!menuOpen) return
        const handlePointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('[data-menu-portal]')) return
            if (menuRef.current && menuRef.current.contains(target)) return
            setMenuOpen(false)
            setMenuSection('main')
        }
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setMenuOpen(false); setMenuSection('main') }
        }
        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKey)
        }
    }, [menuOpen])

    const closeMenu = () => { setMenuOpen(false); setMenuSection('main') }
    const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?'
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Cuenta'

    const handleAddCareer = async () => {
        if (!newCareerName.trim()) return
        setAddingCareer(true); setCareerError(null)
        const err = await onAddCareer(newCareerName.trim())
        setAddingCareer(false)
        if (err) { setCareerError(err); return }
        setNewCareerName('')
    }

    const menuVariants: Variants = {
        hidden: { opacity: 0, scale: 0.97, y: -8 },
        visible: {
            opacity: 1, scale: 1, y: 0,
            transition: { type: 'spring' as const, damping: 24, stiffness: 300 }
        },
        exit: {
            opacity: 0, scale: 0.97, y: -6,
            transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const }
        },
    }

    const menuDesktopVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
    }

    const sectionVariants: Variants = {
        hidden: { opacity: 0, x: 10 },
        visible: {
            opacity: 1, x: 0,
            transition: { duration: 0.18, ease: 'easeOut' as const }
        },
        exit: {
            opacity: 0, x: -10,
            transition: { duration: 0.12 }
        },
    }

    const sectionDesktopVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.1 } },
        exit: { opacity: 0, transition: { duration: 0.08 } },
    }

    const startHold = (id: string, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation()
        holdTimers.current[id] = setInterval(() => { setHoldProgress(prev => ({ ...prev, [id]: Math.min((prev[id] ?? 0) + (30 / 800) * 100, 100) })) }, 30)
        holdTimeouts.current[id] = setTimeout(async () => { clearInterval(holdTimers.current[id]); setHoldProgress(prev => ({ ...prev, [id]: 0 })); setDeletingId(id); await onDeleteCareer(id); setDeletingId(null) }, 800)
    }
    const cancelHold = (id: string) => { clearInterval(holdTimers.current[id]); clearTimeout(holdTimeouts.current[id]); setHoldProgress(prev => ({ ...prev, [id]: 0 })) }

    const currentPrefs = profile?.preferences ? { ...DEFAULT_PREFERENCES, ...profile.preferences, notifications: { ...DEFAULT_PREFERENCES.notifications, ...profile.preferences.notifications } } : DEFAULT_PREFERENCES
    const notifsEnabled = currentPrefs.notifications?.enabled

    return (
        <header className="header">
            <span className="header__brand">
                Note<span className="accent">a</span>ble
            </span>

            {isAdmin && (
                <button
                    type="button"
                    className="btn btn--icon"
                    onClick={() => setShowAdmin(true)}
                    title="Mensajes de usuarios"
                    style={{ position: 'relative' }}
                >
                    <Mail size={12} color='currentColor' />
                </button>
            )}

            <div className="header__actions">
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                        if (!user) { onOpenAuth(); return }
                        onAddSubject()
                    }}
                >
                    <Add size={16} color="currentColor" />
                </button>
                <ThemeCycleButton themeOption={themeOption} onCycle={cycleTheme} />

                <div className="hdr-menu-wrap" ref={menuRef}>

                    <motion.button
                        className={`btn btn--icon hdr-hamburger${menuOpen ? ' active' : ''}`}
                        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); setMenuSection('main') }}
                        whileTap={isMobile ? { scale: 0.88 } : undefined}
                        title="Menú"
                    >
                        <HambergerMenu size={16} color="currentColor" />
                    </motion.button>

                    {showAdmin && (
                        <AdminMessagesPanel onClose={() => setShowAdmin(false)} />
                    )}

                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                className="hdr-menu"
                                variants={isMobile ? menuVariants : menuDesktopVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={e => e.stopPropagation()}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={menuSection}
                                        variants={isMobile ? sectionVariants : sectionDesktopVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        {menuSection === 'main' && (<>
                                            <button className="hdr-menu__item hdr-menu__item--account" onClick={() => setMenuSection('account')}>
                                                <span className="hdr-menu__avatar">{initials}</span>
                                                <div className="hdr-menu__account-info"><span className="hdr-menu__account-name">{displayName}</span><span className="hdr-menu__account-sub">{user ? user.email : 'No iniciaste sesión'}</span></div>
                                                <span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span>
                                            </button>
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => setMenuSection('career')}><span className="hdr-menu__item-icon"><Teacher size={14} color="currentColor" /></span><span className="hdr-menu__item-label">Carrera</span><span className="hdr-menu__item-value">{activeCareer?.name ?? '—'}</span><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button>
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => setMenuSection('datos')}><span className="hdr-menu__item-icon"><Cloud size={14} stroke="currentColor" /></span><span className="hdr-menu__item-label">Importar / Exportar</span><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button>
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => { onCloseSemester(); closeMenu() }}><span className="hdr-menu__item-icon"><Archive size={16} stroke="currentColor" /></span><span className="hdr-menu__item-label">Cerrar cuatrimestre</span></button>
                                            <div className="hdr-menu__divider" />
                                            {user && <button className="hdr-menu__item" onClick={() => setMenuSection('widget')}><span className="hdr-menu__item-icon"><NotionIcon size={14} /></span><span className="hdr-menu__item-label">Widget Notion</span><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button>}
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => setMenuSection('ver')}><span className="hdr-menu__item-icon"><ViewAgendal size={14} /></span><span className="hdr-menu__item-label">Calendario y vista</span><div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>{upcomingExam && <span className="hdr-menu__badge">{new Date(upcomingExam.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>}</div><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button>
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => setMenuSection('stats')}><span className="hdr-menu__item-icon"><Diagram size={14} color="currentColor" /></span><span className="hdr-menu__item-label">Estadísticas</span>{showGpa && <span className="hdr-menu__badge">GPA visible</span>}<span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button>
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => setMenuSection('preferences')}><span className="hdr-menu__item-icon"><Setting4 size={14} color="currentColor" /></span><span className="hdr-menu__item-label">Preferencias</span><div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>{notifsEnabled && <span className="hdr-menu__badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }}><Bell size={9} color="currentColor" style={{ display: 'inline', marginRight: 3, position: "relative", top: "1" }} />activo</span>}</div><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button>
                                            <div className="hdr-menu__divider" />
                                            <button className="hdr-menu__item" onClick={() => setMenuSection('support')}>
                                                <span className="hdr-menu__item-icon"><Headset size={14} color='currentColor' /></span>
                                                <span className="hdr-menu__item-label">Soporte</span>
                                                <span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span>
                                            </button>
                                        </>)}

                                        {menuSection === 'stats' && (<><button className="hdr-menu__back" onClick={() => setMenuSection('main')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><div className="hdr-menu__section-title">Estadísticas</div><button className={`hdr-menu__item${showGpa ? ' hdr-menu__item--active' : ''}`} onClick={() => { onToggleGpa(); closeMenu() }}><span className="hdr-menu__item-icon"><CharAverage size={14} stroke="currentColor" /></span><span className="hdr-menu__item-label">Promedio</span>{showGpa && <span className="hdr-menu__badge">visible</span>}</button><div className="hdr-menu__divider" /><button className="hdr-menu__item" onClick={() => { onOpenAnalytics(); closeMenu() }}><span className="hdr-menu__item-icon"><Chart size={14} color='currentColor' /></span><span className="hdr-menu__item-label">Analítica</span></button></>)}

                                        {menuSection === 'widget' && (<><button className="hdr-menu__back" onClick={() => setMenuSection('main')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><div className="hdr-menu__section-title">Widget Notion</div><p style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '0 4px 8px', lineHeight: 1.5 }}>Agrega tu progreso en cualquier página de Notion usando tu URL personal.</p><button className="hdr-menu__item" onClick={() => { onCopyWidget(); setCopied(true); setTimeout(() => setCopied(false), 2000) }}><span className="hdr-menu__item-icon">{copied ? <CopySuccess size={14} color='currentColor' /> : <Copy size={14} color='currentColor' />}</span><span className="hdr-menu__item-label">{copied ? '¡Copiado!' : 'Copiar URL del widget'}</span></button><button className="hdr-menu__item" onClick={() => setShowWidgetTutorial(true)}><span className="hdr-menu__item-icon"><MessageQuestion size={14} color="currentColor" /></span><span className="hdr-menu__item-label">¿Cómo funciona?</span></button>{showWidgetTutorial && <NotionWidgetTutorial userId={user?.id ?? ''} onClose={() => setShowWidgetTutorial(false)} />}</>)}

                                        {menuSection === 'account' && (<><button className="hdr-menu__back" onClick={() => setMenuSection('main')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><div className="hdr-menu__section-title">Cuenta</div>{user ? (<><div className="hdr-menu__profile-card"><div className="hdr-menu__avatar hdr-menu__avatar--lg">{initials}</div><div>{profile?.full_name && <div className="hdr-menu__profile-name">{profile.full_name}</div>}<div className="hdr-menu__profile-email">{user.email}</div>{profile?.university && <div className="hdr-menu__profile-uni">{profile.university}</div>}</div></div><div className="hdr-menu__divider" /><button className="hdr-menu__item" onClick={() => setMenuSection('edit-profile')}><span className="hdr-menu__item-icon"><Edit2 size={14} color="currentColor" /></span><span className="hdr-menu__item-label">Editar perfil</span><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button><div className="hdr-menu__divider" /><button className="hdr-menu__item hdr-menu__item--danger" onClick={() => { onSignOut(); closeMenu() }}><span className="hdr-menu__item-icon"><Logout size={16} color="var(--danger)" /></span><span className="hdr-menu__item-label" style={{ color: "var(--danger)" }}>Cerrar sesión</span></button></>) : (<><p className="hdr-menu__login-hint">Iniciá sesión para guardar tu progreso en la nube.</p><button className="hdr-menu__login-btn" onClick={() => { onOpenAuth(); closeMenu() }}>Iniciar sesión / Registrarse</button></>)}</>)}

                                        {menuSection === 'datos' && (<><button className="hdr-menu__back" onClick={() => setMenuSection('main')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><div className="hdr-menu__section-title">Importar / Exportar</div><button className="hdr-menu__item" onClick={() => { onImportSiu(); closeMenu() }}><span className="hdr-menu__item-icon"><CloudDown size={14} stroke="currentColor" /></span><span className="hdr-menu__item-label">Importar materias</span><span className="hdr-menu__badge">.xls</span></button><button className="hdr-menu__item" onClick={() => { onExportXls(); closeMenu() }}><span className="hdr-menu__item-icon"><CloudExport size={14} stroke="currentColor" style={{ transform: 'rotate(180deg)' }} /></span><span className="hdr-menu__item-label">Exportar materias</span><span className="hdr-menu__badge2">.xls</span></button><button className="hdr-menu__item" onClick={() => { onOpenScheduleExport(); closeMenu() }}><span className="hdr-menu__item-icon"><CalendarUp size={14} /></span><span className="hdr-menu__item-label">Exportar horario</span><span className="hdr-menu__badge">.png</span></button><div className="hdr-menu__divider" /></>)}

                                        {menuSection === 'ver' && (<><button className="hdr-menu__back" onClick={() => setMenuSection('main')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><div className="hdr-menu__section-title">Calendario y vista</div><button className="hdr-menu__item" onClick={() => { onOpenCalendar(); closeMenu() }}><span className="hdr-menu__item-icon"><CalIcon size={14} color="currentColor" /></span><span className="hdr-menu__item-label">Calendario</span>{upcomingExam && <span className="hdr-menu__badge">{new Date(upcomingExam.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>}</button><button className={`hdr-menu__item${compactView ? ' hdr-menu__item--active' : ''}`} onClick={() => { onToggleCompact(); closeMenu() }}><span className="hdr-menu__item-icon">{compactView ? <MaximizeCircle size={14} color="currentColor" /> : <MinusSquare size={14} color="currentColor" />}</span><span className="hdr-menu__item-label">{compactView ? 'Vista normal' : 'Vista compacta'}</span>{compactView && <span className="hdr-menu__badge">activa</span>}</button><button className={`hdr-menu__item${kanbanView ? ' hdr-menu__item--active' : ''}`} onClick={() => { onToggleKanban(); closeMenu() }}><span className="hdr-menu__item-icon"><svg width="14" height="14" viewBox="0 0 13 13" fill="none"><rect x="0.5" y="0.5" width="3.5" height="12" rx="1.5" fill="currentColor" opacity="0.9" /><rect x="4.75" y="0.5" width="3.5" height="8" rx="1.5" fill="currentColor" opacity="0.9" /><rect x="9" y="0.5" width="3.5" height="10" rx="1.5" fill="currentColor" opacity="0.9" /></svg></span><span className="hdr-menu__item-label">Vista Kanban</span>{kanbanView && <span className="hdr-menu__badge">activa</span>}</button>{upcomingExam && (<><div className="hdr-menu__divider" /><div className="hdr-menu__upcoming"><NotificationBing size={12} color="var(--accent2)" /><div><div className="hdr-menu__upcoming-title">{upcomingExam.title}</div><div className="hdr-menu__upcoming-date">{new Date(upcomingExam.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div></div></>)}</>)}

                                        {menuSection === 'edit-profile' && user && (<><button className="hdr-menu__back" onClick={() => setMenuSection('account')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><EditProfilePanel profile={profile} onUpdateProfile={onUpdateProfile} onUpdatePassword={onUpdatePassword} onDeleteAccount={onDeleteAccount} onClose={closeMenu} onSignOut={() => { onSignOut(); closeMenu() }} /></>)}

                                        {menuSection === 'preferences' && (
                                            <>
                                                <button className="hdr-menu__back" onClick={() => setMenuSection('main')}>
                                                    <ArrowLeft2 size={16} color='currentColor' /> Volver
                                                </button>
                                                {user
                                                    ? <PreferencesPanel
                                                        preferences={currentPrefs}
                                                        onSave={onUpdatePreferences}
                                                        userEmail={user.email}
                                                        notionToken={profile?.notion_token}
                                                        notionWorkspaceName={profile?.notion_workspace_name}
                                                        theme={theme}
                                                    />
                                                    : <div className="hdr-menu__section"><p className="hdr-menu__login-hint">Iniciá sesión para guardar tus preferencias.</p></div>
                                                }
                                            </>
                                        )}

                                        {menuSection === 'support' && (
                                            <>
                                                <button className="hdr-menu__back" onClick={() => setMenuSection('main')}>
                                                    <ArrowLeft2 size={16} color='currentColor' /> Volver
                                                </button>
                                                <div className="hdr-menu__section-title">Soporte</div>
                                                <button className="hdr-menu__item" onClick={() => { onOpenOnboarding(); closeMenu() }}>
                                                    <span className="hdr-menu__item-icon"><CircleQuestionMark size={14} color='currentColor' /></span>
                                                    <span className="hdr-menu__item-label">Ver tutorial</span>
                                                </button>
                                                <div className="hdr-desktop-only">
                                                    <div className="hdr-menu__divider hdr-desktop-only" />
                                                    <button className="hdr-menu__item hdr-desktop-only" onClick={() => { onOpenShortcuts(); closeMenu() }}>
                                                        <span className="hdr-menu__item-icon hdr-desktop-only"><Keyboard size={14} color="currentColor" className='hdr-desktop-only' /></span>
                                                        <span className="hdr-menu__item-label hdr-desktop-only">Atajos de teclado</span>
                                                        <span className="hdr-menu__item-value hdr-desktop-only" style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                                            <kbd className="header__search-kbd hdr-desktop-only">Shift</kbd>
                                                            <kbd className="header__search-kbd hdr-desktop-only">A</kbd>
                                                        </span>
                                                    </button>
                                                </div>
                                                <div className="hdr-menu__divider" />
                                                <button className="hdr-menu__item" onClick={() => setShowContact(true)}>
                                                    <span className="hdr-menu__item-icon">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                            <polyline points="22,6 12,13 2,6" />
                                                        </svg>
                                                    </span>
                                                    <span className="hdr-menu__item-label">Contacto / Feedback</span>
                                                </button>
                                                <div className="hdr-menu__divider" />
                                                <div className="hdr-menu__section-label" style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', padding: '6px 14px 2px' }}>
                                                    App
                                                </div>
                                                <div className="hdr-menu__item" style={{ cursor: 'default', pointerEvents: 'none', opacity: 0.5 }}>
                                                    <span className="hdr-menu__item-label" style={{ fontSize: '0.7rem' }}>Noteable · v1.0.0</span>
                                                </div>
                                            </>
                                        )}

                                        {menuSection === 'career' && (<><button className="hdr-menu__back" onClick={() => setMenuSection('main')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><div className="hdr-menu__section-title">Mis carreras</div>{careers.length === 0 && <p className="hdr-menu__login-hint">No tenés carreras todavía.</p>}{careers.map(c => (<div key={c.id} className={`hdr-menu__item hdr-menu__item--career${c.id === activeCareer?.id ? ' hdr-menu__item--active' : ''}`} onClick={() => { onSelectCareer(c.id); setMenuSection('main') }} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSelectCareer(c.id)}><span className="hdr-menu__item-label">{c.name}</span>{c.id === activeCareer?.id && <span className="hdr-menu__check"><TickSquare size={13} color={`var(--approved)`} style={{ position: "relative", top: "2" }} /></span>}<button className="hdr-menu__item-delete" onMouseDown={e => startHold(c.id, e)} onMouseUp={() => cancelHold(c.id)} onMouseLeave={() => cancelHold(c.id)} onTouchStart={e => startHold(c.id, e)} onTouchEnd={() => cancelHold(c.id)} disabled={deletingId === c.id} title="Mantené apretado para eliminar" style={{ position: 'relative', overflow: 'hidden' }}>{(holdProgress[c.id] ?? 0) > 0 && <span style={{ position: 'absolute', inset: 0, background: 'var(--danger-bg-hover)', width: `${holdProgress[c.id]}%`, transition: 'none', borderRadius: 'inherit' }} />}{deletingId === c.id ? <Loader size={13} color='currentColor' className='spin' /> : <TrashIcon size={13} color={holdProgress[c.id] > 0 ? 'var(--danger)' : 'var(--danger)'} />}</button></div>))}{activeCareer && (<><div className="hdr-menu__divider" /><button className="hdr-menu__item" onClick={() => setMenuSection('config')}><span className="hdr-menu__item-icon"><Setting2 size={14} color='currentColor' /></span><span className="hdr-menu__item-label">Configurar {activeCareer.name}</span><span className="hdr-menu__chevron"><ArrowRight2 size={12} color='currentColor' /></span></button></>)}<div className="hdr-menu__divider" /><div className="hdr-cfg__field"><label>Nueva carrera</label><div className="hdr-career__add-row"><input className="hdr-cfg__input" value={newCareerName} onChange={e => { setNewCareerName(e.target.value); setCareerError(null) }} placeholder="ej. Ingeniería en Sistemas" onKeyDown={e => e.key === 'Enter' && handleAddCareer()} maxLength={60} /><button className="btn btn--primary" onClick={handleAddCareer} disabled={addingCareer || !newCareerName.trim()}>{addingCareer ? <Loader size={14} color='currentColor' className='spin' /> : <Add size={14} color="currentColor" />}</button></div>{careerError && <div className="hdr-cfg__error">{careerError}</div>}</div></>)}

                                        {menuSection === 'config' && activeCareer && (<><button className="hdr-menu__back" onClick={() => setMenuSection('career')}><ArrowLeft2 size={16} color='currentColor' /> Volver</button><ProgConfigPanel career={activeCareer} onSave={onSaveCareerConfig} onClose={() => setMenuSection('career')} /></>)}

                                    </motion.div>
                                </AnimatePresence>
                                {showContact && (
                                    <ContactModal
                                        userEmail={user?.email}
                                        onClose={() => setShowContact(false)}
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    )
}