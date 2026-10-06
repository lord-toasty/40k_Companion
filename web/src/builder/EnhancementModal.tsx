import { useEffect } from 'react'
import type { Enhancement } from '../schema/army'

/** Small popout with an enhancement's ability text. */
export default function EnhancementModal({ enhancement: e, detachment, onClose }: { enhancement: Enhancement; detachment: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gear-modal" role="dialog" aria-label={`${e.name} enhancement`} onClick={(ev) => ev.stopPropagation()}>
        <div className="ds-title">
          <h2>{e.name}</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="det-info enh-modal">
          <p className="muted small">Enhancement · {detachment} · <span className="vp">{e.points} pts</span></p>
          {e.aka && <p className="muted small">Also listed as "{e.aka}"</p>}
          <p>{e.text ?? 'No ability text yet.'}</p>
        </div>
      </div>
    </div>
  )
}
