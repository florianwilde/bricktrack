/** The app mark: a 2x1 brick in the design's logo colour. */
export function BrickLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 32" aria-hidden className={className}>
      <g
        style={{
          fill: 'var(--logo, var(--primary))',
          stroke: 'var(--edge)',
          strokeWidth: 'var(--edge-w)',
        }}
      >
        <rect x="9" y="2" width="8" height="8" rx="2.5" />
        <rect x="21" y="2" width="8" height="8" rx="2.5" />
        <rect x="2" y="8" width="34" height="22" rx="6" />
      </g>
    </svg>
  );
}
