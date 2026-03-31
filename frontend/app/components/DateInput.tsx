'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatDateNo, parseDateNo } from '@/app/lib/dateFormat';
import { Calendar } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Vis kalender-ikon og dropdown for å velge dato */
  showCalendar?: boolean;
  disabled?: boolean;
};

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function toISO(y: number, m: number, d: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/**
 * Dato-felt som viser og tar imot norsk format DD.MM.YYYY.
 * value/onChange bruker fortsatt YYYY-MM-DD for API/lagring.
 * Med showCalendar vises kalender-dropdown ved klikk på ikon.
 */
export function DateInput({ value, onChange, min, max, placeholder, className, style, id, showCalendar, disabled }: Props) {
  const { t, locale } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t('dateInputPlaceholder');
  const localeTag = locale === 'no' ? 'nb-NO' : locale === 'se' ? 'se' : 'en-GB';
  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      return d.toLocaleDateString(localeTag, { weekday: 'short' })
    })
  }, [localeTag])
  const [display, setDisplay] = useState(() => (value ? formatDateNo(value) : ''));
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, (m || 1) - 1, 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (value) {
      setDisplay(formatDateNo(value));
    } else {
      setDisplay(prev => (parseDateNo(prev) ? '' : prev));
    }
  }, [value]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPanelPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    setDisplay(raw);
    if (!raw.trim()) {
      onChange('');
      return;
    }
    const iso = parseDateNo(raw);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    const iso = parseDateNo(display);
    if (iso) setDisplay(formatDateNo(iso));
    else if (value) setDisplay(formatDateNo(value));
    else setDisplay('');
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const iso = toISO(year, month, day);
    onChange(iso);
    setOpen(false);
  };

  const inputStyle: React.CSSProperties | undefined = showCalendar
    ? { ...style, marginBottom: 0, flex: 1, minWidth: 0, width: 'auto' }
    : style

  const inputEl = (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      className={className}
      disabled={disabled}
      style={inputStyle}
      placeholder={resolvedPlaceholder}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      maxLength={10}
      title={
        min
          ? t('dateOnOrAfter').replace('{date}', formatDateNo(min))
          : max
            ? t('dateOnOrBefore').replace('{date}', formatDateNo(max))
            : undefined
      }
    />
  );

  if (!showCalendar) return inputEl;

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const days = getMonthDays(y, m);
  const minDate = min ? new Date(min) : null;
  const maxDate = max ? new Date(max) : null;
  const monthYearLabel = new Date(y, m, 1).toLocaleDateString(localeTag, { month: 'long', year: 'numeric' });

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          width: '100%',
        }}
      >
        {inputEl}
        <button
          type="button"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setOpen(o => !o);
          }}
          aria-label={t('calendarOpenAria')}
          disabled={disabled}
          style={{
            flexShrink: 0,
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 6, 23, 0.35)',
            border: '1px solid var(--border-medium)',
            borderRadius: 10,
            padding: '0 10px',
            minWidth: 44,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.45 : 1,
            color: 'var(--text-muted)',
            lineHeight: 0,
            boxSizing: 'border-box',
          }}
        >
          <Calendar size={18} />
        </button>
      </div>
      {open &&
        panelPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            className="date-input-calendar"
            role="dialog"
            aria-label={t('calendarOpenAria')}
            style={{
              position: 'fixed',
              top: panelPos.top,
              left: panelPos.left,
              width: Math.max(panelPos.width, 260),
              zIndex: 5000,
              padding: 12,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: 18 }}>‹</button>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{monthYearLabel}</span>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: 18 }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: '0.75rem' }}>
              {weekdayLabels.map((day, wi) => (
                <div key={wi} style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{day}</div>
              ))}
              {days.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const iso = toISO(y, m, day);
                const date = new Date(y, m, day);
                const dateDisabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
                const selected = value === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={dateDisabled}
                    onClick={() => !dateDisabled && handleSelectDay(y, m, day)}
                    style={{
                      padding: '6px',
                      border: 'none',
                      borderRadius: 6,
                      background: selected ? 'var(--color-accent)' : 'transparent',
                      color: selected ? 'var(--text-on-dark)' : dateDisabled ? 'var(--text-muted)' : 'var(--text-main)',
                      cursor: dateDisabled ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
