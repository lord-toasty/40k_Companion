import { useEffect, useRef, useState } from 'react'
import { importAny } from './share'

/** Add a list from a pasted code or link, or from a JSON file. Always adds a new list. */
export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>()
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async (input: string) => {
    try {
      const r = await importAny(input)
      setMsg({ ok: true, text: `Imported ${r.name}.${r.skipped ? ` ${r.skipped} unit${r.skipped === 1 ? '' : 's'} skipped (no longer available).` : ''}` })
      setText('')
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not read that.' })
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" role="dialog" aria-label="Import list" onClick={(e) => e.stopPropagation()}>
        <div className="ds-title">
          <h2>Import a list</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="muted small">Paste a list code or share link. Imported lists are added as new lists; nothing is overwritten.</p>
        <textarea rows={4} value={text} placeholder="K1.…" onChange={(e) => setText(e.target.value)} aria-label="List code or link" />
        <div className="list-actions">
          <button className="share-primary" disabled={!text.trim()} onClick={() => run(text)}>Import</button>
          <button onClick={() => file.current?.click()}>Choose JSON file</button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) await run(await f.text())
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p className={msg.ok ? 'list-msg' : 'cap-warn'} role="status">{msg.text}</p>}
      </div>
    </div>
  )
}
