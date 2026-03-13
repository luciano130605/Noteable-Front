import { useState } from 'react'
import { MonitorMobbile, Sun1, Moon } from 'iconsax-react'

export type ThemeOption = 'light' | 'dark' | 'system'

const THEME_CYCLE: ThemeOption[] = ['dark', 'light', 'system']

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(option: ThemeOption) {
  const resolved = option === 'system' ? getSystemTheme() : option
  document.documentElement.setAttribute('data-theme', resolved)
  localStorage.setItem('app-theme', option)
}

export function useTheme(): ['light' | 'dark', ThemeOption, (opt: ThemeOption) => void] {
  const [option, setOption] = useState<ThemeOption>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem('app-theme') as ThemeOption | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    return 'system'
  })

  const resolved: 'light' | 'dark' = option === 'system' ? getSystemTheme() : option

  const setTheme = (opt: ThemeOption) => {
    setOption(opt)
    applyTheme(opt)
  }

  return [resolved, option, setTheme]
}

interface ThemeCycleButtonProps {
  themeOption: ThemeOption
  onCycle: () => void
  className?: string
}

export function ThemeCycleButton({ themeOption, onCycle, className = '' }: ThemeCycleButtonProps) {
  const icon = themeOption === 'dark'
    ? <Moon size={15} color="currentColor" />
    : themeOption === 'light'
      ? <Sun1 size={15} color="currentColor" />
      : <MonitorMobbile  size={15} color="currentColor" />

  const title = themeOption === 'dark' ? 'Oscuro' : themeOption === 'light' ? 'Claro' : 'Sistema'

  return (
    <button
      type="button"
      className={`btn btn--icon ${className}`}
      onClick={onCycle}
      title={title}
    >
      {icon}
    </button>
  )
}

export function useCycleTheme(): [ThemeOption, () => void, (opt: ThemeOption) => void] {
  const [, option, setTheme] = useTheme()

  const cycle = () => {
    const idx = THEME_CYCLE.indexOf(option)
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
  }

  return [option, cycle, setTheme]
}