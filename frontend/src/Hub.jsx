import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, clearToken } from "./auth";
import { RANGES, getRange, setRange, getSubs, markUsed, removeSub, verdict } from "./mock";
import Onboard from "./Onboard";

const N = (n) => "₦" + n.toLocaleString("en-NG");

export default function Hub() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [rid, setRid] = useState(getRange());
  const [subs, setSubs] = useState(getSubs());

  useEffect(() => {
    api("/auth/me")
      .then((d) => setEmail(d.user.email))
      .catch(() => {});
  }, []);

  const out = () => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    nav("/");
  };

  if (!rid) {
    return (
      <Onboard
        onDone={(id) => {
          setRange(id);
          setRid(id);
        }}
      />
    );
  }

  const r = RANGES.find((x) => x.id === rid);
  const budget = Math.round(r.mid * 0.05);
  const total = subs.reduce((a, x) => a + x.price, 0);
  const results = subs.map((x) => ({ ...x, ...verdict(x, budget) }));
  const percentage = budget ? Math.round((total / budget) * 100) : 0;

  const attention = results.filter((x) => x.v !== "Keep");
  const keepCount = results.filter((x) => x.v === "Keep").length;

  return (
    <main className="hb ledger-page">
      <header className="hb-top ledger-top">
        <Link className="hb-brand" to="/hub">
          PayPal Hub<span>.</span>
        </Link>

        <nav className="hb-nav">
          <Link className="active" to="/hub">
            Overview
          </Link>
          <Link to="/discover">Discover</Link>
        </nav>

        <div className="hb-account">
          <span>{email}</span>
          <button className="pill line" onClick={out}>
            Sign out
          </button>
        </div>
      </header>

      <section className="ledger">
        <div className="ledger-heading">
          <div>
            <p className="ledger-kicker">SUBSCRIPTION MANAGEMENT</p>
            <h1>Your subscription ledger</h1>
            <p className="ledger-intro">
              Know what you pay for. Decide what is worth keeping.
            </p>
          </div>
          <Link className="ledger-link" to="/discover">
            Find a service <span>↗</span>
          </Link>
        </div>

        <div className="ledger-notice">
          <span className="ledger-notice-mark">i</span>
          <p>
            <strong>Prototype data</strong> — These are sample subscriptions
            stored in this browser. They are not imported from a live PayPal
            account.
          </p>
        </div>

        <section className="ledger-summary">
          <div className="ledger-spend">
            <p className="ledger-label">MONTHLY SUBSCRIPTION COST</p>
            <div className="ledger-total">{N(total)}</div>
            <p className="ledger-caption">
              Across {subs.length} sample services
            </p>
          </div>

          <div className="ledger-budget">
            <div className="ledger-budget-heading">
              <span className="ledger-label">PLANNING LIMIT</span>
              <button onClick={() => setRid(null)}>Edit income range</button>
            </div>
            <strong>{N(budget)}</strong>
            <p>
              Illustrative limit based on 5% of your selected income midpoint.
            </p>
            <div className="ledger-meter">
              <span style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <div className="ledger-meter-caption">
              <span>{percentage}% of planning limit</span>
              <span>{r.label}</span>
            </div>
          </div>
        </section>

        <section className="ledger-guardian">
          <div className="ledger-section-head">
            <div>
              <p className="ledger-kicker">GUARDIAN REVIEW</p>
              <h2>Where your attention may be needed</h2>
            </div>
            <span className="ledger-count">{attention.length} to review</span>
          </div>

          {attention.length === 0 ? (
            <p className="ledger-empty">
              No sample services currently need attention under the demo rules.
            </p>
          ) : (
            <div className="ledger-review-list">
              {attention.map((x) => (
                <div className="ledger-review-row" key={x.id}>
                  <div>
                    <strong>{x.name}</strong>
                    <p>{x.why}</p>
                  </div>
                  <span className={`ledger-status ${x.v.toLowerCase()}`}>
                    {x.v === "Cancel" ? "Consider cancelling" : "Review"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="ledger-method">
            Guardian uses sample last-used information and the illustrative
            planning limit. Its suggestions are prompts for review, not
            confirmed cancellation recommendations.
          </p>
        </section>

        <section className="ledger-records">
          <div className="ledger-section-head">
            <div>
              <p className="ledger-kicker">ALL SERVICES</p>
              <h2>Subscription records</h2>
            </div>
            <span className="ledger-count">
              {subs.length} records · {keepCount} marked keep
            </span>
          </div>

          <div className="ledger-table-wrap">
            <div className="ledger-table-head">
              <span>SERVICE</span>
              <span>MONTHLY COST</span>
              <span>LAST USED</span>
              <span>GUARDIAN</span>
              <span>ACTION</span>
            </div>

            {results.map((x) => (
              <article className="ledger-record" key={x.id}>
                <div className="ledger-service">
                  <span className="ledger-initial">{x.name.charAt(0)}</span>
                  <strong>{x.name}</strong>
                </div>

                <div className="ledger-price">
                  <strong>{N(x.price)}</strong>
                  <span>per month</span>
                </div>

                <div className="ledger-used">
                  {x.days === 0 ? "Today" : `${x.days} days ago`}
                </div>

                <div className="ledger-assessment">
                  <span className={`ledger-status ${x.v.toLowerCase()}`}>
                    {x.v === "Cancel" ? "Consider cancelling" : x.v}
                  </span>
                  <small>{x.why}</small>
                </div>

                <div className="ledger-action">
                  <button
                    onClick={() => setSubs(markUsed(x.id))}
                    disabled={x.days === 0}
                  >
                    {x.days === 0 ? "Used today ✓" : "Mark used"}
                  </button>
                </div>
                <details className="ledger-review-detail" style={{ gridColumn: "1 / -1" }}>
                  <summary>Review options</summary>
                  <p><strong>Guardian:</strong> {x.v} � {x.why}</p>
                  <p>Last recorded use: {x.days === 0 ? "Today" : `${x.days} days ago`}.</p>
                  <p>Removing this sample record does not cancel a real subscription or stop provider billing.</p>
                  <button onClick={() => setSubs(removeSub(x.id))}>Remove from tracker</button>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className="ledger-income">
          <div>
            <p className="ledger-kicker">PLANNING ASSUMPTION</p>
            <strong>Selected income range</strong>
            <p>{r.label}</p>
          </div>
          <button onClick={() => setRid(null)}>Change range ↗</button>
        </section>

        <footer className="ledger-footer">
          <span>PayPal Hub · Subscription clarity.</span>
          <span>Hackathon prototype · Not affiliated with PayPal.</span>
        </footer>
      </section>
    </main>
  );
}
