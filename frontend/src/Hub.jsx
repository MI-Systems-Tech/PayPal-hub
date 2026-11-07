import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, clearToken } from './auth'
import { RANGES, getRange, setRange, getSubs, markUsed, verdict } from './mock'
import Onboard from './Onboard'

const N = n => '₦' + n.toLocaleString('en-NG')

export default function Hub() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [rid, setRid] = useState(getRange())
  const [subs, setSubs] = useState(getSubs())
  useEffect(() => { api('/auth/me').then(d => setEmail(d.user.email)).catch(() => {}) }, [])
  const out = () => { api('/auth/logout', { method: 'POST' }).catch(() => {}); clearToken(); nav('/') }
  if (!rid) return <Onboard onDone={id => { setRange(id); setRid(id) }} />
  const r = RANGES.find(x => x.id === rid), budget = Math.round(r.mid * 0.05)
  const total = subs.reduce((a, x) => a + x.price, 0)
  return (
    <main className="hb">
      <header className="hb-top"><b>PayPal Hub</b><Link to="/discover">Discover</Link><span>{email}</span><button className="pill line" onClick={out}>Sign out</button></header>
      <section className="hb-in">
        <h1>Your subscriptions</h1>
        <p className="hb-n">Sample data. Your real subscriptions appear once the backend is connected.</p>
        <div className="hb-sum">
          <div><small>Monthly total</small><b>{N(total)}</b></div>
          <div><small>Guardian budget (demo rule: 5%)</small><b>{N(budget)}</b></div>
          <div><small>Income range</small><b>{r.label}</b><button className="hb-c" onClick={() => setRid(null)}>Change</button></div>
        </div>
        <ul className="hb-l">
          {subs.map(x => { const v = verdict(x, budget); return (
            <li key={x.id} className="hb-i">
              <div><b>{x.name}</b><small>{N(x.price)} / month · {x.days ? `last used ${x.days} days ago` : 'used today'}</small></div>
              <div className="hb-v"><span className={'chip ' + v.v.toLowerCase()}>{v.v}</span><small>{v.why}</small></div>
              <button className="pill line" onClick={() => setSubs(markUsed(x.id))}>Used it today</button>
            </li>) })}
        </ul>
      </section>
    </main>
  )
}
