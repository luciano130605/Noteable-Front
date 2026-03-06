import type { StatusConfig, FilterOption, SubjectStatus } from '../types/types'
import { TickCircle, CalendarCircle, RepeatCircle, InfoCircle } from "iconsax-react"
import HalfCircleInv from "../Icon/HalfCircleInv"
import unlockIcon from "../Icon/Unlock"
import Lock from "../Icon/Lock"



export const STATUS_CONFIG: Record<SubjectStatus, StatusConfig> = {

  
  locked: {
    label: 'Bloqueada',
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.10)',
    borderColor: '#be123c',
    icon: Lock,
  },
  available: {
    label: 'Habilitada',
    color: '#38bdf8',          
    bg: 'rgba(56,189,248,0.10)',
    borderColor: '#0ea5e9',
    icon: unlockIcon,
  },
  in_progress: {
    label: 'En cursada',
    color: '#6fbbc6',         
    bg: 'rgba(167,139,250,0.12)',
    borderColor: '#6fbbc6',
    icon: HalfCircleInv,
  },
  retaking: {
    label: 'Recursada',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    borderColor: '#7c3aed',
    icon: RepeatCircle,
  },
  pending_final: {
    label: 'Final pendiente',
    color: '#fbbf24',          
    bg: 'rgba(251,191,36,0.12)',
    borderColor: '#d97706',
    icon: CalendarCircle,
  },
  approved: {
    label: 'Aprobada',
    color: '#4ade80',       
    bg: 'rgba(74,222,128,0.12)',
    borderColor: '#16a34a',
    icon: TickCircle,
  },
  failed_final: {
    label: 'Final desaprobado',
    color: '#fb923c',         
    bg: 'rgba(251,146,60,0.10)',
    borderColor: '#ea580c',
    icon: InfoCircle,
  },
  free: {
    label: 'Libre',
    color: '#475569',
    bg: 'rgba(71,85,105,0.10)',     
    borderColor: '#334155',
  },
}

export const FILTERS: FilterOption[] = [
  { key: 'all', label: 'Todas', color: 'var(--muted)' },
  { key: 'in_progress', label: 'En cursada', color: '#a78bfa' },
  { key: 'retaking', label: 'Recursadas', color: '#c084fc' },
  { key: 'approved', label: 'Aprobadas', color: '#4ade80' },
  { key: 'available', label: 'Habilitadas', color: '#38bdf8' },
  { key: 'pending_final', label: 'Final pendiente', color: '#fbbf24' },
  { key: 'failed_final', label: 'Final desap.', color: '#fb923c' },
  { key: 'locked', label: 'Bloqueadas', color: '#475569' },
  { key: 'free', label: 'Libre', color: '#f43f5e' },

]
export const STORAGE_KEY = 'correlapp_subjects'