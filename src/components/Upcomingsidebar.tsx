import { useMemo, useState, useEffect, useCallback } from 'react'
import type { Subject } from '../types/types'
import type { CalendarEvent } from './Eventmodal'
import EventModal from './Eventmodal'
import './UpcomingSidebar.css'
import { CalendarCircle, CloseCircle, Copy, Edit, ArrowLeft2, ArrowRight2, Calendar } from 'iconsax-react'

interface Props {
  subjects: Subject[]
  calendarEvents: CalendarEvent[]
  onOpenCalendar: (date?: string) => void
  onEditSubject: (id: string) => void
  onRemoveEvent: (date: string, title: string) => void
  onUpdateEvent: (old: CalendarEvent, updated: CalendarEvent) => void
}

interface TimelineItem {
  id: string
  date: string
  title: string
  subtitle?: string
  type: 'final' | 'exam' | 'event' | 'approved'
  color?: string
  importance?: string
  daysLeft: number
  subjectId?: string
  originalEvent?: CalendarEvent
}

interface ContextMenu {
  x: number
  y: number
  item: TimelineItem
}

const IMPORTANCE_COLOR: Record<string, string> = {
  baja: '#10b981',
  media: '#f59e0b',
  alta: '#ef4444',
  critica: '#ec4899',
}

const EXAM_TYPE_COLOR: Record<string, string> = {
  parcial: '#6366f1',
  final: '#ef4444',
  recuperatorio: '#f59e0b',
  coloquio: '#06b6d4',
  otro: '#64748b',
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recuperatorio',
  coloquio: 'Coloquio',
  otro: 'Otro',
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatRelative(days: number): { text: string; urgency: 'today' | 'urgent' | 'soon' | 'normal' | 'past' } {
  if (days < 0) return { text: `hace ${Math.abs(days)}d`, urgency: 'past' }
  if (days === 0) return { text: 'Hoy', urgency: 'today' }
  if (days === 1) return { text: 'Mañana', urgency: 'urgent' }
  if (days <= 7) return { text: `en ${days} días`, urgency: 'urgent' }
  if (days <= 30) return { text: `en ${days} días`, urgency: 'soon' }
  return { text: `en ${days} días`, urgency: 'normal' }
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function buildItems(calendarEvents: CalendarEvent[], subjects: Subject[]): TimelineItem[] {
  return calendarEvents.map((ev, i) => {
    const finalMatch = ev.title.match(/^Final de (.+)$/)
    if (finalMatch) {
      const subjectName = finalMatch[1]
      const subject = subjects.find(s => s.name === subjectName)
      return {
        id: `cal-final-${i}-${ev.date}`,
        date: ev.date,
        title: subjectName,
        subtitle: 'Final',
        type: 'final' as const,
        color: '#ef4444',
        daysLeft: daysUntil(ev.date),
        subjectId: subject?.id,
        originalEvent: ev,
      }
    }

    const examMatch = ev.title.match(/^([A-ZÁÉÍÓÚ_]+)\s·\s(.+)$/)
    if (examMatch) {
      const typeRaw = examMatch[1].toLowerCase()
      const subjectName = examMatch[2].split(' · ')[0]
      const subject = subjects.find(s => s.name === subjectName)
      const color = EXAM_TYPE_COLOR[typeRaw] ?? '#64748b'
      const label = EXAM_TYPE_LABEL[typeRaw] ?? examMatch[1]
      return {
        id: `cal-exam-${i}-${ev.date}`,
        date: ev.date,
        title: subjectName,
        subtitle: label + (ev.title.includes(' · ') && ev.title.split(' · ')[2] ? ` · ${ev.title.split(' · ')[2]}` : ''),
        type: 'exam' as const,
        color,
        daysLeft: daysUntil(ev.date),
        subjectId: subject?.id,
        originalEvent: ev,
      }
    }

    return {
      id: `cal-ev-${i}-${ev.date}`,
      date: ev.date,
      title: ev.title,
      subtitle: (ev as any).location || undefined,
      type: 'event' as const,
      color: (ev as any).color,
      importance: (ev as any).importance,
      daysLeft: daysUntil(ev.date),
      originalEvent: ev,
    }
  })
}

export default function UpcomingSidebar({
  subjects,
  calendarEvents,
  onOpenCalendar,
  onEditSubject,
  onRemoveEvent,
  onUpdateEvent,
}: Props) {
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [ctxMenu])

  const handleContextMenu = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, item })
  }, [])

  const items = useMemo<TimelineItem[]>(() => {
    const list = buildItems(calendarEvents, subjects)
    return list.sort((a, b) => {
      if (a.daysLeft >= 0 && b.daysLeft >= 0) return a.daysLeft - b.daysLeft
      if (a.daysLeft < 0 && b.daysLeft < 0) return b.daysLeft - a.daysLeft
      return a.daysLeft >= 0 ? -1 : 1
    })
  }, [subjects, calendarEvents])

  const upcoming = items.filter(i => i.daysLeft >= 0)
  const past = items.filter(i => i.daysLeft < 0).slice(0, 5)

  const todayCount = items.filter(i => i.daysLeft === 0).length
  const urgentCount = items.filter(i => i.daysLeft > 0 && i.daysLeft <= 7).length
  const nextItem = upcoming[0]

  const ctxActions = ctxMenu ? [
    {
      label: (
        <>
          <CalendarCircle size={14} color="currentColor" style={{ verticalAlign: 'middle' }} />
          Ver en calendario
        </>
      ),
      onClick: () => { onOpenCalendar(ctxMenu.item.date); setCtxMenu(null) },
    },
    ...(ctxMenu.item.type === 'event' && ctxMenu.item.originalEvent ? [{
      label: (
        <>
          <Edit size={14} color="currentColor" style={{ verticalAlign: 'middle' }} />
          Editar evento
        </>
      ),
      onClick: () => { setEditingEvent(ctxMenu.item.originalEvent!); setCtxMenu(null) },
    }] : []),
    ...(ctxMenu.item.subjectId ? [{
      label: (
        <>
          <Edit size={14} color="currentColor" style={{ verticalAlign: 'middle' }} />
          Editar materia
        </>
      ),
      onClick: () => { onEditSubject(ctxMenu.item.subjectId!); setCtxMenu(null) },
    }] : []),
    {
      label: (
        <>
          <Copy size={14} color="currentColor" style={{ verticalAlign: 'middle' }} />
          Copiar fecha
        </>
      ),
      onClick: () => {
        const d = new Date(ctxMenu.item.date + 'T00:00:00')
        navigator.clipboard.writeText(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`)
        setCtxMenu(null)
      },
    },
    ...(ctxMenu.item.type === 'event' ? [{
      label: (
        <>
          <CloseCircle size={14} color="currentColor" style={{ verticalAlign: 'middle' }} />
          Eliminar
        </>
      ),
      danger: true,
      onClick: () => {
        onRemoveEvent(ctxMenu.item.date, ctxMenu.item.title)
        setCtxMenu(null)
      },
    }] : []),
  ] : []

  return (
    <aside className={`usb${collapsed ? ' usb--collapsed' : ''}`}>

      <button
        className="usb__toggle"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expandir panel' : 'Colapsar panel'}
        aria-label={collapsed ? 'Expandir panel' : 'Colapsar panel'}
      >
        <span className="usb__toggle-icon">
          {collapsed ? <ArrowRight2 size={14} color="currentColor" /> : <ArrowLeft2 size={14} color="currentColor" />}
        </span>
        {collapsed && urgentCount > 0 && (
          <span className="usb__toggle-badge">{urgentCount}</span>
        )}
      </button>

      {collapsed && (
        <div className="usb__collapsed-strip">
          <span className="usb__collapsed-label">Próximos</span>
          {nextItem && (
            <div
              className="usb__collapsed-next"
              style={{ '--nb': nextItem.color ?? '#6366f1' } as React.CSSProperties}
            >
              <div className="usb__collapsed-dot" style={{ background: nextItem.color ?? '#6366f1' }} />
              <span className="usb__collapsed-days">
                {nextItem.daysLeft === 0 ? 'HOY' : `+${nextItem.daysLeft}d`}
              </span>
            </div>
          )}
          <div className="usb__collapsed-counts">
            {todayCount > 0 && <span className="usb__collapsed-pill usb__collapsed-pill--today">{todayCount}</span>}
            {urgentCount > 0 && <span className="usb__collapsed-pill usb__collapsed-pill--urgent">{urgentCount}</span>}
          </div>
        </div>
      )}

      <div className="usb__content">
        <div className="usb__header">
          <span className="usb__header-label">Próximos eventos</span>
        </div>

        <div className="usb__stats">
          <div className={`usb__stat${todayCount > 0 ? ' usb__stat--today' : ''}`}>
            <span className="usb__stat-val">{todayCount}</span>
            <span className="usb__stat-lbl">hoy</span>
          </div>
          <div className={`usb__stat${urgentCount > 0 ? ' usb__stat--urgent' : ''}`}>
            <span className="usb__stat-val">{urgentCount}</span>
            <span className="usb__stat-lbl">esta semana</span>
          </div>
          <div className="usb__stat">
            <span className="usb__stat-val">{items.filter(i => i.daysLeft > 30).length}</span>
            <span className="usb__stat-lbl">+ de 30d</span>
          </div>
        </div>

        {nextItem && (
          <div
            className="usb__next"
            style={{ '--nb': nextItem.color ?? '#6366f1' } as React.CSSProperties}
            onContextMenu={e => handleContextMenu(e, nextItem)}
          >
            <div className="usb__next-band" />
            <div className="usb__next-body">
              <span className="usb__next-eyebrow">
                {nextItem.daysLeft === 0 ? 'Hoy' : nextItem.daysLeft === 1 ? 'Mañana' : 'Próximo'}
              </span>
              <span className="usb__next-title">{nextItem.title}</span>
              {nextItem.subtitle && <span className="usb__next-sub">{nextItem.subtitle}</span>}
              <span className="usb__next-date">{formatDateShort(nextItem.date)}</span>
            </div>
            <div className="usb__next-days" style={{ color: nextItem.color ?? '#6366f1' }}>
              {nextItem.daysLeft === 0 ? 'HOY' : nextItem.daysLeft === 1 ? '+1d' : `+${nextItem.daysLeft}d`}
            </div>
          </div>
        )}

        {upcoming.length === 0 ? (
          <div className="usb__empty">
            <span className="usb__empty-icon"><Calendar size={25} color='currentColor' /></span>
            <span>Sin próximos eventos</span>
          </div>
        ) : (
          <div className="usb__timeline">
            {upcoming.map((item, idx) => {
              const rel = formatRelative(item.daysLeft)
              const showDateSep = idx === 0 || upcoming[idx - 1].date !== item.date
              return (
                <div key={item.id} onContextMenu={e => handleContextMenu(e, item)}>
                  {showDateSep && (
                    <div className="usb__date-sep">
                      <span>{item.daysLeft === 0 ? 'Hoy' : item.daysLeft === 1 ? 'Mañana' : formatDateShort(item.date)}</span>
                    </div>
                  )}
                  <div className={`usb__item usb__item--${rel.urgency}`}>
                    <div className="usb__item-dot" style={{ background: item.color ?? '#6366f1' }} />
                    <div className="usb__item-body">
                      <span className="usb__item-title">{item.title}</span>
                      {item.subtitle && <span className="usb__item-sub">{item.subtitle}</span>}
                      {item.importance && item.importance !== 'baja' && (
                        <span className="usb__item-importance" style={{ color: IMPORTANCE_COLOR[item.importance] }}>
                          {item.importance === 'critica' ? '' : item.importance === 'alta' ? '' : ''}
                          {' '}{item.importance}
                        </span>
                      )}
                    </div>
                    <span className={`usb__item-badge usb__item-badge--${rel.urgency}`}>{rel.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {past.length > 0 && (
          <details className="usb__past">
            <summary className="usb__past-summary">Recientes ({past.length})</summary>
            <div className="usb__timeline usb__timeline--past">
              {past.map(item => (
                <div key={item.id} className="usb__item usb__item--past" onContextMenu={e => handleContextMenu(e, item)}>
                  <div className="usb__item-dot" style={{ background: item.color ?? '#6366f1', opacity: 0.35 }} />
                  <div className="usb__item-body">
                    <span className="usb__item-title">{item.title}</span>
                    {item.subtitle && <span className="usb__item-sub">{item.subtitle}</span>}
                  </div>
                  <span className="usb__item-badge usb__item-badge--past">{formatRelative(item.daysLeft).text}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {ctxMenu && (
        <div
          className="usb__ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="usb__ctx-header">
            <span className="usb__ctx-title">{ctxMenu.item.title}</span>
            <span className="usb__ctx-date">{formatDateShort(ctxMenu.item.date)}</span>
          </div>
          {ctxActions.map((a, i) => (
            <button
              key={i}
              className={`usb__ctx-btn${(a as any).danger ? ' usb__ctx-btn--danger' : ''}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {editingEvent && typeof editingEvent === 'object' && (
        <EventModal
          event={editingEvent}
          onSave={(updated) => {
            onUpdateEvent(editingEvent, updated)
            setEditingEvent(null)
          }}
          onDelete={(ev) => {
            onRemoveEvent(ev.date, ev.title)
            setEditingEvent(null)
          }}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </aside>
  )
}