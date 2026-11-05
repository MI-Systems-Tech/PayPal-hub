import { useEffect, useRef, useState } from 'react'

const LINES = [
  'Tell it what you need. It finds the sites that fit.',
  'Check out with PayPal without leaving the Hub.',
  'The Guardian tracks subscriptions and flags charges you did not approve.',
  'You pick your income range. No bank logins, ever.'
]

export default function PinnedZoom({ still }) {
  const sec = useRef(null), txt = useRef(null)
  const [i, setI] = useState(-1)
  useEffect(() => {
    const run = () => {
      const r = sec.current.getBoundingClientRect()
      const p = still ? 0.5 : Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
      const q = Math.min(1, Math.max(0, (p - 0.1) / 0.2)), e = 1 - Math.pow(1 - q, 3)
      txt.current.style.transform = `scale(${2.2 - 1.2 * e})`
      txt.current.parentElement.style.opacity = Math.min(1, e * 3)
      setI(p < 0.3 ? -1 : Math.min(LINES.length - 1, Math.floor((p - 0.3) / 0.7 * LINES.length)))
    }
    run(); addEventListener('scroll', run, { passive: true }); addEventListener('resize', run)
    return () => { removeEventListener('scroll', run); removeEventListener('resize', run) }
  }, [still])
  return (
    <section className="pz" ref={sec}>
      <div className="pz-s">
        <video src="/videos/hub.mp4" autoPlay={!still} loop muted playsInline />
        <div className="pz-m"><span ref={txt}>Discover. Pay. Guard.</span></div>
        <div className="pz-t">
          {LINES.map((t, k) => <p key={k} className={k === i ? 'on' : k < i ? 'off' : ''}>{t}</p>)}
        </div>
      </div>
    </section>
  )
}
