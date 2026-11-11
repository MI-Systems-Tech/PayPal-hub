import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCat, demoPay } from "./mock";

const CURRENCIES = [
  { code: "NGN", label: "Nigerian naira (NGN)" },
  { code: "USD", label: "US dollar (USD)" },
  { code: "GBP", label: "British pound (GBP)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "CAD", label: "Canadian dollar (CAD)" },
  { code: "GHS", label: "Ghanaian cedi (GHS)" },
  { code: "ZAR", label: "South African rand (ZAR)" },
  { code: "KES", label: "Kenyan shilling (KES)" },
  { code: "INR", label: "Indian rupee (INR)" },
];

const COUNTRIES = [
  "Nigeria",
  "United States",
  "United Kingdom",
  "Canada",
  "Ghana",
  "South Africa",
  "Kenya",
  "India",
  "Other",
];

const SYMBOLS = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  GHS: "GH₵",
  ZAR: "R",
  KES: "KSh",
  INR: "₹",
};

function formatAmount(amount, currency) {
  return `${SYMBOLS[currency] || currency + " "}${Number(amount).toLocaleString(
    "en-US"
  )}`;
}

export default function Checkout() {
  const { id } = useParams();
  const c = getCat(id);

  const [currency, setCurrency] = useState("NGN");
  const [country, setCountry] = useState("Nigeria");
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
          <Link className="active" to="/checkout/c1">Checkout demo</Link>
        </nav>
      </header>

      <section className="checkout-page">
        <div className="checkout-heading">
          <p className="ledger-kicker">PAYMENT REVIEW · DEMO</p>
          <h1>
            {order
              ? "Demo transaction recorded."
              : "Review before you proceed."}
          </h1>
          <p>
            {order
              ? "Your simulated transaction has been saved in this browser."
              : "Review the sample service and your payment preferences."}
          </p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-main">
            <p className="ledger-kicker">SELECTED SERVICE</p>

            <div className="checkout-service">
              <div>
                <h2>{c.name}</h2>
                <p>Illustrative sample service · Not a live provider listing</p>
              </div>
              <strong>
                {formatAmount(c.price, "NGN")}
                <small> sample amount</small>
              </strong>
            </div>

            <div className="checkout-details">
              <div>
                <span>Sample catalogue amount</span>
                <strong>{formatAmount(c.price, "NGN")}</strong>
              </div>
              <div>
                <span>Selected display currency</span>
                <strong>{currency}</strong>
              </div>
            </div>

            <div className="checkout-preferences">
              <label htmlFor="checkout-currency">
                DISPLAY CURRENCY
                <select
                  id="checkout-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {CURRENCIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="checkout-country">
                COUNTRY WHERE YOU WILL PAY
                <select
                  id="checkout-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                >
                  {COUNTRIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="checkout-rate-note">
              The sample catalogue amount is stored in NGN. Changing the display
              currency does not convert the amount. Live exchange rates,
              provider prices and PayPal conversion rates are not connected.
              Your currency choice is independent of your Google account.
            </p>

            <div className="checkout-payment-check">
              <p className="ledger-kicker">PAYMENT AVAILABILITY</p>
              <h3>Check the provider's checkout for {country}</h3>
              <p>
                Payment methods may differ by country, account, subscription
                plan and provider. This prototype cannot confirm PayPal
                availability for your selected country.
              </p>
            </div>

            {!order ? (
              <div className="checkout-confirm">
                <p>
                  This action records a simulated transaction and adds the
                  sample service to your local subscription tracker. No payment
                  will be initiated.
                </p>
                <button onClick={() => setOrder(demoPay(c))}>
                  Record demo transaction
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
            <p className="ledger-kicker">IMPORTANT INFORMATION</p>
            <h2>This is not a live payment.</h2>
            <p>
              PayPal checkout and provider billing are not connected to this
              prototype.
            </p>
            <ul>
              <li>No money is charged.</li>
              <li>No real subscription is created.</li>
              <li>No recurring billing agreement is established.</li>
              <li>No provider cancellation is performed.</li>
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
