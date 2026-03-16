import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, MessageCircle, RefreshCw, Bug, Lightbulb, HelpCircle, MoreHorizontal, Instagram, Trash } from 'lucide-react'
import { supabase } from '../../supabase/Supabase'
import './AdminMessagesPanel.css'
import { Copy, CopySuccess } from 'iconsax-react'


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

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'hace un momento'
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

interface Props {
    onClose: () => void
}

export default function AdminMessagesPanel({ onClose }: Props) {
    const [visible, setVisible] = useState(false)
    const [messages, setMessages] = useState<ContactMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'bug' | 'suggestion' | 'question' | 'other'>('all')
    const [expanded, setExpanded] = useState<string | null>(null)
    const [search] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [deleteTimer, setDeleteTimer] = useState<number | null>(null)
    const [holdingDelete, setHoldingDelete] = useState<string | null>(null)

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10)
        return () => clearTimeout(t)
    }, [])


    const startDelete = (id: string) => {
        setHoldingDelete(id)

        const timer = setTimeout(() => {
            deleteMessage(id)
            setHoldingDelete(null)
        }, 900)

        setDeleteTimer(timer)
    }

    const cancelDelete = () => {
        if (deleteTimer) {
            clearTimeout(deleteTimer)
            setDeleteTimer(null)
        }

        setHoldingDelete(null)
    }



    const deleteMessage = async (id: string) => {
        await supabase
            .from('contact_messages')
            .delete()
            .eq('id', id)

        setMessages(prev => prev.filter(m => m.id !== id))
    }


    const resolveMessage = async (id: string) => {
        await supabase
            .from('contact_messages')
            .update({ status: 'resolved' })
            .eq('id', id)

        setMessages(prev =>
            prev.map(m =>
                m.id === id ? { ...m, status: 'resolved' } : m
            )
        )

        setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== id))
        }, 900)
    }


    useEffect(() => {
        const channel = supabase
            .channel('messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'contact_messages'
                },
                payload => {
                    setMessages(prev => [payload.new as ContactMessage, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])


    const fetchMessages = async () => {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from('contact_messages')
            .select('*')
            .order('status', { ascending: true })
            .order('created_at', { ascending: false })

        if (err) setError(err.message)
        else setMessages((data as ContactMessage[]) ?? [])
        setLoading(false)
    }

    useEffect(() => { fetchMessages() }, [])

    const handleClose = () => {
        setVisible(false)
        setTimeout(onClose, 280)
    }

    const filtered = messages
        .filter(m => filter === 'all' || m.type === filter)
        .filter(m =>
            m.message.toLowerCase().includes(search.toLowerCase()) ||
            m.user_email?.toLowerCase().includes(search.toLowerCase())
        )


    const copyContact = async (id: string, text: string) => {
        await navigator.clipboard.writeText(text)
        navigator.vibrate?.(40)
        setCopiedId(id)

        setTimeout(() => {
            setCopiedId(null)
        }, 1500)
    }





    const counts = {
        all: messages.length,
        bug: messages.filter(m => m.type === 'bug').length,
        suggestion: messages.filter(m => m.type === 'suggestion').length,
        question: messages.filter(m => m.type === 'question').length,
        other: messages.filter(m => m.type === 'other').length,
    }

    return createPortal(
        <>
            <div
                className={`adm-backdrop${visible ? ' adm-backdrop--visible' : ''}`}
                onClick={handleClose}
                data-menu-portal="true"
            />
            <div
                className={`adm-panel${visible ? ' adm-panel--visible' : ''}`}
                data-menu-portal="true"
            >
                <div className="adm-header">
                    <div className="adm-header__left">
                        <div className="adm-header__icon">
                            <Mail size={13} />
                        </div>
                        <div>
                            <div className="adm-header__title">Mensajes</div>
                            <div className="adm-header__sub">{messages.length} en total</div>
                        </div>
                    </div>
                    <div className="adm-header__actions">

                        <button className="adm-icon-btn" onClick={fetchMessages} title="Recargar">
                            <RefreshCw size={13} className={loading ? 'adm-spin' : ''} />
                        </button>
                        <button className="modal__close" onClick={handleClose}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="adm-filters">
                    {(['all', 'bug', 'suggestion', 'question', 'other'] as const).map(f => (
                        <button
                            key={f}
                            className={`adm-filter-btn${filter === f ? ' adm-filter-btn--active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Todos' : TYPE_META[f].label}
                            {counts[f] > 0 && (
                                <span className="adm-filter-count">{counts[f]}</span>
                            )}
                        </button>
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
                        <div className="adm-state">
                            <span>No hay mensajes{filter !== 'all' ? ' en esta categoría' : ''}.</span>
                        </div>
                    )}

                    {!loading && !error && filtered.map(msg => {
                        const typeMeta = TYPE_META[msg.type] ?? TYPE_META.other
                        const TypeIcon = typeMeta.icon
                        const reachMeta = REACH_META[msg.reach_by] ?? REACH_META.none
                        const ReachIcon = reachMeta.icon
                        const isExpanded = expanded === msg.id

                        return (
                            <div
                                key={msg.id}
                                className={`adm-msg 
    ${isExpanded ? 'adm-msg--expanded' : ''} 
    ${msg.status === 'resolved' ? 'adm-msg--resolved' : ''}
  `}
                                onClick={() => setExpanded(isExpanded ? null : msg.id)}
                            >
                                <div className="adm-msg__top">
                                    <span
                                        className="adm-msg__type-dot"
                                        style={{ background: typeMeta.color }}
                                    />
                                    <span className="adm-msg__type">
                                        <TypeIcon size={11} color={typeMeta.color} />
                                        {typeMeta.label}
                                    </span>
                                    <span className="adm-msg__time">{timeAgo(msg.created_at)}</span>
                                </div>

                                <p className={`adm-msg__text${isExpanded ? ' adm-msg__text--full' : ''}`}>
                                    {msg.message}
                                </p>

                                {isExpanded && (
                                    <div className="adm-msg__meta">
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
                                                <button
                                                    className="adm-action-btn adm-action-btn--copy"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        copyContact(msg.id, msg.contact_value!)
                                                    }}
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <CopySuccess size={12} color='currentColor' />
                                                            Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} color='currentColor' />
                                                            Copiar
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {msg.status !== 'resolved' && (
                                                <button
                                                    className="adm-action-btn adm-action-btn--resolve"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        resolveMessage(msg.id)
                                                    }}
                                                >
                                                    Resolver
                                                </button>
                                            )}

                                            <button
                                                className={`adm-action-btn adm-action-btn--delete ${holdingDelete === msg.id ? 'adm-action-btn--holding' : ''
                                                    }`}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation()
                                                    startDelete(msg.id)
                                                }}
                                                onMouseUp={cancelDelete}
                                                onMouseLeave={cancelDelete}
                                                onTouchStart={(e) => {
                                                    e.stopPropagation()
                                                    startDelete(msg.id)
                                                }}
                                                onTouchEnd={cancelDelete}
                                            >
                                                <Trash size={12} color='currentColor' />
                                            </button>


                                        </div>



                                        {msg.reach_by === 'none' && (
                                            <div className="adm-msg__meta-row adm-msg__meta-row--muted">
                                                <span>No pidió respuesta</span>
                                            </div>
                                        )}
                                        <div className="adm-msg__meta-row adm-msg__meta-row--muted">
                                            <span>{new Date(msg.created_at).toLocaleString('es-AR')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </>,
        document.body
    )
}