import { useEffect, useRef, useState } from 'react'
import { armies } from '../armies'
import { useBuilder } from '../store/builder'
import ExportModal from './ExportModal'
import ImportModal from './ImportModal'
import { rosterPoints } from './points'

/** Dropdown for the saved lists: switch, create, duplicate, delete, export and import. */
export default function ListMenu() {
  const b = useBuilder()
  const [open, setOpen] = useState(false)
  const [dialog, setDialog] = useState<'export' | 'import'>()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const lists = Object.entries(b.rosters).sort((x, y) => (y[1].updated ?? 0) - (x[1].updated ?? 0))
  const active = b.rosters[b.activeId]

  return (
    <div className="list-menu" ref={box}>
      <button className="list-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true">
        List Management ▾
      </button>
      {open && (
        <div className="list-pop" role="menu">
          <ul className="list-items">
            {lists.map(([id, r]) => (
              <li key={id} className={id === b.activeId ? 'on' : ''}>
                <button className="list-pick" onClick={() => { b.switchList(id); setOpen(false) }}>
                  <b>{r.name || 'Untitled'}</b>
                  <small>{armies[r.armyId]?.name} · {rosterPoints(armies[r.armyId], r)}/{r.limit} pts · {r.entries.length} units</small>
                </button>
                <button className="list-del" aria-label={`Delete ${r.name}`} title="Delete" onClick={() => confirm(`Delete "${r.name}"?`) && b.deleteList(id)}>✕</button>
              </li>
            ))}
          </ul>
          <div className="list-actions">
            <button onClick={() => { b.newList(); setOpen(false) }}>New list</button>
            <button onClick={b.duplicateList}>Duplicate</button>
            <button onClick={() => { setOpen(false); setDialog('export') }}>Export</button>
            <button onClick={() => { setOpen(false); setDialog('import') }}>Import</button>
          </div>
          <small className="muted">Lists are saved in this browser only. Use Export to back them up or move them to another device.</small>
        </div>
      )}
      {dialog === 'export' && active && <ExportModal roster={active} onClose={() => setDialog(undefined)} />}
      {dialog === 'import' && <ImportModal onClose={() => setDialog(undefined)} />}
    </div>
  )
}
