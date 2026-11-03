import { useEffect, useRef } from 'react'
import Card3D from './Card3D.jsx'

const RATE = 1329 // naira per US dollar, 10 Oct 2026
const both = n => `₦${n.toLocaleString('en-NG')} (about $${(n / RATE).toFixed(2)})`
const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const steps = [
  ['Discover', 'Describe what you need and your budget. The Hub recommends sites that fit.'],
  ['Pay', 'Check out with PayPal where the site supports it.'],
  ['Track', 'Subscriptions you pay for are listed in one place.'],
  ['Review', 'Each month the Guardian checks whether you still use them, then you decide.'],
]
const rows = [
  ['Video editor', both(8500), 'Last opened 41 days ago', 'Suggest: cancel'],
  ['Music streaming', both(2900), 'Last opened 6 days ago', 'Suggest: keep'],
  ['Unknown merchant', both(15000), 'You did not approve this charge', 'Review now'],
]

export default function App() {
  const ring = useRef(null)
  useEffect(() => {
    if (still) return
    let raf, tick = false
    const onScroll = () => { if (!tick) { tick = true; raf = requestAnimationFrame(() => { document.documentElement.style.setProperty('--sy', scrollY); tick = false }) } }
    addEventListener('scroll', onScroll, { passive: true })
    const fine = matchMedia('(pointer: fine)').matches
    const p = { x: -99, y: -99 }, r = { x: -99, y: -99 }
    const move = e => { p.x = e.clientX; p.y = e.clientY; ring.current?.classList.toggle('big', !!e.target.closest('a,button')) }
    let loop
    if (fine) {
      addEventListener('pointermove', move, { passive: true })
      const f = () => { r.x += (p.x - r.x) * 0.18; r.y += (p.y - r.y) * 0.18
        if (ring.current) ring.current.style.transform = `translate(${r.x}px,${r.y}px) translate(-50%,-50%)`
        loop = requestAnimationFrame(f) }
      f()
    }
    return () => { removeEventListener('scroll', onScroll); removeEventListener('pointermove', move); cancelAnimationFrame(raf); cancelAnimationFrame(loop) }
  }, [])

  return (
    <>
      <div className="ring" ref={ring} aria-hidden="true" />
      <header className="nav">
        <a className="brand" href="/">PayPal Hub</a>
        <nav aria-label="Main">
          <a href="#how">How it works</a><a href="#guardian">Guardian</a><a href="#privacy">Privacy</a><a href="#limits">Limits</a>
        </nav>
        <div className="nav-cta"><a href="/login">Sign in</a><a className="btn small" href="/register">Create account</a></div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <h1>Find what you need. Pay with PayPal. Keep your subscriptions in check.</h1>
            <p>Say you want a video editing tool under {both(10000)} a month. The Hub recommends sites that fit, and the Guardian watches what you already pay for and flags charges you did not approve.</p>
            <a className="btn" href="/register">Create your account</a>
            <p className="note">Prototype built for the PayPal AI Hackathon.</p>
          </div>
          <div className="stage"><Card3D still={still} /></div>
        </section>

        <section id="how" className="sec">
          <h2>One loop, from search to savings</h2>
          <ol className="steps">
            {steps.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
          </ol>
          <p className="after">Then you discover again, with more money left over.</p>
        </section>

        <section id="guardian" className="sec split">
          <div>
            <h2>The Guardian reads your subscriptions, not your bank</h2>
            <p>Each month it compares what you pay with how often you use it, using the monthly income range you chose. It suggests keep or cancel and explains why. Charges you never approved are flagged straight away.</p>
          </div>
          <div className="panel" aria-label="Sample Guardian review">
            <p className="tag">Sample data, not from a real account</p>
            {rows.map(([n, a, u, v]) => (
              <div className="row" key={n}><div><b>{n}</b><span>{a}</span><span>{u}</span></div><strong>{v}</strong></div>
            ))}
          </div>
        </section>

        <section id="privacy" className="sec">
          <h2>You choose what the Hub knows</h2>
          <p className="wide">You pick your own income range. The Hub never asks for bank logins or account balances. Recommendations are ranked by how well they fit you, not by who pays for placement.</p>
        </section>

        <section id="limits" className="sec">
          <h2>What the Hub cannot promise</h2>
          <p className="wide">Some sites block automated search, so the Hub will not see every option. PayPal checkout only works where a site supports it. AI recommendations can be wrong, so each one links to its source for you to check before you pay.</p>
        </section>

        <section className="sec cta">
          <h2>Start with your first request</h2>
          <a className="btn" href="/register">Create your account</a>
        </section>
      </main>

      <footer><span>PayPal Hub, a hackathon prototype.</span><span>Dollar amounts use ₦{RATE.toLocaleString()} per $1, the rate on 10 Oct 2026.</span></footer>
    </>
  )
}
