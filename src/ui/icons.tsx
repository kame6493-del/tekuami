/** 線のアイコン。1.75px の線・角は丸めない・24px の枠で揃える */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'square' as const,
  'aria-hidden': true,
};

export function IconKnit() {
  return (
    <svg {...base}>
      <path d="M4 20 L18 6" />
      <path d="M20 20 L6 6" />
      <circle cx="18.5" cy="5.5" r="1.5" />
      <circle cx="5.5" cy="5.5" r="1.5" />
      <path d="M8 15 Q12 12 16 15" />
    </svg>
  );
}

export function IconLog() {
  return (
    <svg {...base}>
      <path d="M5 20 V13" />
      <path d="M10 20 V7" />
      <path d="M15 20 V10" />
      <path d="M20 20 V4" />
      <path d="M3 20.5 H21" strokeWidth={1.25} />
    </svg>
  );
}

export function IconBox() {
  return (
    <svg {...base}>
      <path d="M3.5 9 H20.5 V20 H3.5 Z" />
      <path d="M3.5 9 L6 4.5 H18 L20.5 9" />
      <path d="M9.5 13 H14.5" />
    </svg>
  );
}

export function IconGear() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5 M5.3 5.3 L7.4 7.4 M16.6 16.6 L18.7 18.7 M5.3 18.7 L7.4 16.6 M16.6 7.4 L18.7 5.3" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg {...base}>
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg {...base} width={14} height={14}>
      <path d="M6 11 H18 V20 H6 Z" />
      <path d="M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11" />
    </svg>
  );
}

export function IconRefresh() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M19 12 A7 7 0 1 1 16.5 6.6" />
      <path d="M17 3 V7 H13" />
    </svg>
  );
}

export function IconChevron() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M9 5 L16 12 L9 19" />
    </svg>
  );
}
