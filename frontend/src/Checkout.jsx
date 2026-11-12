import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "./auth";
import {
  setPendingOrder,
  setPendingSubscription,
  getPendingOrderId,
  getPendingSubscriptionId,
  clearPendingOrder,
  clearPendingSubscription,
  updatePayPalSubscription,
} from "./paypal";

const ONE_TIME_AMOUNT = "5.00";

function PayPalHeader() {
  return (
    <header className="hb-top ledger-top">
      <Link className="hb-brand" to="/hub">
        PayPal Hub<span>.</span>
      </Link>
      <nav className="hb-nav">
        <Link to="/hub">Overview</Link>
        <Link to="/discover">Discover</Link>
        <Link className="active" to="/checkout/c1">Checkout</Link>
      </nav>
    </header>
  );
}

export default function Checkout() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [serviceName, setServiceName] = useState("");

  const startOneTimePayment = async () => {
    setBusy("payment");
    setError("");
    try {
      const result = await api("/paypal/orders", {
        method: "POST",
        body: { amount: ONE_TIME_AMOUNT },
      });

      if (!result.order_id || !result.approve_url) {
        throw new Error("PayPal did not return an approval link. Please try again.");
      }

      setPendingOrder(result.order_id);
      window.location.assign(result.approve_url);
    } catch (err) {
      setError(err.message || "Could not start the PayPal payment.");
      setBusy("");
    }
  };

  const startGuardianSubscription = async () => {
    setBusy("subscription");
    setError("");
    try {
      const result = await api("/paypal/subscriptions", {
        method: "POST",
        body: { name: serviceName.trim() },
      });

      if (!result.subscription_id || !result.approve_url) {
        throw new Error("PayPal did not return an approval link. Please try again.");
      }

      setPendingSubscription(result.subscription_id);
      window.location.assign(result.approve_url);
    } catch (err) {
      setError(err.message || "Could not start the PayPal subscription.");
      setBusy("");
    }
  };

  return (
    <main className="hb ledger-page">
      <PayPalHeader />

      <section className="checkout-page">
        <div className="checkout-heading">
          <p className="ledger-kicker">PAYPAL CHECKOUT</p>
          <h1>Choose how to proceed.</h1>
          <p>
            These are the two payment flows currently configured by the
            PayPal Hub backend. Both require approval on PayPal.
          </p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-main paypal-flow-main">
            <article className="paypal-flow-option">
              <div className="paypal-flow-option-head">
                <div>
                  <p className="ledger-kicker">ONE-TIME PAYMENT</p>
                  <h2>Sandbox payment test</h2>
                </div>
                <strong className="paypal-flow-price">$5.00 <small>USD</small></strong>
              </div>
              <p>
                Create a one-time PayPal order, approve it on PayPal, and
                return to Hub to capture the payment.
              </p>
              <button
                className="paypal-flow-button"
                onClick={startOneTimePayment}
                disabled={Boolean(busy)}
              >
                {busy === "payment" ? "Connecting to PayPal…" : "Continue to PayPal"}
              </button>
            </article>

            <article className="paypal-flow-option">
              <div className="paypal-flow-option-head">
                <div>
                  <p className="ledger-kicker">RECURRING SUBSCRIPTION</p>
                  <h2>Guardian Monthly</h2>
                </div>
                <strong className="paypal-flow-price">
                  $10.00 <small>USD / month</small>
                </strong>
              </div>
              <label className="checkout-service-label" htmlFor="paypal-service-name">
                SERVICE YOU WANT TO TRACK
              </label>
              <input
                id="paypal-service-name"
                className="checkout-service-input"
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                maxLength={80}
                autoComplete="off"
                placeholder="e.g. Netflix, Spotify, Canva"
                required
              />
              <p>
                Enter the service name. PayPal Hub will save it with your
                subscription after creation. The subscription becomes active
                only after PayPal approval is verified.
              </p>
              <button
                className="paypal-flow-button"
                onClick={startGuardianSubscription}
                disabled={Boolean(busy) || !serviceName.trim()}
              >
                {busy === "subscription" ? "Connecting to PayPal…" : "Subscribe with PayPal"}
              </button>
            </article>

            {error && (
              <p className="paypal-flow-alert" role="alert">
                {error}
              </p>
            )}
          </section>

          <aside className="checkout-aside">
            <p className="ledger-kicker">BEFORE YOU CONTINUE</p>
            <h2>Payment details</h2>
            <ul>
              <li>PayPal handles the approval step.</li>
              <li>The one-time test amount is $5.00 USD.</li>
              <li>Guardian Monthly is a recurring $10.00 USD plan.</li>
              <li>Hub verifies the result after PayPal returns you.</li>
              <li>These backend test flows do not purchase services from the Discover catalogue.</li>
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

export function PayPalReturn({ kind, outcome }) {
  const location = useLocation();
  const [state, setState] = useState(
    outcome === "cancelled" ? "cancelled" : "checking"
  );
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    if (outcome === "cancelled") {
      if (kind === "payment") clearPendingOrder();
      if (kind === "subscription") clearPendingSubscription();
      setState("cancelled");
      setMessage("");
      return () => {
        active = false;
      };
    }

    const verify = async () => {
      setState("checking");
      setMessage("");

      try {
        const params = new URLSearchParams(location.search);

        if (kind === "payment") {
          const orderId =
            params.get("token") ||
            params.get("order_id") ||
            getPendingOrderId();

          if (!orderId) {
            throw new Error("The PayPal order ID was not found. Return to Checkout and try again.");
          }

          const result = await api(
            `/paypal/orders/${encodeURIComponent(orderId)}/capture`,
            { method: "POST" }
          );

          if (!active) return;

          if (result.status === "COMPLETED") {
            clearPendingOrder();
            setState("success");
            setMessage("PayPal confirmed that the payment was completed.");
          } else {
            setState("pending");
            setMessage(`PayPal returned status: ${result.status || "unknown"}. Payment is not confirmed as completed.`);
          }
          return;
        }

        const subscriptionId =
          params.get("subscription_id") ||
          getPendingSubscriptionId();

        if (!subscriptionId) {
          throw new Error("The PayPal subscription ID was not found. Return to Checkout and try again.");
        }

        const result = await api(
          `/paypal/subscriptions/${encodeURIComponent(subscriptionId)}`
        );

        if (!active) return;

        updatePayPalSubscription(subscriptionId, {
          status: result.status,
          plan_id: result.plan_id || null,
          next_billing_time: result.next_billing_time || null,
          verified_at: new Date().toISOString(),
        });

        if (result.status === "ACTIVE") {
          clearPendingSubscription();
          setState("success");
          setMessage("PayPal confirmed that Guardian Monthly is active.");
        } else {
          setState("pending");
          setMessage(`PayPal returned status: ${result.status || "unknown"}. The subscription is not yet confirmed as active.`);
        }
      } catch (err) {
        if (!active) return;
        setState("failed");
        setMessage(err.message || "We could not verify the PayPal result.");
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [kind, outcome, location.search, attempt]);

  const isPayment = kind === "payment";
  const title =
    state === "checking" ? "Verifying with PayPal…" :
    state === "success" ? (isPayment ? "Payment completed" : "Subscription active") :
    state === "pending" ? "Approval not yet confirmed" :
    state === "cancelled" ? "You cancelled the approval" :
    "We could not verify the result";

  return (
    <main className="hb ledger-page">
      <PayPalHeader />
      <section className="checkout-page paypal-return-page">
        <div className="paypal-return-content">
          <p className="ledger-kicker">
            {isPayment ? "ONE-TIME PAYMENT" : "GUARDIAN SUBSCRIPTION"}
          </p>
          <h1>{title}</h1>

          {state === "checking" && (
            <p>Checking the transaction with the PayPal backend.</p>
          )}

          {message && <p role={state === "failed" ? "alert" : "status"}>{message}</p>}

          {state === "cancelled" && (
            <p>
              PayPal approval was cancelled. Hub has not recorded a successful
              payment or confirmed an active subscription.
            </p>
          )}

          {state === "pending" && (
            <p>
              No completed payment or active subscription will be shown until
              PayPal confirms the relevant status.
            </p>
          )}

          {state === "failed" && (
            <button
              className="paypal-flow-button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry verification
            </button>
          )}

          <div className="paypal-return-links">
            <Link className="checkout-primary-link" to="/hub">
              Go to Overview ↗
            </Link>
            <Link className="checkout-back" to="/checkout">
              Return to Checkout
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
