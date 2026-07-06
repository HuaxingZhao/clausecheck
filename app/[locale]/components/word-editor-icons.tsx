/** Word-style toolbar SVG icons (16×16 viewBox). */

type IconProps = { className?: string };

export function IconUndo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5h7.5a3.5 3.5 0 1 1 0 7H8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.5 2.5 3 4.5l2.5 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRedo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13 4.5H5.5a3.5 3.5 0 1 0 0 7H8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.5 2.5 13 4.5l-2.5 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlignLeft({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="5.5" width="10" height="1.5" rx="0.5" />
      <rect x="1" y="9" width="12" height="1.5" rx="0.5" />
      <rect x="1" y="12.5" width="8" height="1.5" rx="0.5" />
    </svg>
  );
}

export function IconAlignCenter({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="1.5" rx="0.5" />
      <rect x="3" y="5.5" width="10" height="1.5" rx="0.5" />
      <rect x="2" y="9" width="12" height="1.5" rx="0.5" />
      <rect x="4" y="12.5" width="8" height="1.5" rx="0.5" />
    </svg>
  );
}

export function IconAlignRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="1.5" rx="0.5" />
      <rect x="5" y="5.5" width="10" height="1.5" rx="0.5" />
      <rect x="3" y="9" width="12" height="1.5" rx="0.5" />
      <rect x="7" y="12.5" width="8" height="1.5" rx="0.5" />
    </svg>
  );
}

export function IconAlignJustify({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="5.5" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="9" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="12.5" width="14" height="1.5" rx="0.5" />
    </svg>
  );
}

export function IconBulletList({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="2.5" cy="3.5" r="1.1" />
      <circle cx="2.5" cy="8" r="1.1" />
      <circle cx="2.5" cy="12.5" r="1.1" />
      <rect x="5.5" y="2.75" width="9" height="1.5" rx="0.5" />
      <rect x="5.5" y="7.25" width="9" height="1.5" rx="0.5" />
      <rect x="5.5" y="11.75" width="9" height="1.5" rx="0.5" />
    </svg>
  );
}

export function IconNumberedList({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1" y="4.5" fontSize="3.5" fontFamily="Arial, sans-serif" fontWeight="600">1</text>
      <text x="1" y="9" fontSize="3.5" fontFamily="Arial, sans-serif" fontWeight="600">2</text>
      <text x="1" y="13.5" fontSize="3.5" fontFamily="Arial, sans-serif" fontWeight="600">3</text>
      <rect x="5.5" y="2.75" width="9" height="1.5" rx="0.5" />
      <rect x="5.5" y="7.25" width="9" height="1.5" rx="0.5" />
      <rect x="5.5" y="11.75" width="9" height="1.5" rx="0.5" />
    </svg>
  );
}

export function IconIncreaseIndent({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="10" height="1.5" rx="0.5" />
      <rect x="4" y="5.5" width="10" height="1.5" rx="0.5" />
      <rect x="4" y="9" width="10" height="1.5" rx="0.5" />
      <rect x="4" y="12.5" width="10" height="1.5" rx="0.5" />
      <path d="M14.5 8 12 5.5v5L14.5 8Z" />
    </svg>
  );
}

export function IconDecreaseIndent({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="5" y="2" width="10" height="1.5" rx="0.5" />
      <rect x="2" y="5.5" width="10" height="1.5" rx="0.5" />
      <rect x="2" y="9" width="10" height="1.5" rx="0.5" />
      <rect x="2" y="12.5" width="10" height="1.5" rx="0.5" />
      <path d="M1.5 8 4 5.5v5L1.5 8Z" />
    </svg>
  );
}

export function IconGrowFont({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1" y="11" fontSize="7" fontFamily="Georgia, serif" fontWeight="700">A</text>
      <text x="8" y="13" fontSize="10" fontFamily="Georgia, serif" fontWeight="700">A</text>
      <path d="M12.5 3.5v5M10 6h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconShrinkFont({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1" y="11" fontSize="7" fontFamily="Georgia, serif" fontWeight="700">A</text>
      <text x="8" y="13" fontSize="10" fontFamily="Georgia, serif" fontWeight="700">A</text>
      <path d="M10 6h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconClearFormat({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <text x="1" y="11" fontSize="9" fontFamily="Georgia, serif" fontWeight="700" fill="currentColor">A</text>
      <path d="M9 3.5 13.5 12" stroke="#e11d48" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M11.5 3.5 7 12" stroke="#e11d48" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function IconFontColor({ className, color = "#dc2626" }: IconProps & { color?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <text x="2" y="10.5" fontSize="9" fontFamily="Georgia, serif" fontWeight="700" fill="currentColor">A</text>
      <rect x="2" y="12" width="10" height="2.5" rx="0.5" fill={color} />
    </svg>
  );
}

export function IconHighlight({ className, color = "#facc15" }: IconProps & { color?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 12.5 7.5 3.5l4 4-4 9H3.5v-4Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <rect x="2" y="12" width="12" height="2.5" rx="0.5" fill={color} opacity="0.95" />
    </svg>
  );
}

export function IconSubscript({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1" y="10" fontSize="8" fontFamily="Georgia, serif" fontWeight="700">X</text>
      <text x="8.5" y="13" fontSize="5.5" fontFamily="Georgia, serif" fontWeight="700">2</text>
    </svg>
  );
}

export function IconSuperscript({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1" y="12" fontSize="8" fontFamily="Georgia, serif" fontWeight="700">X</text>
      <text x="8.5" y="7" fontSize="5.5" fontFamily="Georgia, serif" fontWeight="700">2</text>
    </svg>
  );
}

export function IconStrikethrough({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1.5" y="11" fontSize="8" fontFamily="Georgia, serif" fontWeight="700">ab</text>
      <rect x="1" y="7.5" width="14" height="1.25" rx="0.5" />
    </svg>
  );
}

export function IconChangeCase({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <text x="1" y="11" fontSize="8" fontFamily="Georgia, serif" fontWeight="700">Aa</text>
    </svg>
  );
}
