import { useState } from 'react'
import './ClassReminderBubble.css'
import type { ActiveClass } from '../hooks/useClassReminder'
import { Video } from 'iconsax-react'

interface Props {
    activeClass: ActiveClass
}

export default function ClassReminderBubble({ activeClass }: Props) {
    const [dismissed, setDismissed] = useState(false)
    if (dismissed) return null

    const { subject, schedule, minutesUntil, isOngoing } = activeClass
    const link = subject.zoomLink || (subject as any)?.aulaVirtualLink || ''
    const isZoom = !!subject.zoomLink

    const label = isOngoing
        ? 'La clase empezó'
        : `Clase en ${minutesUntil} min`

    return (
        <div className={`crb ${isOngoing ? 'crb--ongoing' : 'crb--soon'}`}>
            <div className="crb__icon">
                {isZoom ? (
                    <Video size={12} color='var(--accent)' />
                ) : (
                    <Video size={12} color='var(--accent)' />
                )}
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
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crb__join crb__join--pulse"
                    >
                        Unirme
                    </a>
                )}

                <button
                    className="crb__dismiss"
                    onClick={() => setDismissed(true)}
                >
                    ×
                </button>
            </div>
        </div>
    )
}