import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCat, usd, demoPay } from "./mock";

const N = (n) => "₦" + n.toLocaleString("en-NG");

export default function Checkout() {
  const c = getCat(useParams().id);
  const [order, setOrder] = useState(null);

  if (!c) {
    return (
      <main className="hb ledger-page">
        <header className="hb-top ledger-top">
          <Link className="hb-brand" to="/hub">
            PayPal Hub<span>.</span>
          </Link>
        </header>
        <section className="checkout-page">
          <p className="ledger-kicker">CHECKOUT</p>
          <h1>Service not found</h1>
          <p>This service is not in the current sample catalogue.</p>
          <Link className="checkout-back" to="/discover">
            Return to Discover ↗
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="hb ledger-page">
      <header className="hb-top ledger-top">
        <Link className="hb-brand" to="/hub">
          PayPal Hub<span>.</span>
        </Link>
        <nav className="hb-nav">
          <Link to="/hub">Overview</Link>
          <Link to="/discover">Discover</Link>
        </nav>
      </header>

      <section className="checkout-page">
        <div className="checkout-heading">
          <p className="ledger-kicker">PAYMENT REVIEW · PROTOTYPE</p>
          <h1>
            {order ? "Demo transaction recorded." : "Review your selection."}
          </h1>
          <p>
            {order
              ? "Your sample transaction has been recorded in this browser."
              : "Check the service and pricing before continuing."}
          </p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-main">
            <p className="ledger-kicker">SELECTED SERVICE</p>
            <div className="checkout-service">
              <div>
                <h2>{c.name}</h2>
                <p>Recurring service · Monthly plan</p>
              </div>
              <strong>
                {N(c.price)}
                <small> / month</small>
              </strong>
            </div>

            <div className="checkout-details">
              <div>
                <span>Monthly price</span>
                <strong>{N(c.price)}</strong>
              </div>
              <div>
                <span>Illustrative USD equivalent</span>
                <strong>≈ ${usd(c.price)}</strong>
              </div>
              <div>
                <span>Exchange-rate assumption</span>
                <strong>₦1,329 / USD</strong>
              </div>
            </div>

            <p className="checkout-rate-note">
              The exchange rate is a fixed sample value in this prototype, dated
              10 October 2026. It is not a live conversion or a confirmed PayPal
              exchange rate.
            </p>

            {!order ? (
              <div className="checkout-confirm">
                <p>
                  Confirming below records a simulated purchase and adds this
                  service to your sample subscription list. No money will be
                  taken.
                </p>
                <button onClick={() => setOrder(demoPay(c))}>
                  Confirm demo transaction
                </button>
              </div>
            ) : (
              <div className="checkout-success">
                <p className="ledger-kicker">DEMO RESULT</p>
                <h2>Transaction recorded</h2>
                <div className="checkout-reference">
                  <span>Demo reference</span>
                  <strong>{order.ref}</strong>
                </div>
                <p>
                  {c.name} has been added to your sample subscription list. No
                  PayPal payment was initiated and nothing was charged.
                </p>
                <Link className="checkout-primary-link" to="/hub">
                  View subscription ledger ↗
                </Link>
              </div>
            )}
          </section>

          <aside className="checkout-aside">
            <p className="ledger-kicker">IMPORTANT</p>
            <h2>This is a payment simulation.</h2>
            <p>
              This prototype does not connect to PayPal checkout or initiate a
              real recurring billing agreement.
            </p>
            <ul>
              <li>No money is charged.</li>
              <li>No real subscription is created with the provider.</li>
              <li>The sample record is stored in this browser.</li>
            </ul>
            <Link to="/discover" className="checkout-back">
              ← Back to Discover
            </Link>
          </aside>
        </div>

        <footer className="ledger-footer">
          <span>PayPal Hub · Subscription clarity.</span>
          <span>Hackathon prototype · Not affiliated with PayPal.</span>
        </footer>
      </section>
    </main>
  );
}
