'use client';

import { useState, useEffect } from 'react';
import { formatDateNo, parseDateNo } from '@/app/lib/dateFormat';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
};

/**
 * Dato-felt som viser og tar imot norsk format DD.MM.YYYY.
 * value/onChange bruker fortsatt YYYY-MM-DD for API/lagring.
 */
export function DateInput({ value, onChange, min, max, placeholder = 'DD.MM.ÅÅÅÅ', className, style, id }: Props) {
  const [display, setDisplay] = useState(() => (value ? formatDateNo(value) : ''));

  useEffect(() => {
    setDisplay(value ? formatDateNo(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      className={className}
      style={style}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      maxLength={10}
      title={min ? `Etter eller lik ${formatDateNo(min)}` : max ? `Før eller lik ${formatDateNo(max)}` : undefined}
    />
  );
}
