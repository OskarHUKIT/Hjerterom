'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDateNo, parseDateNo } from '@/app/lib/dateFormat';
import { Calendar } from 'lucide-react';

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
export function DateInput({ value, onChange, min, max, placeholder = 'DD.MM.ÅÅÅÅ', className, style, id, showCalendar, disabled }: Props) {
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

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
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

  const inputEl = (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      className={className}
      disabled={disabled}
      style={showCalendar ? { ...style, paddingRight: 40 } : style}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      maxLength={10}
      title={min ? `Etter eller lik ${formatDateNo(min)}` : max ? `Før eller lik ${formatDateNo(max)}` : undefined}
    />
  );

  if (!showCalendar) return inputEl;

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const days = getMonthDays(y, m);
  const minDate = min ? new Date(min) : null;
  const maxDate = max ? new Date(max) : null;
  const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {inputEl}
        <button
          type="button"
          onClick={() => !disabled && setOpen(o => !o)}
          aria-label="Åpne kalender"
          disabled={disabled}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.45 : 1,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Calendar size={18} />
        </button>
      </div>
      {open && (
        <div
          className="date-input-calendar"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            zIndex: 50,
            minWidth: 260,
            padding: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: 18 }}>‹</button>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{monthNames[m]} {y}</span>
            <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: 18 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: '0.75rem' }}>
            {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(day => (
              <div key={day} style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{day}</div>
            ))}
            {days.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const iso = toISO(y, m, day);
              const date = new Date(y, m, day);
              const disabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
              const selected = value === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && handleSelectDay(y, m, day)}
                  style={{
                    padding: '6px',
                    border: 'none',
                    borderRadius: 6,
                    background: selected ? 'var(--color-accent)' : 'transparent',
                    color: selected ? 'var(--text-on-dark)' : disabled ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
