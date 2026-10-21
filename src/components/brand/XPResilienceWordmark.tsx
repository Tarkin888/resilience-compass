interface Props {
  className?: string;
  title?: string;
}

/** Inline SVG so "Resilience" uses the page's Work Sans web font. Artwork must not be altered. */
export const XPResilienceWordmark = ({ className = "h-8 w-auto", title = "XPResilience" }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 480 120"
    role="img"
    aria-label={title}
    className={className}
    preserveAspectRatio="xMinYMid meet"
  >
    <title>{title}</title>
    <g
      transform="translate(20 18) scale(0.85) translate(-42 -54)"
      fill="none"
      stroke="#0B2050"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M 50 62 L 92 138 M 92 62 L 50 138" />
      <path d="M 118 62 V 138 M 118 62 H 136 A 22 22 0 0 1 136 106 H 118" />
    </g>
    <text
      x="124"
      y="82"
      fontFamily="Work Sans, Inter, Arial, sans-serif"
      fontSize="64"
      fontWeight="400"
      fill="#475569"
    >
      Resilience
    </text>
  </svg>
);

export default XPResilienceWordmark;
