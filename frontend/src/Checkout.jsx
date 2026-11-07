import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCat, usd, demoPay } from './mock'

const N = n => '₦' + n.toLocaleString('en-NG')

export default function Checkout() {
  const c = getCat(useParams().id), [o, setO] = useState(null)
  if (!c) return <main className="hb"><section className="hb-in"><h1>Item not found</h1><Link to="/discover">Back to Discover</Link></section></main>
  return (
    <main className="hb">
      <header className="hb-top"><b>PayPal Hub</b><Link to="/discover">Discover</Link><Link to="/hub">Subscriptions</Link></header>
      <section className="hb-in co">
        <h1>{o ? 'Order recorded' : 'Checkout'}</h1>
        <p className="hb-n">Demo checkout. No real payment is made and no PayPal account is used.</p>
        <div className="co-c">
          <div className="co-r"><span>{c.name}</span><b>{N(c.price)} / month</b></div>
          <div className="co-r"><span>Charged in USD (rate ₦1,329 per $, 10 Oct 2026)</span><b>≈ ${usd(c.price)}</b></div>
          {!o && <button className="pill blue" onClick={() => setO(demoPay(c))}>Confirm demo payment</button>}
          {o && <>
            <p className="co-ok">Reference {o.ref} (demo). Nothing was charged.</p>
            <p className="hb-n">{c.name} was added to your subscriptions. The Guardian will track it from here.</p>
            <div className="co-b"><Link className="pill blue" to="/hub">View subscriptions</Link><Link className="pill line" to="/discover">Keep exploring</Link></div>
          </>}
        </div>
      </section>
    </main>
  )
}
