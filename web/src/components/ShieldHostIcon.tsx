/** Marks a Shield Host detachment (an army can include only one). Inline SVG so phones don't swap in an emoji. */
export default function ShieldHostIcon({ title = 'Shield Host: only one can be taken' }: { title?: string }) {
  return (
    <span className="shield-host" title={title} role="img" aria-label={title}>
      <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
      </svg>
    </span>
  )
}
