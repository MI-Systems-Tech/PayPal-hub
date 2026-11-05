import { useState } from 'react'

const bg = n => ({ backgroundImage: `url(/img/${n}.jpg), linear-gradient(135deg,#0a2a5e,#000)` })
const F = [
  ['Discover', 'Ask in plain words. Get sites ranked by fit.', 'discover'],
  ['Checkout', 'Pay with PayPal without leaving the Hub.', 'checkout'],
  ['Guardian', 'Subscriptions tracked. Unapproved charges flagged.', 'guardian'],
  ['Alerts', 'Everything that needs your attention, in one place.', 'alerts']
]

function Picker() {
  const [k, setK] = useState(0)
  return (
    <section className="over sec" id="guardian"><div className="wrap">
      <h2>Everything you need, <span className="grad">in one loop.</span></h2>
      <p className="sub">Discover, pay, track, review, save. Then discover again.</p>
      <div className="pick">
        <div className="pills">
          {F.map((f, i) => <button key={f[2]} className={'pl' + (i === k ? ' on' : '')} onClick={() => setK(i)}>{f[0]}</button>)}
        </div>
        <div className="panel">
          <div className="ph" style={bg(F[k][2])} />
          <div className="cap"><b>{F[k][0]}</b><span>{F[k][1]}</span></div>
        </div>
      </div>
    </div></section>
  )
}

const G = [
  ['w i', 'Ranked by fit.', ' Not by who pays.', 'fit'],
  ['', 'Pay with PayPal.', ' Checkout stays in the Hub.'],
  ['', 'Flags charges', ' you never approved.'],
  ['', 'Unused subscriptions,', ' caught every month.'],
  ['', 'No bank logins.', ' You choose your income range.'],
  ['', 'Alerts in one place.', ' Read, then dismiss.'],
  ['w i', 'Keep or cancel.', ' With a reason, not a guess.', 'verdict']
]

function Grid() {
  return (
    <section className="over light sec"><div className="wrap">
      <h2>Built around you, <span className="grad">not around who pays.</span></h2>
      <div className="grid">
        {G.map(([c, a, b, img], i) => (
          <div key={i} className={'gc ' + c}>
            {img && <div className="ph" style={bg(img)} />}
            <h3><b>{a}</b>{b}</h3>
          </div>
        ))}
      </div>
    </div></section>
  )
}

function Privacy() {
  return (
    <section className="over sec"><div className="wrap priv">
      <div>
        <h2>Your money stays <span className="grad">yours.</span></h2>
        <p className="sub">You pick an income range. The Hub never asks for bank logins or account balances.</p>
      </div>
      <div className="panel"><div className="ph" style={bg('privacy')} /></div>
    </div></section>
  )
}

function Cta() {
  return (
    <section className="over light sec cta"><div className="wrap">
      <h2>Start with your first request.</h2>
      <p className="sub">Create an account and tell the Hub what you need.</p>
      <div className="btns">
        <a className="pill blue" href="/register">Create account</a>
        <a className="pill line" href="/login">Sign in</a>
      </div>
    </div></section>
  )
}

function Foot() {
  return (
    <footer className="over light foot"><div className="wrap">
      <div className="fcols">
        <div><b>Product</b><a href="#features">Features</a><a href="#guardian">Guardian</a></div>
        <div><b>Account</b><a href="/login">Sign in</a><a href="/register">Create account</a></div>
        <div><b>Project</b><span>PayPal AI Hackathon 2026</span></div>
      </div>
      <small>PayPal Hub is a hackathon project. It is not affiliated with or endorsed by PayPal.</small>
    </div></footer>
  )
}

export default function Sections() {
  return (<><Picker /><Grid /><Privacy /><Cta /><Foot /></>)
}
