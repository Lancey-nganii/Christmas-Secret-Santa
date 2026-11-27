interface HollyEmblemProps {
  size?: number;
  backdrop?: 'cream' | 'peach';
}

export function HollyEmblem({ size = 40, backdrop = 'cream' }: HollyEmblemProps) {
  const discFill = backdrop === 'peach' ? '#FFDEC3' : '#FFF8F0';
  const berryStroke = discFill;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <circle cx="24" cy="24" r="23" fill={discFill} />
      {/* Left scalloped holly leaf */}
      <path
        d="M23 26C19 20 15 16 10 15C11.2 18.6 10.6 21.2 7.5 23C10.5 25 10.5 28 8.5 31C13.5 30.8 18.5 29.5 23 26Z"
        fill="#008042"
      />
      <path
        d="M21 25.5C17.5 23 14 21.5 11 21"
        stroke="#005C2F"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {/* Right scalloped holly leaf */}
      <path
        d="M25 26C29 20 33 16 38 15C36.8 18.6 37.4 21.2 40.5 23C37.5 25 37.5 28 39.5 31C34.5 30.8 29.5 29.5 25 26Z"
        fill="#006835"
      />
      <path
        d="M27 25.5C30.5 23 34 21.5 37 21"
        stroke="#004C26"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {/* Three crisp berries with hairline separation */}
      <circle cx="20.2" cy="29.5" r="4" fill="#C73213" stroke={berryStroke} strokeWidth="1.4" />
      <circle cx="27.8" cy="29.5" r="4" fill="#C73213" stroke={berryStroke} strokeWidth="1.4" />
      <circle cx="24" cy="23.5" r="4.3" fill="#C73213" stroke={berryStroke} strokeWidth="1.4" />
    </svg>
  );
}
