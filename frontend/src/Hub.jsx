import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, clearToken } from "./auth";
import {
  RANGES,
  getRange,
  setRange,
  getSubs,
  markUsed,
  removeSub,
  verdict,
} from "./mock";
import Onboard from "./Onboard";

const N = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

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

  const changeRange = () => setRid(null);

  const handleRemove = (id, name) => {
    const confirmed = window.confirm(
      `Remove ${name} from your sample tracker? This will not cancel the provider subscription or stop billing.`
    );
    if (confirmed) setSubs(removeSub(id));
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
  const total = subs.reduce((sum, item) => sum + item.price, 0);
  const results = subs.map((item) => ({
    ...item,
    ...verdict(item, budget),
  }));

  const attention = results.filter((item) => item.v !== "Keep");
  const keepCount = results.filter((item) => item.v === "Keep").length;
  const percentage = budget ? Math.round((total / budget) * 100) : 0;

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
          <Link to="/checkout/c1">Checkout demo</Link>
        </nav>

        <div className="hb-account">
          {email && <span>{email}</span>}
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
              See what you spend. Review what you use. Make informed decisions.
            </p>
          </div>
          <Link className="ledger-link" to="/discover">
            Discover services <span>↗</span>
          </Link>
        </div>

        <div className="ledger-notice">
          <span className="ledger-notice-mark">i</span>
          <p>
            <strong>Sample account data.</strong> These records are stored in
            this browser. They have not been imported from PayPal or verified
            with service providers.
          </p>
        </div>

        <section className="ledger-summary">
          <div className="ledger-spend">
            <p className="ledger-label">TOTAL MONTHLY SAMPLE SPEND</p>
            <div className="ledger-total">{N(total)}</div>
            <p className="ledger-caption">
              {subs.length} {subs.length === 1 ? "record" : "records"} in your
              tracker
            </p>
          </div>

          <div className="ledger-budget">
            <div className="ledger-budget-heading">
              <span className="ledger-label">ILLUSTRATIVE PLANNING LIMIT</span>
              <button onClick={changeRange}>Change income range</button>
            </div>
            <strong>{N(budget)}</strong>
            <p>
              A planning assumption calculated as 5% of the midpoint of your
              selected income range. It is not a financial recommendation.
            </p>
            <div
              className="ledger-meter"
              role="progressbar"
              aria-label="Sample spending compared with planning limit"
              aria-valuenow={Math.min(percentage, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
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
              <h2>Records that may need your attention</h2>
              <p className="ledger-section-description">
                A prompt to inspect your subscriptions, not an instruction to
                cancel them.
              </p>
            </div>
            <span className="ledger-count">{attention.length} to review</span>
          </div>

          {attention.length === 0 ? (
            <p className="ledger-empty">
              No sample records currently meet the demo rules for review.
            </p>
          ) : (
            <div className="ledger-review-list">
              {attention.map((item) => (
                <div className="ledger-review-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.why}</p>
                  </div>
                  <span className={`ledger-status ${item.v.toLowerCase()}`}>
                    {item.v === "Cancel" ? "Consider reviewing" : "Review"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="ledger-method">
            Demo method: Guardian uses manually stored last-use information and
            the illustrative planning limit. It does not access provider usage,
            billing records or cancellation systems.
          </p>
        </section>

        <section className="ledger-records">
          <div className="ledger-section-head">
            <div>
              <p className="ledger-kicker">YOUR TRACKER</p>
              <h2>Subscription records</h2>
              <p className="ledger-section-description">
                Review the sample cost and last recorded use of each service.
              </p>
            </div>
            <span className="ledger-count">
              {subs.length} records · {keepCount} marked keep
            </span>
          </div>

          {results.length === 0 ? (
            <div className="ledger-empty">
              <h3>Your tracker is empty.</h3>
              <p>
                Add a sample service from Discover to start reviewing records.
              </p>
              <Link className="ledger-link" to="/discover">
                Explore services ↗
              </Link>
            </div>
          ) : (
            <div className="ledger-table-wrap">
              <div className="ledger-table-head">
                <span>SERVICE</span>
                <span>MONTHLY COST</span>
                <span>LAST RECORDED USE</span>
                <span>GUARDIAN REVIEW</span>
                <span>ACTION</span>
              </div>

              {results.map((item) => (
                <article className="ledger-record" key={item.id}>
                  <div className="ledger-service">
                    <span className="ledger-initial">
                      {item.name.charAt(0)}
                    </span>
                    <strong>{item.name}</strong>
                  </div>

                  <div className="ledger-price">
                    <strong>{N(item.price)}</strong>
                    <span>sample monthly cost</span>
                  </div>

                  <div className="ledger-used">
                    {item.days === 0 ? "Today" : `${item.days} days ago`}
                  </div>

                  <div className="ledger-assessment">
                    <span className={`ledger-status ${item.v.toLowerCase()}`}>
                      {item.v === "Cancel" ? "Review usage" : item.v}
                    </span>
                    <small>{item.why}</small>
                  </div>

                  <div className="ledger-action">
                    <button
                      onClick={() => setSubs(markUsed(item.id))}
                      disabled={item.days === 0}
                    >
                      {item.days === 0 ? "Used today ✓" : "Mark as used"}
                    </button>
                  </div>

                  <details className="ledger-review-detail">
                    <summary>Inspect this record</summary>
                    <div className="ledger-detail-content">
                      <p>
                        <strong>Guardian assessment:</strong> {item.v}
                      </p>
                      <p>
                        <strong>Reason:</strong> {item.why}
                      </p>
                      <p>
                        <strong>Last recorded use:</strong>{" "}
                        {item.days === 0 ? "Today" : `${item.days} days ago`}
                      </p>
                      <p>
                        This is a manually maintained sample record. Removing it
                        from Hub does not cancel the subscription or stop
                        provider billing.
                      </p>
                      <button
                        className="ledger-remove"
                        onClick={() => handleRemove(item.id, item.name)}
                      >
                        Remove from tracker
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="ledger-income">
          <div>
            <p className="ledger-kicker">YOUR PLANNING SETTING</p>
            <strong>Selected income range</strong>
            <p>{r.label}</p>
          </div>
          <button onClick={changeRange}>Edit setting ↗</button>
        </section>

        <footer className="ledger-footer">
          <span>PayPal Hub · Subscription clarity.</span>
          <span>Hackathon prototype · Not affiliated with PayPal.</span>
        </footer>
      </section>
    </main>
  );
}
