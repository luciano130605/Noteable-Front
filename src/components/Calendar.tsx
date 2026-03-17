import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import EventModal, { type CalendarEvent } from './Eventmodal'
import MapModal from './Mapmodal'
import './Calendar.css'
import { AddCircle, ArrowCircleLeft, ArrowCircleRight, CalendarCircle, CloseCircle, Edit, Location } from 'iconsax-react'
import { useLongPress } from '../hooks/UseLongPress'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

interface CalendarProps {
  events?: CalendarEvent[]
  onAddEvent?: (event: CalendarEvent) => void
  onRemoveEvent?: (date: string, title: string) => void
  onUpdateEvent?: (oldEv: CalendarEvent, newEv: CalendarEvent) => void
  onEditSubject?: (subjectId: string) => void
  universityLocation?: string
}

export interface CalendarHandle {
  navigateTo: (date: string) => void
}

interface ContextMenu {
  x: number
  y: number
  date: string
  event?: CalendarEvent
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const IMPORTANCE_COLORS: Record<string, string> = {
  baja: '#10b981',
  media: '#f59e0b',
  alta: '#ef4444',
  critica: '#ec4899',
}

function EventPill({
  ev,
  isPast,
  gradeColor,
  onDetail,
  onContext,
  onContextHandled,
}: {
  ev: CalendarEvent
  isPast: boolean
  gradeColor: string | null
  onDetail: () => void
  onEdit: () => void
  onContext: (e: React.MouseEvent) => void
  onContextHandled: () => void
}) {
  const lp = useLongPress(
    () => onContext({ clientX: window.innerWidth / 2, clientY: window.innerHeight * 0.65 } as React.MouseEvent),
    () => onDetail(),
    400
  )

  return (
    <div
      className={`cal-event-pill${ev.graded ? ' cal-event-pill--graded' : ''}`}
      style={{
        opacity: isPast ? 0.6 : 1,
        borderLeft: `3px solid ${ev.importance ? IMPORTANCE_COLORS[ev.importance] : '#6b7280'}`,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      title={ev.title + (ev.startTime ? ` · ${ev.startTime}` : '') + (ev.grade != null ? ` · Nota: ${ev.grade}` : '')}
      {...lp}
      onTouchStart={(e) => {
        e.stopPropagation()
        lp.onTouchStart?.(e)
      }}
      onContextMenu={e => {
        e.preventDefault(); onContextHandled(); onContext(e);
      }}
    >
      {!ev.allDay && ev.startTime && <span className="cal-event-time">{ev.startTime}</span>}
      <span style={{ textDecoration: (ev.graded || isPast) ? 'line-through' : 'none' }}>{ev.title}</span>
      {ev.graded && ev.grade != null && (
        <span className="cal-event-grade" style={{ color: gradeColor ?? '#888', background: (gradeColor ?? '#888') + '22' }}>
          {ev.grade}
        </span>
      )}
    </div>
  )
}

function DayCell({
  dateStr,
  d,
  dayEvents,
  todayCell,
  openContextMenu,
  openNewEvent,
  openEventDetail,
  openEditEvent,
  isPastEvent,
  contextHandledByPill,
}: {
  dateStr: string
  d: number
  dayEvents: CalendarEvent[]
  todayCell: boolean
  openContextMenu: (
    e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void; stopPropagation?: () => void },
    date: string,
    event?: CalendarEvent
  ) => void
  openNewEvent: (date: string) => void
  openEventDetail: (ev: CalendarEvent) => void
  openEditEvent: (ev: CalendarEvent) => void
  isPastEvent: (ev: CalendarEvent) => boolean
  contextHandledByPill: React.MutableRefObject<boolean>
}) {
  const [hovered, setHovered] = useState(false)

  const lpCell = useLongPress(
    () =>
      openContextMenu(
        { clientX: window.innerWidth / 2, clientY: window.innerHeight * 0.65 },
        dateStr
      ),
    () => { },
    450
  )

  return (
    <div
      className={['cal-cell', todayCell ? 'cal-cell--today' : '', hovered ? 'cal-cell--hovered' : ''].filter(Boolean).join(' ')}
      {...lpCell}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (!target.closest('.cal-event-pill') && !target.closest('.cal-event-more')) {
          openNewEvent(dateStr)
        }
      }}
      onContextMenu={e => {
        e.preventDefault()
        if (contextHandledByPill.current) {
          contextHandledByPill.current = false
          return
        }
        openContextMenu(e, dateStr)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="cal-cell__num">{d}</span>
      <div className="cal-cell__events">
        {dayEvents.slice(0, 2).map((ev) => {
          const gradeColor = ev.grade != null
            ? ev.grade >= 6 ? '#4ade80' : ev.grade >= 4 ? '#fbbf24' : '#f87171'
            : null
          return (
            <EventPill
              key={ev.date + ev.title + (ev.startTime ?? '')}
              ev={ev}
              isPast={isPastEvent(ev)}
              gradeColor={gradeColor}
              onDetail={() => openEventDetail(ev)}
              onEdit={() => openEditEvent(ev)}
              onContext={e => openContextMenu(e, dateStr, ev)}
              onContextHandled={() => { contextHandledByPill.current = true }}
            />
          )
        })}
        {dayEvents.length > 2 && <div className="cal-event-more">+{dayEvents.length - 2}</div>}
      </div>
    </div>
  )
}

const ctxVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -6 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring' as const, damping: 22, stiffness: 320 }
  },
  exit: {
    opacity: 0, scale: 0.95, y: -4,
    transition: { duration: 0.14, ease: [0.32, 0.72, 0, 1] as const }
  },
}

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring' as const, damping: 26, stiffness: 280 }
  },
  exit: {
    opacity: 0, scale: 0.97, y: 8,
    transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] as const }
  },
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const Calendar = forwardRef<CalendarHandle, CalendarProps>(
  ({ events = [], onAddEvent, onRemoveEvent, onUpdateEvent, onEditSubject, universityLocation }, ref) => {
    const today = new Date()
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalDate, setModalDate] = useState('')
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
    const contextHandledByPill = useRef(false)
    const [mapOpen, setMapOpen] = useState(false)
    const isMobile = window.matchMedia('(pointer: coarse)').matches
    const [mapDestination, setMapDestination] = useState<string | undefined>(undefined)

    const wrapperRef = useRef<HTMLDivElement>(null)

    const openEventDetail = (ev: CalendarEvent) => {
      setSelectedEvent(ev)
    }

    useImperativeHandle(ref, () => ({
      navigateTo: (date: string) => {
        const d = new Date(date + 'T00:00:00')
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
      }
    }))

    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    useEffect(() => {
      if (!contextMenu) return

      const handleClickOutside = (e: MouseEvent) => {
        if (!wrapperRef.current) return
        if (!wrapperRef.current.contains(e.target as Node)) {
          setContextMenu(null)
        }
      }

      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setContextMenu(null)
      }

      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleEsc)

      return () => {
        window.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('keydown', handleEsc)
      }
    }, [contextMenu])

    const isPastEvent = (ev: CalendarEvent) => {
      const eventDateTime = new Date(ev.date + 'T' + (ev.startTime ?? '23:59'))
      return eventDateTime.getTime() < Date.now()
    }

    const openContextMenu = useCallback(
      (
        e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void; stopPropagation?: () => void },
        date: string,
        event?: CalendarEvent
      ) => {
        e.preventDefault?.()
        e.stopPropagation?.()

        contextHandledByPill.current = false

        const menuW = 200
        const menuH = event ? 200 : 120

        const x = Math.min(e.clientX, window.innerWidth - menuW - 8)
        const y = Math.min(e.clientY, window.innerHeight - menuH - 8)

        setContextMenu({ x, y, date, event })
      },
      []
    )

    const prevMonth = () => {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
      else setViewMonth(m => m - 1)
    }
    const nextMonth = () => {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
      else setViewMonth(m => m + 1)
    }
    const goToToday = () => {
      setViewYear(today.getFullYear())
      setViewMonth(today.getMonth())
    }

    const openNewEvent = (dateStr: string) => {
      setModalDate(dateStr)
      setEditingEvent(null)
      setModalOpen(true)
    }

    const openEditEvent = (event: CalendarEvent) => {
      setModalDate(event.date)
      setEditingEvent({ ...event, subjectId: undefined })
      setModalOpen(true)
    }

    const handleSave = (newEvent: CalendarEvent) => {
      if (editingEvent) {
        onUpdateEvent?.(editingEvent, newEvent)
      } else {
        onAddEvent?.(newEvent)
      }
      setModalOpen(false)
      setEditingEvent(null)
    }

    const handleDelete = (event: CalendarEvent) => {
      onRemoveEvent?.(event.date, event.title)
      setModalOpen(false)
      setEditingEvent(null)
    }

    const openMap = (location?: string) => {
      setMapDestination(location)
      setMapOpen(true)
      setContextMenu(null)
    }

    const getEventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr)

    const isToday = (dateStr: string) =>
      dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const formatDate = (dateStr: string) =>
      new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short'
      })

    const cells = []
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-cell cal-cell--empty" />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push(
        <DayCell
          key={dateStr}
          dateStr={dateStr}
          d={d}
          dayEvents={getEventsForDate(dateStr)}
          todayCell={isToday(dateStr)}
          openContextMenu={openContextMenu}
          openNewEvent={openNewEvent}
          openEventDetail={openEventDetail}
          openEditEvent={openEditEvent}
          isPastEvent={isPastEvent}
          contextHandledByPill={contextHandledByPill}
        />
      )
    }

    return (
      <>
        <div className="cal-wrapper" ref={wrapperRef}>
          <div className="cal-header">
            <div>
              <p className="cal-month-label">Calendario académico</p>
              <h2 className="cal-title">Agenda</h2>
            </div>
            <div className="cal-nav">
              <button className="cal-today-btn" onClick={goToToday}>Hoy</button>
              <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
              <span className="cal-month-heading">{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>
          </div>

          <div className="cal-grid-wrapper">
            <div className="cal-day-names">
              {DAY_NAMES.map(d => <div key={d} className="cal-day-name">{d}</div>)}
            </div>
            <div className="cal-grid">{cells}</div>
          </div>

          <p className="cal-tip">
            {isMobile
              ? 'Toque para agregar · Toque para ver · Mantené para opciones'
              : 'Clic para agregar · Clic en evento para ver · clic derecho para opciones'
            }
          </p>

          <div className="cal-stats">
            <span className="cal-stat"><strong>{events.length}</strong> eventos</span>
            <span className="cal-stat">
              <strong>{events.filter(e => e.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)).length}</strong> este mes
            </span>
          </div>

          <AnimatePresence>
            {contextMenu && (
              <motion.div
                className="cal-ctx-menu"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                variants={ctxVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
              >
                <div className="cal-ctx-header">{formatDate(contextMenu.date)}</div>

                <button className="cal-ctx-item" onClick={() => { openNewEvent(contextMenu.date); setContextMenu(null) }}>
                  <span className="cal-ctx-icon"><AddCircle size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                  Agregar evento
                </button>

                {contextMenu.event && (
                  <>
                    <div className="cal-ctx-divider" />
                    <div className="cal-ctx-event-label">
                      <span className="cal-ctx-event-dot" style={{ background: contextMenu.event.color }} />
                      {contextMenu.event.title}
                      {contextMenu.event.grade != null && (
                        <span style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.7 }}>· {contextMenu.event.grade}</span>
                      )}
                    </div>

                    <button className="cal-ctx-item" onClick={() => {
                      const ev = contextMenu.event!
                      setModalDate(ev.date)
                      setEditingEvent({ ...ev, subjectId: undefined })
                      setModalOpen(true)
                      setContextMenu(null)
                    }}>
                      <span className="cal-ctx-icon"><Edit size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                      Editar evento
                    </button>

                    {contextMenu.event.location && (
                      <button className="cal-ctx-item cal-ctx-item--map" onClick={() => openMap(contextMenu.event!.location)}>
                        <span className="cal-ctx-icon"><Location size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                        Cómo llegar
                      </button>
                    )}

                    {!contextMenu.event.location && (
                      <button className="cal-ctx-item" onClick={() => openMap(undefined)}>
                        <span className="cal-ctx-icon"><Location size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                        Cómo llegar
                      </button>
                    )}

                    <button className="cal-ctx-item cal-ctx-item--danger" onClick={() => {
                      if (contextMenu.event!.subjectId) {
                        onEditSubject?.(contextMenu.event!.subjectId)
                      } else {
                        onRemoveEvent?.(contextMenu.event!.date, contextMenu.event!.title)
                      }
                      setContextMenu(null)
                    }}>
                      <span className="cal-ctx-icon"><CloseCircle size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                      Eliminar evento
                    </button>
                  </>
                )}

                <div className="cal-ctx-divider" />
                <button className="cal-ctx-item" onClick={() => { goToToday(); setContextMenu(null) }}>
                  <span className="cal-ctx-icon"><CalendarCircle size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                  Ir a hoy
                </button>
                <button className="cal-ctx-item" onClick={() => { prevMonth(); setContextMenu(null) }}>
                  <span className="cal-ctx-icon"><ArrowCircleLeft size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                  Mes anterior
                </button>
                <button className="cal-ctx-item" onClick={() => { nextMonth(); setContextMenu(null) }}>
                  <span className="cal-ctx-icon"><ArrowCircleRight size={14} color="currentColor" style={{ position: 'relative', top: '2px' }} /></span>
                  Mes siguiente
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            initialDate={selectedEvent.date}
            readOnly
            onClose={() => setSelectedEvent(null)}
            onEdit={() => {
              setEditingEvent(selectedEvent)
              setSelectedEvent(null)
              setModalOpen(true)
            }}
          />
        )}

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.18 }}
              style={{ display: 'contents' }}
            >
              <EventModal
                initialDate={modalDate}
                event={editingEvent}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => { setModalOpen(false); setEditingEvent(null) }}
                universityLocation={universityLocation}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mapOpen && (
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.18 }}
              style={{ display: 'contents' }}
            >
              <MapModal
                initialDestination={mapDestination ?? universityLocation}
                onClose={() => setMapOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }
)

Calendar.displayName = 'Calendar'
export default Calendar