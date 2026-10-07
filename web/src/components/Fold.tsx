import { useState, type ReactNode } from 'react'

/** A panel section whose title toggles it open (default) or closed. */
export default function Fold({ title, badge, children }: { title: ReactNode; badge?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section className={`fold ${open ? '' : 'shut'}`}>
      <h3 className="panel-title">
        <button className="fold-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="fold-arrow" aria-hidden="true">▾</span>
          <span className="fold-title">{title}</span>
          {badge}
        </button>
      </h3>
      {open && children}
    </section>
  )
}
