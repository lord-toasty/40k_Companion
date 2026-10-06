import { useEffect, useRef } from 'react'

const SCRIPT_SRC = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js'
const SLUG = 'lordtoasty'

type Widget = (text: string, slug: string, color: string, emoji: string, font: string, fontColor: string, outline: string, coffee: string) => string
const widget = () => (window as unknown as { bmcBtnWidget?: Widget }).bmcBtnWidget

/**
 * The official Buy Me a Coffee button. The embed script normally calls document.write, which would wipe a
 * React page, so this loads it without its `data-name` hook (it then only defines `bmcBtnWidget`) and puts
 * the markup it returns into a container. Until it loads, a plain link shows.
 */
export default function BuyMeCoffee({ small = false }: { small?: boolean }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const render = () => {
      const w = widget()
      if (w && box.current) box.current.innerHTML = w('Buy me a coffee', SLUG, '#b89630', '', 'Cookie', '#000000', '#000000', '#FFDD00')
    }
    if (widget()) return render()
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!s) {
      s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      document.body.appendChild(s)
    }
    s.addEventListener('load', render)
    return () => s.removeEventListener('load', render)
  }, [])

  return (
    <div ref={box} className={small ? 'bmc-small' : undefined}>
      <a href={`https://buymeacoffee.com/${SLUG}`} target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
    </div>
  )
}
