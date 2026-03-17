import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './ClassReminderBubble.css'
import type { ActiveClass } from '../hooks/useClassReminder'
import { Video } from 'iconsax-react'

interface Props {
    activeClass: ActiveClass
}

export default function ClassReminderBubble({ activeClass }: Props) {
    const [dismissed, setDismissed] = useState(false)

    const { subject, schedule, minutesUntil, isOngoing } = activeClass
    const link = subject.zoomLink || (subject as any)?.aulaVirtualLink || ''

    const label = isOngoing
        ? 'La clase empezó'
        : `Clase en ${minutesUntil} min`

    return (
        <AnimatePresence>
            {!dismissed && (
                <motion.div
                    className={`crb ${isOngoing ? 'crb--ongoing' : 'crb--soon'}`}
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{
                        opacity: 1, y: 0, scale: 1,
                        transition: { type: 'spring' as const, damping: 22, stiffness: 300 }
                    }}
                    exit={{
                        opacity: 0, y: 16, scale: 0.93,
                        transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] as const }
                    }}
                >
                    <div className="crb__icon">
                        <Video size={12} color='var(--accent)' />
                    </div>

                    <div className="crb__info">
                        <span className="crb__label">{label}</span>
                        <span className="crb__name">{subject.name}</span>
                        {schedule.location && (
                            <span className="crb__loc">{schedule.location}</span>
                        )}
                    </div>

                    <div className="crb__actions">
                        {isOngoing && link && (
                            <motion.a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="crb__join crb__join--pulse"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Unirme
                            </motion.a>
                        )}

                        <motion.button
                            className="crb__dismiss"
                            onClick={() => setDismissed(true)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            ×
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}