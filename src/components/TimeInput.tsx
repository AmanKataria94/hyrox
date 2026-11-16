import { useEffect, useState } from 'react';
import { fmt, parseTime } from '../time';

/** Time field: type "145" or "1.45" for 1:45. Optional ⏱ button fills the stopwatch split. */
export function TimeInput({
  value,
  onChange,
  onSplit,
  placeholder = 'm:ss',
}: {
  value?: number;
  onChange: (v?: number) => void;
  onSplit?: () => number;
  placeholder?: string;
}) {
  const [text, setText] = useState(value !== undefined ? fmt(value) : '');
  useEffect(() => setText(value !== undefined ? fmt(value) : ''), [value]);
  return (
    <span className="time-input">
      <input
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = parseTime(text);
          onChange(v);
          setText(v !== undefined ? fmt(v) : '');
        }}
      />
      {onSplit && (
        <button className="btn split" title="Fill with stopwatch split" onClick={() => onChange(onSplit())}>
          ⏱
        </button>
      )}
    </span>
  );
}

export function NumInput({
  value,
  onChange,
  placeholder,
  width,
}: {
  value?: number;
  onChange: (v?: number) => void;
  placeholder?: string;
  width?: number;
}) {
  const [text, setText] = useState(value?.toString() ?? '');
  useEffect(() => setText(value?.toString() ?? ''), [value]);
  return (
    <input
      inputMode="decimal"
      className="num"
      style={width ? { width } : undefined}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = parseFloat(text.replace(',', '.'));
        onChange(isFinite(n) ? n : undefined);
      }}
    />
  );
}
