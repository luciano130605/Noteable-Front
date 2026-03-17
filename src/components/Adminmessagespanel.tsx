import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, Mail, MessageCircle, RefreshCw, Bug, Lightbulb, HelpCircle, MoreHorizontal, Instagram, Trash } from 'lucide-react'
import { supabase } from '../../supabase/Supabase'
import './Adminmessagespanel.css'
import { Copy, CopySuccess } from 'iconsax-react'
import { useScrollLock } from '../hooks/Usescrolllock'

interface ContactMessage {
    id: string
    created_at: string
    type: 'bug' | 'suggestion' | 'question' | 'other'
    message: string
    reach_by: 'email' | 'whatsapp' | 'instagram' | 'none'
    contact_value: string | null
    user_email: string | null
    status: 'open' | 'resolved'
}

const TYPE_META = {
    bug: { label: 'Bug', icon: Bug, color: '#f87171' },
    suggestion: { label: 'Sugerencia', icon: Lightbulb, color: '#fbbf24' },
    question: { label: 'Pregunta', icon: HelpCircle, color: '#60a5fa' },
    other: { label: 'Otro', icon: MoreHorizontal, color: '#a78bfa' },
}

const REACH_META = {
    email: { label: 'Email', icon: Mail },
    whatsapp: { label: 'WhatsApp', icon: MessageCircle },
    instagram: { label: 'Instagram', icon: Instagram },
    none: { label: 'Sin respuesta', icon: null },
}

const isMobile = window.innerWidth <= 768

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'hace un momento'
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

interface Props { onClose: () => void }

const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const panelVariants: Variants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring', damping: 28, stiffness: 280 } },
    exit: { x: '100%', transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const } },
}

const panelMobileVariants: Variants = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { type: 'spring', damping: 28, stiffness: 280 } },
    exit: { y: '100%', transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const } },
}

const msgVariants: Variants = {
    hidden: { opacity: 0, y: 8, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.95, x: 24, transition: { duration: 0.18 } },
}

const metaVariants: Variants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
}


const MessageCard = memo(function MessageCard({
    msg,
    isExpanded,
    copiedId,
    holdingDelete,
    onToggle,
    onCopy,
    onResolve,
    onDeleteStart,
    onDeleteCancel,
}: {
    msg: ContactMessage
    isExpanded: boolean
    copiedId: string | null
    holdingDelete: string | null
    onToggle: (id: string) => void
    onCopy: (id: string, value: string) => void
    onResolve: (id: string) => void
    onDeleteStart: (id: string) => void
    onDeleteCancel: () => void
}) {
    const typeMeta = TYPE_META[msg.type] ?? TYPE_META.other
    const TypeIcon = typeMeta.icon
    const reachMeta = REACH_META[msg.reach_by] ?? REACH_META.none
    const ReachIcon = reachMeta.icon

    return (
        <motion.div
            key={msg.id}
            className={`adm-msg${isExpanded ? ' adm-msg--expanded' : ''}${msg.status === 'resolved' ? ' adm-msg--resolved' : ''}`}
            variants={msgVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.18 }}
            layout
            onClick={() => onToggle(msg.id)}
            whileTap={{ scale: 0.985 }}
        >
            <div className="adm-msg__top">
                <span className="adm-msg__type-dot" style={{ background: typeMeta.color }} />
                <span className="adm-msg__type">
                    <TypeIcon size={11} color={typeMeta.color} />
                    {typeMeta.label}
                </span>
                <span className="adm-msg__time">{timeAgo(msg.created_at)}</span>
            </div>

            <p className={`adm-msg__text${isExpanded ? ' adm-msg__text--full' : ''}`}>
                {msg.message}
            </p>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="adm-msg__meta"
                        variants={metaVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {msg.user_email && (
                            <div className="adm-msg__meta-row">
                                <Mail size={11} />
                                <span>{msg.user_email}</span>
                            </div>
                        )}
                        {msg.reach_by !== 'none' && msg.contact_value && (
                            <div className="adm-msg__meta-row">
                                {ReachIcon && <ReachIcon size={11} />}
                                <span>{reachMeta.label}: <strong>{msg.contact_value}</strong></span>
                            </div>
                        )}

                        <div className="adm-msg__actions">
                            {msg.contact_value && (
                                <motion.button
                                    className="adm-action-btn adm-action-btn--copy"
                                    onClick={e => { e.stopPropagation(); onCopy(msg.id, msg.contact_value!) }}
                                    whileTap={{ scale: 0.92 }}
                                >
                                    <AnimatePresence mode="wait">
                                        {copiedId === msg.id ? (
                                            <motion.span
                                                key="copied"
                                                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                            >
                                                <CopySuccess size={12} color="currentColor" /> Copiado
                                            </motion.span>
                                        ) : (
                                            <motion.span
                                                key="copy"
                                                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                            >
                                                <Copy size={12} color="currentColor" /> Copiar
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            )}

                            {msg.status !== 'resolved' && (
                                <motion.button
                                    className="adm-action-btn adm-action-btn--resolve"
                                    onClick={e => { e.stopPropagation(); onResolve(msg.id) }}
                                    whileTap={{ scale: 0.92 }}
                                >
                                    Resolver
                                </motion.button>
                            )}

                            <motion.button
                                className={`adm-action-btn adm-action-btn--delete${holdingDelete === msg.id ? ' adm-action-btn--holding' : ''}`}
                                onMouseDown={e => { e.stopPropagation(); onDeleteStart(msg.id) }}
                                onMouseUp={cancelDeleteNoop}
                                onMouseLeave={onDeleteCancel}
                                onTouchStart={e => { e.stopPropagation(); onDeleteStart(msg.id) }}
                                onTouchEnd={onDeleteCancel}
                                whileTap={{ scale: 0.88 }}
                            >
                                <Trash size={12} color="currentColor" />
                            </motion.button>
                        </div>

                        {msg.reach_by === 'none' && (
                            <div className="adm-msg__meta-row adm-msg__meta-row--muted">
                                <span>No pidió respuesta</span>
                            </div>
                        )}
                        <div className="adm-msg__meta-row adm-msg__meta-row--muted">
                            <span>{new Date(msg.created_at).toLocaleString('es-AR')}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
})

const cancelDeleteNoop = () => { }

export default function AdminMessagesPanel({ onClose }: Props) {
    const [open, setOpen] = useState(true)
    const [messages, setMessages] = useState<ContactMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'bug' | 'suggestion' | 'question' | 'other'>('all')
    const [expanded, setExpanded] = useState<string | null>(null)
    const [search] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [_deleteTimer, setDeleteTimer] = useState<number | null>(null)
    const [holdingDelete, setHoldingDelete] = useState<string | null>(null)

    useScrollLock(open)

    const handleClose = useCallback(() => setOpen(false), [])

    const handleToggle = useCallback((id: string) => {
        setExpanded(prev => prev === id ? null : id)
    }, [])

    const cancelDelete = useCallback(() => {
        setDeleteTimer(prev => { if (prev) clearTimeout(prev); return null })
        setHoldingDelete(null)
    }, [])

    const deleteMessage = useCallback(async (id: string) => {
        await supabase.from('contact_messages').delete().eq('id', id)
        setMessages(prev => prev.filter(m => m.id !== id))
    }, [])

    const startDelete = useCallback((id: string) => {
        setHoldingDelete(id)
        const timer = setTimeout(() => { deleteMessage(id); setHoldingDelete(null) }, 900)
        setDeleteTimer(timer as unknown as number)
    }, [deleteMessage])

    const resolveMessage = useCallback(async (id: string) => {
        await supabase.from('contact_messages').update({ status: 'resolved' }).eq('id', id)
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m))
        setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 600)
    }, [])

    const copyContact = useCallback(async (id: string, text: string) => {
        await navigator.clipboard.writeText(text)
        navigator.vibrate?.(40)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
    }, [])

    useEffect(() => {
        const channel = supabase
            .channel('messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' },
                payload => setMessages(prev => [payload.new as ContactMessage, ...prev]))
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchMessages = useCallback(async () => {
        setLoading(true); setError(null)
        const { data, error: err } = await supabase
            .from('contact_messages').select('*')
            .order('status', { ascending: true })
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setMessages((data as ContactMessage[]) ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchMessages() }, [fetchMessages])

    const counts = useMemo(() => ({
        all: messages.length,
        bug: messages.filter(m => m.type === 'bug').length,
        suggestion: messages.filter(m => m.type === 'suggestion').length,
        question: messages.filter(m => m.type === 'question').length,
        other: messages.filter(m => m.type === 'other').length,
    }), [messages])

    const filtered = useMemo(() =>
        messages
            .filter(m => filter === 'all' || m.type === filter)
            .filter(m =>
                m.message.toLowerCase().includes(search.toLowerCase()) ||
                m.user_email?.toLowerCase().includes(search.toLowerCase())
            ),
        [messages, filter, search]
    )

    return createPortal(
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <>
                    <motion.div
                        key="backdrop"
                        className="adm-backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.22 }}
                        onClick={handleClose}
                        data-menu-portal="true"
                    />

                    <motion.div
                        key="panel"
                        className="adm-panel"
                        variants={isMobile ? panelMobileVariants : panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        data-menu-portal="true"
                    >
                        <div className="adm-header">
                            <div className="adm-header__left">
                                <motion.div
                                    className="adm-header__icon"
                                    initial={{ scale: 0.7, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.12, type: 'spring', stiffness: 300 }}
                                >
                                    <Mail size={13} />
                                </motion.div>
                                <div>
                                    <div className="adm-header__title">Mensajes</div>
                                    <div className="adm-header__sub">{messages.length} en total</div>
                                </div>
                            </div>
                            <div className="adm-header__actions">
                                <motion.button
                                    className="adm-icon-btn"
                                    onClick={fetchMessages}
                                    title="Recargar"
                                    whileTap={{ rotate: 180, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <RefreshCw size={13} className={loading ? 'adm-spin' : ''} />
                                </motion.button>
                                <motion.button
                                    className="modal__close"
                                    onClick={handleClose}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X size={14} />
                                </motion.button>
                            </div>
                        </div>

                        <div className="adm-filters">
                            {(['all', 'bug', 'suggestion', 'question', 'other'] as const).map(f => (
                                <motion.button
                                    key={f}
                                    className={`adm-filter-btn${filter === f ? ' adm-filter-btn--active' : ''}`}
                                    onClick={() => setFilter(f)}
                                    whileTap={{ scale: 0.93 }}
                                >
                                    {f === 'all' ? 'Todos' : TYPE_META[f].label}
                                    {counts[f] > 0 && (
                                        <motion.span
                                            className="adm-filter-count"
                                            key={counts[f]}
                                            initial={{ scale: 1.4 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 400 }}
                                        >
                                            {counts[f]}
                                        </motion.span>
                                    )}
                                </motion.button>
                            ))}
                        </div>

                        <div className="adm-body">
                            {loading && (
                                <div className="adm-state">
                                    <div className="adm-loader" />
                                    <span>Cargando mensajes...</span>
                                </div>
                            )}

                            {!loading && error && (
                                <div className="adm-state adm-state--error">
                                    <span>Error: {error}</span>
                                    <button className="adm-retry" onClick={fetchMessages}>Reintentar</button>
                                </div>
                            )}

                            {!loading && !error && filtered.length === 0 && (
                                <motion.div
                                    className="adm-state"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <span>No hay mensajes{filter !== 'all' ? ' en esta categoría' : ''}.</span>
                                </motion.div>
                            )}


                            <AnimatePresence mode="popLayout">
                                {!loading && !error && filtered.map(msg => (
                                    <MessageCard
                                        key={msg.id}
                                        msg={msg}
                                        isExpanded={expanded === msg.id}
                                        copiedId={copiedId}
                                        holdingDelete={holdingDelete}
                                        onToggle={handleToggle}
                                        onCopy={copyContact}
                                        onResolve={resolveMessage}
                                        onDeleteStart={startDelete}
                                        onDeleteCancel={cancelDelete}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}