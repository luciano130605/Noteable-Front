import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, CheckCircle, Loader, Bug, CircleQuestionMark, Mail, MessageCircle } from 'lucide-react'
import './Contactmodal.css'
import { Instagram, LampOn } from 'iconsax-react'
import { supabase } from '../../supabase/Supabase'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useScrollLock } from '../hooks/Usescrolllock'

interface Props {
    userEmail?: string
    onClose: () => void
}

const isMobile = window.innerWidth <= 768

const CONTACT_OPTIONS = [
    { id: 'bug', label: 'Encontré un bug', icon: Bug, placeholder: 'Describí qué pasó y cómo reproducirlo...' },
    { id: 'suggestion', label: 'Tengo una sugerencia', icon: LampOn, placeholder: 'Contame qué mejorarías o qué feature te gustaría ver...' },
    { id: 'question', label: 'Tengo una pregunta', icon: CircleQuestionMark, placeholder: 'Escribí tu consulta, te respondo lo antes posible...' },
    { id: 'other', label: 'Otro', icon: null, placeholder: 'Escribí lo que necesites...' }
]

const REACH_OPTIONS = [
    { id: 'email', label: 'Email', icon: Mail, inputType: 'email' as const, placeholder: 'tu@email.com', hint: 'Te respondo por correo' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, inputType: 'tel' as const, placeholder: '11 1234-5678', hint: 'Te mando un mensaje por WhatsApp' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, inputType: 'text' as const, placeholder: '@tu_usuario', hint: 'Te escribo por DM en Instagram' },
    { id: 'none', label: 'No hace falta', icon: null, inputType: null, placeholder: null, hint: null }
]


const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
}

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 280 } },
    exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } },
}

const modalDesktopVariants: Variants = {
    hidden: { opacity: 1, scale: 1, y: 0 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
}

const sentVariants: Variants = {
    hidden: { opacity: 0, y: isMobile ? 14 : 0 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 22, stiffness: 300 } },
    exit: { opacity: 0, y: isMobile ? -10 : 0, transition: { duration: 0.14 } },
}

const chipVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' },
    }),
}

const chipDesktopVariants: Variants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 },
}

const inputWrapVariants: Variants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { opacity: 1, height: 'auto', marginTop: 8, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.16, ease: 'easeIn' } },
}

export default function ContactModal({ userEmail, onClose }: Props) {
    const [open, setOpen] = useState(true)
    const [type, setType] = useState('question')
    const [message, setMessage] = useState('')
    const [reachBy, setReachBy] = useState('email')
    const [contactValue, setContactValue] = useState(userEmail ?? '')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    useScrollLock(open)

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleClose = () => setOpen(false)

    const handleReachChange = (id: string) => {
        setReachBy(id)
        if (id === 'email' && !contactValue) {
            setContactValue(userEmail ?? '')
        } else if (id !== 'email' && contactValue === (userEmail ?? '') && id !== 'none') {
            setContactValue('')
        }
    }

    const selectedType = CONTACT_OPTIONS.find(o => o.id === type) ?? CONTACT_OPTIONS[0]
    const selectedReach = REACH_OPTIONS.find(o => o.id === reachBy) ?? REACH_OPTIONS[0]
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
        if (error) { console.error(error); return }
        setSent(true)
    }

    const canSend = message.trim().length > 0 && (!needsContact || contactValue.trim().length > 0)

    return createPortal(
        <AnimatePresence onExitComplete={onClose}>
            {open && (
                <>
                    <motion.div
                        className="cm-backdrop"
                        variants={isMobile ? backdropVariants : undefined}
                        initial={isMobile ? "hidden" : false}
                        animate={isMobile ? "visible" : undefined}
                        exit={isMobile ? "exit" : undefined}
                        transition={{ duration: 0.2 }}
                        onClick={handleClose}
                        data-menu-portal="true"
                    />

                    <motion.div
                        className="cm-modal"
                        variants={isMobile ? modalVariants : modalDesktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        data-menu-portal="true"
                    >
                        <div className="cm-header">
                            <div className="cm-header__left">
                                <div className="cm-header__icon">
                                    <Mail size={12} color='currentColor' />
                                </div>
                                <span className="cm-header__title">Contacto</span>
                            </div>

                            <motion.button
                                className="cm-close"
                                onClick={handleClose}
                                whileHover={isMobile ? { scale: 1.1 } : undefined}
                                whileTap={isMobile ? { scale: 0.9 } : undefined}
                            >
                                <X size={14} />
                            </motion.button>
                        </div>

                        <AnimatePresence mode="wait">
                            {sent ? (
                                <motion.div
                                    key="sent"
                                    className="cm-sent"
                                    variants={sentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <motion.div
                                        className="cm-sent__icon"
                                        initial={isMobile ? { scale: 0.5, opacity: 0 } : false}
                                        animate={isMobile ? { scale: 1, opacity: 1 } : undefined}
                                        transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 0.08 }}
                                    >
                                        <CheckCircle size={32} strokeWidth={1.5} />
                                    </motion.div>

                                    <div className="cm-sent__title">¡Mensaje enviado!</div>

                                    <div className="cm-sent__sub">
                                        {reachBy !== 'none'
                                            ? `Te voy a responder por ${selectedReach.label.toLowerCase()}.`
                                            : 'Gracias por tu mensaje.'}
                                    </div>

                                    <button className="cm-btn-primary" onClick={handleClose}>
                                        Cerrar
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    className="cm-body"
                                    variants={sentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div className="cm-field">
                                        <label className="cm-label">¿Sobre qué es?</label>
                                        <div className="cm-chips">
                                            {CONTACT_OPTIONS.map((opt, i) => {
                                                const Icon = opt.icon
                                                return (
                                                    <motion.button
                                                        key={opt.id}
                                                        type="button"
                                                        className={`cm-chip${type === opt.id ? ' cm-chip--active' : ''}`}
                                                        onClick={() => setType(opt.id)}
                                                        variants={isMobile ? chipVariants : chipDesktopVariants}
                                                        custom={i}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileTap={isMobile ? { scale: 0.95 } : undefined}
                                                    >
                                                        {Icon && <Icon size={12} color="currentColor" style={{ position: 'relative', right: 3 }} />}
                                                        {opt.label}
                                                    </motion.button>
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
                                        <span className="cm-char-count">{message.length}/1000</span>
                                    </div>

                                    <div className="cm-field">
                                        <label className="cm-label">¿Querés que te responda?</label>
                                        <div className="cm-reach-grid">
                                            {REACH_OPTIONS.map((opt, i) => (
                                                <motion.button
                                                    key={opt.id}
                                                    type="button"
                                                    className={`cm-reach-btn${reachBy === opt.id ? ' cm-reach-btn--active' : ''}`}
                                                    onClick={() => handleReachChange(opt.id)}
                                                    variants={isMobile ? chipVariants : chipDesktopVariants}
                                                    custom={i}
                                                    initial="hidden"
                                                    animate="visible"
                                                    whileTap={isMobile ? { scale: 0.95 } : undefined}
                                                >
                                                    <span className="cm-reach-btn__label">{opt.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>

                                        <AnimatePresence>
                                            {needsContact && selectedReach.inputType && (
                                                <motion.div
                                                    className="cm-contact-input-wrap"
                                                    variants={inputWrapVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div className="cm-contact-input-inner">
                                                        <input
                                                            className="cm-input cm-input--with-icon"
                                                            type={selectedReach.inputType}
                                                            placeholder={selectedReach.placeholder ?? ''}
                                                            value={contactValue}
                                                            onChange={e => setContactValue(e.target.value)}
                                                            autoComplete={
                                                                reachBy === 'email' ? 'email'
                                                                    : reachBy === 'whatsapp' ? 'tel'
                                                                        : 'off'
                                                            }
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="cm-footer">
                                        <motion.button
                                            className="btn btn--primary btnCompleto"
                                            onClick={handleSend}
                                            disabled={!canSend || sending}
                                            whileTap={isMobile && canSend && !sending ? { scale: 0.97 } : undefined}
                                        >
                                            {sending ? <Loader size={13} className="cm-spin" /> : <Send size={13} />}
                                            {sending ? 'Enviando...' : 'Enviar'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}