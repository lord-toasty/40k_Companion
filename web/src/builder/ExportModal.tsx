import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { Roster } from '../schema/army'
import { encodeRoster, shareLink } from './share'

type Tab = 'json' | 'link' | 'code' | 'qr'
const TABS: [Tab, string][] = [['json', 'JSON'], ['link', 'Link'], ['code', 'Code'], ['qr', 'QR Code']]

function CopyField({ value, rows = 3 }: { value: string; rows?: number }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* clipboard blocked: the field is selectable, so the user can copy by hand */
    }
  }
  return (
    <div className="share-field">
      <textarea readOnly rows={rows} value={value} onFocus={(e) => e.currentTarget.select()} />
      <button onClick={copy} disabled={!value}>{done ? 'Copied' : 'Copy'}</button>
    </div>
  )
}

/** Export the current list as a JSON file, a share link, a paste-able code or a QR code. */
export default function ExportModal({ roster, onClose }: { roster: Roster; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('link')
  const [code, setCode] = useState('')
  const [link, setLink] = useState('')
  const [qrError, setQrError] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let live = true
    encodeRoster(roster).then((c) => live && setCode(c))
    shareLink(roster).then((l) => live && setLink(l))
    return () => { live = false }
  }, [roster])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (tab !== 'qr' || !link || !canvas.current) return
    setQrError('')
    QRCode.toCanvas(canvas.current, link, { errorCorrectionLevel: 'L', margin: 2, width: 320 }).catch(() =>
      setQrError('This list is too large for a QR code. Use the link or code instead.'),
    )
  }, [tab, link])

  const download = () => {
    const data = { app: '40k-companion', version: 1, lists: [roster] }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${roster.name.replace(/[^\w-]+/g, '_') || 'list'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" role="dialog" aria-label="Export list" onClick={(e) => e.stopPropagation()}>
        <div className="ds-title">
          <h2>Export "{roster.name}"</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="tabs">
          {TABS.map(([t, name]) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{name}</button>)}
        </div>

        {tab === 'json' && (
          <>
            <p className="muted small">A file with the full list. Import it on any device from List Management.</p>
            <button className="share-primary" onClick={download}>Download JSON file</button>
          </>
        )}
        {tab === 'link' && (
          <>
            <p className="muted small">Open this link on another device to add the list there.</p>
            <CopyField value={link} />
          </>
        )}
        {tab === 'code' && (
          <>
            <p className="muted small">Paste this code into Import on another device.</p>
            <CopyField value={code} />
          </>
        )}
        {tab === 'qr' && (
          <>
            <p className="muted small">Scan with a phone camera to open the list.</p>
            {qrError ? <p className="cap-warn" role="alert">{qrError}</p> : <canvas ref={canvas} className="share-qr" />}
          </>
        )}
      </div>
    </div>
  )
}
