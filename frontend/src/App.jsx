import { useRef, useState } from 'react'
import Card3D from './Card3D'
import PinnedZoom from './PinnedZoom'
import Sections from './Sections'

const still = matchMedia('(prefers-reduced-motion: reduce)').matches

function Hero() {
  const v = useRef(null)
  const [on, setOn] = useState(!still)
  const toggle = () => {
    const el = v.current
    if (el.paused) { el.play(); setOn(true) } else { el.pause(); setOn(false) }
  }
  return (
    <header className="hero">
      <video ref={v} src="/videos/hub.mp4" autoPlay={!still} loop muted playsInline />
      <div className="hero-in">
        <h1>PayPal Hub</h1>
        <p>Find it. Pay with PayPal. Let the <span className="grad">Guardian</span> watch your subscriptions.</p>
        <div className="btns">
          <a className="pill blue" href="/register">Get started</a>
          <a className="pill line" href="/login">Sign in</a>
        </div>
      </div>
      <button className="pause" onClick={toggle} aria-label={on ? 'Pause video' : 'Play video'}>{on ? '❚❚' : '▶'}</button>
    </header>
  )
}

export default function App() {
  return (
    <>
      <nav className="nav">
        <a href="/">PayPal Hub</a><a href="#features">Features</a>
        <a href="#guardian">Guardian</a><a href="/login">Sign in</a>
      </nav>
      <Card3D still={still} />
      <Hero />
      <section className="split" id="features">
        <div>
          <h2>Tell it what you need. <span className="grad">Pay</span> with PayPal.</h2>
          <p>One request finds the sites that fit. Checkout stays in the Hub.</p>
        </div>
        <div className="slot" data-card data-rx=".15" data-ry="-.35" />
      </section>
      <PinnedZoom still={still} />
      <Sections />
    </>
  )
}
