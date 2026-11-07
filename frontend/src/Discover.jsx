import { useState } from 'react'
import { Link } from 'react-router-dom'
import { discover } from './mock'

const N = n => '₦' + n.toLocaleString('en-NG')

export default function Discover() {
  const [q, setQ] = useState(''), [res, setRes] = useState(null)
  return (
    <main className="hb">
      <header className="hb-top"><b>PayPal Hub</b><Link to="/hub">Subscriptions</Link></header>
      <section className="hb-in">
        <h1>What do you need?</h1>
        <p className="hb-n">Sample catalog. The AI engine replaces it once the backend is connected.</p>
        <form className="dc-f" onSubmit={e => { e.preventDefault(); setRes(discover(q)) }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. video editing tool under ₦10,000" aria-label="What do you need" />
          <button className="pill blue" disabled={!q.trim()}>Find</button>
        </form>
        {res && !res.length && <p className="hb-n">No sample match. Try video editing, music, cloud storage, design or VPN.</p>}
        <ul className="hb-l">
          {(res || []).map((c, i) => (
            <li key={c.id} className="dc-i">
              <div><small>#{i + 1} best fit</small><b>{c.name}</b><p>{c.why}</p></div>
              <div className="dc-r"><b>{N(c.price)}<small> / month</small></b>
                {c.pp ? <Link className="pill blue" to={'/checkout/' + c.id}>Check out</Link> : <span className="chip review">No PayPal yet</span>}
              </div>
            </li>))}
        </ul>
      </section>
    </main>
  )
}
