import { useEffect, useRef } from 'react'
import Card3D from './Card3D.jsx'
import Spend from './Spend.jsx'

const RATE = 1329 // naira per US dollar, 10 Oct 2026
const both = n => `₦${n.toLocaleString('en-NG')} (about $${(n / RATE).toFixed(2)})`
const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function Photo({ src, alt, cls = '' }) {
  return <img className={'photo ' + cls} src={src} alt={alt} loading="lazy" onError={e => e.currentTarget.remove()} />
}

export default function App() {
  const ring = useRef(null)
  useEffect(() => {
    if (still) return
    let raf, tick = false, loop
    const onScroll = () => { if (!tick) { tick = true; raf = requestAnimationFrame(() => { document.documentElement.style.setProperty('--sy', scrollY); tick = false }) } }
    addEventListener('scroll', onScroll, { passive: true })
    const p = { x: -99, y: -99 }, r = { x: -99, y: -99 }
    const move = e => { p.x = e.clientX; p.y = e.clientY; ring.current?.classList.toggle('big', !!e.target.closest('a,button')) }
    if (matchMedia('(pointer: fine)').matches) {
      addEventListener('pointermove', move, { passive: true })
      const f = () => { r.x += (p.x - r.x) * 0.18; r.y += (p.y - r.y) * 0.18
        if (ring.current) ring.current.style.transform = `translate(${r.x}px,${r.y}px) translate(-50%,-50%)`
        loop = requestAnimationFrame(f) }
      f()
    }
    return () => { removeEventListener('scroll', onScroll); removeEventListener('pointermove', move); cancelAnimationFrame(raf); cancelAnimationFrame(loop) }
  }, [])

  return (
    <div className={still ? 'still' : ''}>
      <div className="ring" ref={ring} aria-hidden="true" />
      <div className="scene"><Card3D still={still} /></div>
      <header className="nav">
        <a className="brand" href="/">PayPal Hub</a>
        <div className="nav-cta"><a href="/login">Sign in</a><a className="btn small" href="/register">Create account</a></div>
      </header>

      <main>
        <section className="ch hero">
          <div className="copy">
            <h1>Find it. Pay for it. Stop paying for what you forgot.</h1>
            <p>PayPal Hub recommends sites that fit your budget, takes you through checkout with PayPal, and flags subscriptions you no longer use.</p>
            <a className="btn" href="/register">Create your account</a>
          </div>
        </section>

        <section className="ch" id="discover">
          <Photo src="/images/laptop.jpg" alt="A laptop on a dark desk, one example of a product the Hub can help you find" />
          <Photo cls="small" src="/images/headphones.jpg" alt="Headphones on a dark surface, another example product category" />
          <div className="copy">
            <h2>Say what you need.</h2>
            <p>A video editing tool under {both(10000)} a month? The Hub looks for sites that fit and links every recommendation to its source.</p>
            <p className="fine">Photos show product categories as examples. They are not our merchants.</p>
          </div>
        </section>

        <section className="ch right" id="pay">
          <Photo src="/images/phone.jpg" alt="A smartphone on a dark surface, an example of checking out on a phone" />
          <div className="copy">
            <h2>Pay with PayPal, where it is supported.</h2>
            <p>Where a site accepts PayPal, you check out with the account you already trust. Where it does not, the Hub tells you before you click.</p>
          </div>
        </section>

        <section className="ch right g" id="guardian">
          <div className="copy">
            <h2>Watch your subscriptions, not your bank.</h2>
            <p>Each month the Guardian compares what you pay with what you use, based on the income range you chose, and suggests keep or cancel. Charges you did not approve are flagged straight away.</p>
          </div>
          <figure className="chart">
            <Spend still={still} />
            <figcaption>Sample data. Monthly subscription spend: {both(29000)} before cancelling two unused subscriptions, {both(18000)} after.</figcaption>
          </figure>
        </section>

        <section className="ch" id="privacy">
          <Photo src="/images/trails.jpg" alt="Abstract blue light trails on a dark background" />
          <div className="copy">
            <h2>You choose what it knows.</h2>
            <p>You pick an income range. The Hub never asks for bank logins or balances, and it ranks recommendations by fit, not by who pays.</p>
            <p className="fine">It cannot see every site, and AI can be wrong, so every recommendation links to its source for you to check.</p>
          </div>
        </section>

        <section className="ch center" id="start">
          <div className="copy">
            <h2>Start with your first request.</h2>
            <a className="btn" href="/register">Create your account</a>
          </div>
        </section>
      </main>

      <footer>
        <span>PayPal Hub, a prototype built for the PayPal AI Hackathon. Photos from Unsplash.</span>
        <span>Dollar amounts use ₦{RATE.toLocaleString()} per $1, the rate on 10 Oct 2026.</span>
      </footer>
    </div>
  )
}
