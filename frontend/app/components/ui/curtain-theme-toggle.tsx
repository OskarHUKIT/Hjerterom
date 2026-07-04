'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { Moon, Search, Sun, User } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme, type Theme } from '@/context/ThemeContext'

export type { Theme }

export interface AppBarProps {
  logo?: ReactNode
  appName?: string
  onSearch?: (query: string) => void
  userAvatar?: ReactNode
  userName?: string
}

export interface CurtainThemeToggleProps {
  /** Shell chrome row (Finn/Los/header language + theme). */
  variant?: 'default' | 'appbar' | 'icon' | 'chrome' | 'menu'
  appBarProps?: AppBarProps
  barHeight?: number
  buttonSize?: number
  duration?: number
  compact?: boolean
  className?: string
  onThemeChange?: (theme: Theme) => void
  children?: ReactNode
}

type CurtainPhase = 'idle' | 'falling' | 'rising'

const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)'

function readPageBgForTheme(next: Theme): string {
  if (typeof document === 'undefined') {
    return next === 'dark' ? '#020617' : '#f8fafc'
  }
  const root = document.documentElement
  const previous = root.getAttribute('data-theme')
  root.setAttribute('data-theme', next)
  const bg = getComputedStyle(root).getPropertyValue('--bg-app').trim()
  if (previous) root.setAttribute('data-theme', previous)
  else root.removeAttribute('data-theme')
  return bg || (next === 'dark' ? '#020617' : '#f8fafc')
}

function tokenStyles(theme: Theme): Record<string, string> {
  const isDark = theme === 'dark'
  return {
    pageBg: 'var(--bg-app)',
    pageText: 'var(--text-main)',
    barBg: isDark ? 'var(--bg-card)' : 'var(--text-main)',
    barText: isDark ? 'var(--text-main)' : 'var(--bg-app)',
    barBorder: 'var(--border-subtle)',
    btnBg: 'var(--bg-app)',
    btnText: 'var(--text-main)',
    btnRing: 'var(--border-medium)',
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    inputText: isDark ? 'var(--text-main)' : 'var(--bg-app)',
  }
}

export function CurtainThemeToggle({
  variant = 'default',
  appBarProps,
  barHeight: explicitBarHeight,
  buttonSize = 36,
  duration = 550,
  compact = false,
  className,
  onThemeChange,
  children,
}: CurtainThemeToggleProps) {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const isAppBar = variant === 'appbar'
  const isIcon = variant === 'icon'
  const isChrome = variant === 'chrome'
  const isMenu = variant === 'menu'
  const barHeight = explicitBarHeight ?? (isAppBar ? 60 : 44)

  const [phase, setPhase] = useState<CurtainPhase>('idle')
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const curtainColorRef = useRef('')
  const tkn = tokenStyles(theme)

  useEffect(() => {
    onThemeChange?.(theme)
  }, [theme, onThemeChange])

  const toggle = useCallback(() => {
    if (phase !== 'idle') return
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    curtainColorRef.current = readPageBgForTheme(next)
    setPhase('falling')

    window.setTimeout(() => {
      setTheme(next)
      setPhase('rising')
      window.setTimeout(() => setPhase('idle'), duration + 60)
    }, duration)
  }, [phase, theme, duration, setTheme])

  const ariaLabel = theme === 'dark' ? t('lightMode') : t('darkMode')
  const label = theme === 'dark' ? t('lightMode') : t('darkMode')

  const pageStyle: CSSProperties = {
    minHeight: '100vh',
    paddingTop: barHeight,
    background: tkn.pageBg,
    color: tkn.pageText,
    transition: 'background 0.3s ease, color 0.3s ease',
  }

  const barStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: barHeight,
    background: tkn.barBg,
    color: tkn.barText,
    borderBottom: `1px solid ${tkn.barBorder}`,
    overflow: 'visible',
    zIndex: 9998,
    transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease',
    display: isAppBar ? 'flex' : 'block',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isAppBar ? '0 24px' : '0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const btnScale = pressed ? 0.96 : hovered ? 1.1 : 1
  const btnStyle: CSSProperties = {
    position: isAppBar || isIcon || isChrome ? 'relative' : 'absolute',
    bottom: isAppBar || isIcon || isChrome ? 'auto' : -(buttonSize / 2),
    left: isAppBar || isIcon || isChrome ? 'auto' : '50%',
    transform:
      isAppBar || isIcon || isChrome
        ? `scale(${btnScale})`
        : `translateX(-50%) scale(${btnScale})`,
    width: buttonSize,
    height: buttonSize,
    minWidth: buttonSize,
    minHeight: buttonSize,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tkn.btnBg,
    color: tkn.btnText,
    boxShadow: `0 0 0 1.5px ${tkn.btnRing}`,
    zIndex: 9999,
    outline: 'none',
    transition:
      'background 0.3s ease, color 0.3s ease, transform 0.15s ease, box-shadow 0.3s ease',
    marginLeft: isAppBar ? '16px' : '0',
    flexShrink: 0,
  }

  const curtainStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: curtainColorRef.current,
    transformOrigin: 'top',
    transform: phase === 'falling' ? 'scaleY(1)' : 'scaleY(0)',
    transition: phase !== 'idle' ? `transform ${duration}ms ${EASING}` : 'none',
    zIndex: 9997,
    pointerEvents: 'none',
  }

  const appBarSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const renderToggleIcon = () =>
    theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />

  const renderIconButton = (style: CSSProperties = btnStyle) => (
    <button
      type="button"
      style={style}
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      aria-label={ariaLabel}
      aria-pressed={theme === 'dark'}
    >
      {renderToggleIcon()}
    </button>
  )

  if (isChrome) {
    return (
      <>
        <div aria-hidden="true" style={curtainStyle} />
        <button
          type="button"
          onClick={toggle}
          className={['shell-chrome-controls__theme', className].filter(Boolean).join(' ')}
          aria-label={ariaLabel}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? (
            <Sun size={compact ? 14 : 16} aria-hidden />
          ) : (
            <Moon size={compact ? 14 : 16} aria-hidden />
          )}
          {!compact && <span>{label}</span>}
        </button>
      </>
    )
  }

  if (isMenu) {
    return (
      <>
        <div aria-hidden="true" style={curtainStyle} />
        <button
          type="button"
          onClick={toggle}
          className={className}
          aria-label={ariaLabel}
          aria-pressed={theme === 'dark'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            width: '100%',
            padding: '10px 12px',
            minHeight: 'var(--touch-target)',
            borderRadius: 8,
            background: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: compact ? '0.85rem' : '0.9rem',
          }}
        >
          {theme === 'dark' ? (
            <Sun size={compact ? 16 : 18} aria-hidden />
          ) : (
            <Moon size={compact ? 16 : 18} aria-hidden />
          )}
          {label}
        </button>
      </>
    )
  }

  if (isIcon) {
    return (
      <>
        <div aria-hidden="true" style={curtainStyle} />
        {renderIconButton()}
      </>
    )
  }

  return (
    <div style={pageStyle}>
      <div aria-hidden="true" style={curtainStyle} />

      <div style={barStyle}>
        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1 }}>
            {appBarProps?.logo && (
              <div style={{ display: 'flex', alignItems: 'center' }}>{appBarProps.logo}</div>
            )}
            {appBarProps?.appName && (
              <span style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                {appBarProps.appName}
              </span>
            )}
          </div>
        )}

        {isAppBar && appBarProps?.onSearch && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '320px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ position: 'absolute', left: '12px', display: 'flex', opacity: 0.6 }}>
                <Search size={14} aria-hidden />
              </div>
              <input
                type="search"
                placeholder={t('searchByNamePlaceholder')}
                onChange={(e) => appBarProps.onSearch?.(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 16px 0 36px',
                  borderRadius: '18px',
                  border: 'none',
                  outline: 'none',
                  background: tkn.inputBg,
                  color: tkn.inputText,
                  fontSize: '0.9rem',
                  transition: 'background 0.3s ease, color 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: 'flex-end' }}>
            {appBarProps?.userName && (
              <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{appBarProps.userName}</span>
            )}
            {appBarProps?.userAvatar !== undefined ? (
              appBarProps.userAvatar
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: tkn.inputBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tkn.inputText,
                }}
              >
                <User size={18} aria-hidden />
              </div>
            )}
            {renderIconButton()}
          </div>
        )}

        {!isAppBar && renderIconButton()}
      </div>

      {children}
    </div>
  )
}

/** Alias for demo / external snippets */
export const ThemeToggle = CurtainThemeToggle
