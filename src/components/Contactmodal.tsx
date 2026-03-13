import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, CheckCircle, Loader, Bug, CircleQuestionMark, Mail, MessageCircle } from 'lucide-react'
import './ContactModal.css'
import { Instagram, LampOn } from 'iconsax-react'
import { supabase } from '../../supabase/Supabase'



interface Props {
    userEmail?: string
    onClose: () => void
}

const CONTACT_OPTIONS = [
    {
        id: 'bug',
        label: 'Encontré un bug',
        icon: Bug,
        placeholder: 'Describí qué pasó y cómo reproducirlo...'
    },
    {
        id: 'suggestion',
        label: 'Tengo una sugerencia',
        icon: LampOn,
        placeholder: 'Contame qué mejorarías o qué feature te gustaría ver...'
    },
    {
        id: 'question',
        label: 'Tengo una pregunta',
        icon: CircleQuestionMark,
        placeholder: 'Escribí tu consulta, te respondo lo antes posible...'
    },
    {
        id: 'other',
        label: 'Otro',
        icon: null,
        placeholder: 'Escribí lo que necesites...'
    }
]

const REACH_OPTIONS = [
    {
        id: 'email',
        label: 'Email',
        icon: Mail,
        inputType: 'email' as const,
        placeholder: 'tu@email.com',
        hint: 'Te respondo por correo'
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: MessageCircle,
        inputType: 'tel' as const,
        placeholder: '11 1234-5678',
        hint: 'Te mando un mensaje por WhatsApp'
    },
    {
        id: 'instagram',
        label: 'Instagram',
        icon: Instagram,
        inputType: 'text' as const,
        placeholder: '@tu_usuario',
        hint: 'Te escribo por DM en Instagram'
    },
    {
        id: 'none',
        label: 'No hace falta',
        icon: null,
        inputType: null,
        placeholder: null,
        hint: null
    }
]

export default function ContactModal({ userEmail, onClose }: Props) {
    const [visible, setVisible] = useState(false)
    const [type, setType] = useState('question')
    const [message, setMessage] = useState('')
    const [reachBy, setReachBy] = useState('email')
    const [contactValue, setContactValue] = useState(userEmail ?? '')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10)
        return () => clearTimeout(t)
    }, [])

    const handleClose = () => {
        setVisible(false)
        setTimeout(onClose, 240)
    }

    const handleReachChange = (id: string) => {
        setReachBy(id)

        if (id === 'email' && !contactValue) {
            setContactValue(userEmail ?? '')
        } else if (id !== 'email' && contactValue === (userEmail ?? '') && id !== 'none') {
            setContactValue('')
        }
    }

    const selectedType =
        CONTACT_OPTIONS.find(o => o.id === type) ?? CONTACT_OPTIONS[0]

    const selectedReach =
        REACH_OPTIONS.find(o => o.id === reachBy) ?? REACH_OPTIONS[0]

    const needsContact = reachBy !== 'none'


    const handleSend = async () => {
        if (!message.trim()) return
        setSending(true)

        const { error } = await supabase
            .from('contact_messages')
            .insert({
                type,
                message: message.trim(),
                reach_by: reachBy,
                contact_value: needsContact ? contactValue.trim() : null,
                user_email: userEmail ?? null,
            })

        setSending(false)

        if (error) {
            console.error(error)
            // opcionalmente mostrar error al usuario
            return
        }

        setSent(true)
    }

    const canSend =
        message.trim().length > 0 &&
        (!needsContact || contactValue.trim().length > 0)


    return createPortal(
        <>
            <div
                className={`cm-backdrop${visible ? ' cm-backdrop--visible' : ''}`}
                onClick={handleClose}
                data-menu-portal="true"
            />

            <div
                className={`cm-modal${visible ? ' cm-modal--visible' : ''}`}
                data-menu-portal="true"
            >
                <div className="cm-header">
                    <div className="cm-header__left">
                        <div className="cm-header__icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        </div>
                        <span className="cm-header__title">Contacto</span>
                    </div>

                    <button className="cm-close" onClick={handleClose}>
                        <X size={14} />
                    </button>
                </div>

                {sent ? (
                    <div className="cm-sent">
                        <div className="cm-sent__icon">
                            <CheckCircle size={32} strokeWidth={1.5} />
                        </div>

                        <div className="cm-sent__title">¡Mensaje enviado!</div>

                        <div className="cm-sent__sub">
                            {reachBy !== 'none'
                                ? `Te voy a responder por ${selectedReach.label.toLowerCase()}.`
                                : 'Gracias por tu mensaje.'}
                        </div>

                        <button className="cm-btn-primary" onClick={handleClose}>
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <div className="cm-body">

                        <div className="cm-field">
                            <label className="cm-label">¿Sobre qué es?</label>

                            <div className="cm-chips">
                                {CONTACT_OPTIONS.map(opt => {
                                    const Icon = opt.icon

                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`cm-chip${type === opt.id ? ' cm-chip--active' : ''}`}
                                            onClick={() => setType(opt.id)}
                                        >
                                            {Icon && (
                                                <Icon
                                                    size={12}
                                                    color="currentColor"
                                                    style={{ position: "relative", right: 3 }}
                                                />
                                            )}
                                            {opt.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="cm-field">
                            <label className="cm-label">Tu mensaje</label>

                            <textarea
                                ref={textareaRef}
                                className="cm-textarea"
                                placeholder={selectedType.placeholder}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                rows={4}
                                maxLength={1000}
                            />

                            <span className="cm-char-count">
                                {message.length}/1000
                            </span>
                        </div>

                        <div className="cm-field">
                            <label className="cm-label">¿Querés que te responda?</label>



                            <div className="cm-reach-grid">
                                {REACH_OPTIONS.map(opt => {

                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`cm-reach-btn${reachBy === opt.id ? ' cm-reach-btn--active' : ''}`}
                                            onClick={() => handleReachChange(opt.id)}
                                        >


                                            <span className="cm-reach-btn__label">
                                                {opt.label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            {needsContact && selectedReach.inputType && (
                                <div className="cm-contact-input-wrap">
                                    <div className="cm-contact-input-inner">



                                        <input
                                            className="cm-input cm-input--with-icon"
                                            type={selectedReach.inputType}
                                            placeholder={selectedReach.placeholder ?? ''}
                                            value={contactValue}
                                            onChange={e => setContactValue(e.target.value)}
                                            autoComplete={
                                                reachBy === 'email'
                                                    ? 'email'
                                                    : reachBy === 'whatsapp'
                                                        ? 'tel'
                                                        : 'off'
                                            }
                                        />
                                    </div>


                                </div>
                            )}
                        </div>

                        <div className="cm-footer">
                            <button
                                className="btn btn--primary btnCompleto"
                                onClick={handleSend}
                                disabled={!canSend || sending}
                            >
                                {sending
                                    ? <Loader size={13} className="cm-spin" />
                                    : <Send size={13} />
                                }

                                {sending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </>,
        document.body
    )
}