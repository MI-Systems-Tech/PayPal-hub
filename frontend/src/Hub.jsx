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

  useEffect(() => {
    api('/auth/me').then(d => setEmail(d.user.email)).catch(() => {})
  }, [])

  const out = () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    nav('/')
  }

  if (!rid) {
    return <Onboard onDone={id => { setRange(id); setRid(id) }} />
  }

  const r = RANGES.find(x => x.id === rid)
  const budget = Math.round(r.mid * 0.05)
  const total = subs.reduce((a, x) => a + x.price, 0)
  const results = subs.map(x => ({ ...x, ...verdict(x, budget) }))

  const counts = {
    keep: results.filter(x => x.v === 'Keep').length,
    review: results.filter(x => x.v === 'Review').length,
    cancel: results.filter(x => x.v === 'Cancel').length
  }

  const percentage = budget ? Math.min((total / budget) * 100, 100) : 0

  return (
    <main className="hb">
      <header className="hb-top">
        <Link className="hb-brand" to="/hub">PayPal Hub<span>.</span></Link>
        <nav className="hb-nav">
          <Link className="active" to="/hub">Overview</Link>
          <Link to="/discover">Discover</Link>
        </nav>
        <div className="hb-account">
          <span>{email}</span>
          <button className="pill line" onClick={out}>Sign out</button>
        </div>
      </header>

      <section className="dash">
        <div className="dash-heading">
          <div>
            <p className="dash-eyebrow">YOUR FINANCIAL SPACE</p>
            <h1>Your subscriptions<span>.</span></h1>
            <p className="dash-sub">A clearer view of what you pay for and what deserves your attention.</p>
          </div>
          <Link className="pill blue dash-discover" to="/discover">Explore services <span>↗</span></Link>
        </div>

        <div className="dash-demo">
          <span className="demo-dot" />
          DEMO ENVIRONMENT
          <span>Figures and subscriptions shown are sample data.</span>
        </div>

        <section className="dash-overview">
          <article className="dash-total">
            <div className="dash-card-label">TOTAL MONTHLY SUBSCRIPTIONS</div>
            <div className="dash-amount">{N(total)}</div>
            <p>Across {subs.length} sample subscriptions</p>
            <div className="dash-progress">
              <div className="dash-progress-top">
                <span>Guardian budget</span>
                <strong>{N(budget)}</strong>
              </div>
              <div className="dash-track">
                <span style={{ width: `${percentage}%` }} />
              </div>
              <div className="dash-progress-bottom">
                <span>{N(total)} spent</span>
                <span>{percentage >= 100 ? 'Budget reached' : `${Math.round(percentage)}% of budget`}</span>
              </div>
            </div>
          </article>

          <article className="dash-budget">
            <div className="dash-card-label">YOUR INCOME RANGE</div>
            <div className="dash-budget-value">{r.label}</div>
            <p>Guardian planning is based on a demo budget rule of 5% of the selected income midpoint.</p>
            <button className="dash-change" onClick={() => setRid(null)}>Change income range <span>→</span></button>
          </article>
        </section>

        <section className="guardian-panel">
          <div className="guardian-head">
            <div className="guardian-symbol">✳</div>
            <div>
              <p className="dash-eyebrow">YOUR SUBSCRIPTION ASSISTANT</p>
              <h2>Guardian overview</h2>
              <p>Review your sample subscriptions using recent usage and the demo budget rule.</p>
            </div>
          </div>
          <div className="guardian-stats">
            <div className="guardian-stat">
              <span className="status-dot keep-dot" />
              <strong>{counts.keep}</strong>
              <span>Keep</span>
            </div>
            <div className="guardian-stat">
              <span className="status-dot review-dot" />
              <strong>{counts.review}</strong>
              <span>Review</span>
            </div>
            <div className="guardian-stat">
              <span className="status-dot cancel-dot" />
              <strong>{counts.cancel}</strong>
              <span>Consider cancelling</span>
            </div>
          </div>
        </section>

        <section className="dash-subscriptions">
          <div className="dash-section-heading">
            <div>
              <p className="dash-eyebrow">YOUR RECURRING SERVICES</p>
              <h2>Subscription list</h2>
            </div>
            <span>{subs.length} sample items</span>
          </div>

          <div className="dash-list">
            {results.map(x => (
              <article className="dash-sub-card" key={x.id}>
                <div className="sub-avatar">{x.name.charAt(0)}</div>
                <div className="sub-info">
                  <strong>{x.name}</strong>
                  <span>{x.days === 0 ? 'Used today' : `Last used ${x.days} days ago`}</span>
                </div>
                <div className="sub-price">
                  <strong>{N(x.price)}</strong>
                  <span>per month</span>
                </div>
                <div className="sub-verdict">
                  <span className={`chip ${x.v.toLowerCase()}`}>{x.v}</span>
                  <small>{x.why}</small>
                </div>
                <button
                  className="sub-used"
                  onClick={() => setSubs(markUsed(x.id))}
                  disabled={x.days === 0}
                >
                  {x.days === 0 ? '✓ Used today' : 'Mark as used'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <footer className="dash-footer">
          <span>PayPal Hub · Subscription clarity, in one place.</span>
          <span>Hackathon prototype · Not affiliated with PayPal.</span>
        </footer>
      </section>
    </main>
  )
}
