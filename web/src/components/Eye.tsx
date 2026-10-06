/** Little eye button that opens a popout. Stops the click from selecting the row it sits in. */
export default function Eye({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="icon" onClick={(e) => { e.stopPropagation(); onClick() }} aria-label={`View ${label}`} title="View details">
      {/* inline SVG: the 👁 character becomes a colour emoji on phones */}
      <svg className="eye-svg" viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  )
}
