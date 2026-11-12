import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  PaginationModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { api, clearToken } from "./auth";
import { RANGES, getRange, setRange, getSubs, markUsed } from "./mock";
import Onboard from "./Onboard";
import GuardianBudgetStudio from "./GuardianBudgetStudio";

ModuleRegistry.registerModules([ClientSideRowModelModule, TextFilterModule, NumberFilterModule, PaginationModule]);

const money = (amount, currency) => {
  if (amount == null || !Number.isFinite(Number(amount))) return "Not provided";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(2)} ${currency || ""}`;
  }
};

function UsageAction(params) {
  const row = params.data;
  const busy = params.context?.busyId === row.id;
  const usedToday = row.days_since_used === 0;

  return (
    <button
      className="guardian-grid-action"
      disabled={busy || usedToday || row.source !== "paypal"}
      onClick={() => params.context?.onMarkUsed?.(row)}
      title={row.source !== "paypal"
        ? "Sample data is stored locally"
        : usedToday ? "Already marked as used today" : "Save usage date to your account"}
    >
      {busy ? "Saving…" : usedToday ? "Used today ✓" : row.source === "paypal" ? "Mark as used" : "Sample"}
    </button>
  );
}


function MobileSubscriptionCard({ row, busy, onMarkUsed }) {
  const decision = row.guardian_decision || "Not reviewed";
  const decisionClass = String(decision).toLowerCase() === "not reviewed"
    ? "pending"
    : String(decision).toLowerCase();
  const usedToday = row.days_since_used === 0;
  const isPayPal = row.source === "paypal";

  return (
    <article className="subscription-mobile-card">
      <div className="subscription-mobile-card-head">
        <div className="subscription-mobile-title">
          <p className="subscription-mobile-eyebrow">
            {isPayPal ? "PAYPAL SUBSCRIPTION" : "SAMPLE RECORD"}
          </p>
          <h3>{row.name || "Untitled subscription"}</h3>
        </div>
        <span className={`guardian-decision ${decisionClass}`}>
          {decision}
        </span>
      </div>

      <div className="subscription-mobile-details">
        <div>
          <span>Monthly cost</span>
          <strong>{money(row.monthly_cost, row.currency)}</strong>
        </div>
        <div>
          <span>Days since used</span>
          <strong>
            {row.days_since_used == null
              ? "Not recorded"
              : usedToday
                ? "Today"
                : `${row.days_since_used} days`}
          </strong>
        </div>
        <div>
          <span>PayPal status</span>
          <strong>{row.status || (isPayPal ? "Not provided" : "Sample data")}</strong>
        </div>
      </div>

      {row.guardian_reason && (
        <p className="subscription-mobile-reason">{row.guardian_reason}</p>
      )}

      <button
        className="subscription-mobile-action"
        type="button"
        disabled={busy || usedToday || !isPayPal}
        onClick={() => onMarkUsed(row)}
        title={!isPayPal
          ? "Sample data is stored locally"
          : usedToday
            ? "Already marked as used today"
            : "Save usage date to your account"}
      >
        {busy
          ? "Saving usage…"
          : usedToday
            ? "Used today ✓"
            : isPayPal
              ? "Mark as used"
              : "Sample record"}
      </button>
    </article>
  );
}

export default function Hub() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [rid, setRid] = useState(getRange());
  const [sampleSubs, setSampleSubs] = useState(getSubs());
  const [paypalSubs, setPaypalSubs] = useState([]);
  const [paypalLoading, setPaypalLoading] = useState(true);
  const [paypalError, setPaypalError] = useState("");
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState("");
  const [guardianResults, setGuardianResults] = useState({});
  const [guardianMeta, setGuardianMeta] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [recordSearch, setRecordSearch] = useState("");

  useEffect(() => {
    api("/auth/me")
      .then((d) => setEmail(d.user.email))
      .catch(() => {});
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setPaypalLoading(true);
    setPaypalError("");
    try {
      const data = await api("/paypal/subscriptions");
      const rows = Array.isArray(data.subscriptions) ? data.subscriptions : [];
      setPaypalSubs(rows.map((row) => ({
        ...row,
        id: row.subscription_id,
        source: "paypal",
        monthly_cost: row.plan_amount == null ? null : Number(row.plan_amount),
        days_since_used: Number.isFinite(Number(row.days_since_used))
          ? Number(row.days_since_used)
          : null,
      })));
    } catch (error) {
      setPaypalError(error.message || "Could not load PayPal subscriptions.");
    } finally {
      setPaypalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const changeRange = () => setRid(null);

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

  const range = RANGES.find((item) => item.id === rid) || RANGES[0];
  const budget = Math.round(range.mid * 0.05);

  const sampleRows = sampleSubs.map((item) => ({
    id: `sample:${item.id}`,
    name: item.name,
    source: "sample",
    monthly_cost: Number(item.price || 0),
    currency: "NGN",
    days_since_used: Number(item.days || 0),
    status: "Sample data",
    subscription_id: null,
  }));

  const rows = [
    ...paypalSubs,
    ...sampleRows,
  ].map((row) => ({
    ...row,
    guardian_decision: guardianResults[row.id]?.decision || "Not reviewed",
    guardian_reason: guardianResults[row.id]?.reason || "",
  }));

  const searchTerm = recordSearch.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (!searchTerm) return true;
    const searchable = [
      row.name,
      row.currency,
      row.status,
      row.guardian_decision,
      row.guardian_reason,
      row.days_since_used,
      row.source === "paypal" ? "PayPal subscription" : "sample record",
      money(row.monthly_cost, row.currency),
    ].join(" ").toLowerCase();
    return searchable.includes(searchTerm);
  });

  const reviewable = rows.filter((row) =>
    typeof row.name === "string" &&
    Number.isFinite(row.monthly_cost) &&
    row.monthly_cost >= 0 &&
    Number.isFinite(row.days_since_used) &&
    typeof row.currency === "string" &&
    /^[A-Z]{3}$/.test(row.currency)
  );

  const flagged = Object.values(guardianResults).filter(
    (item) => item.decision === "cancel" || item.decision === "review"
  ).length;

  const runGuardianReview = async () => {
    if (!reviewable.length) {
      setGuardianError("There are no records with complete cost and usage information to review.");
      return;
    }

    setGuardianLoading(true);
    setGuardianError("");
    try {
      const result = await api("/guardian/review", {
        method: "POST",
        body: {
          budget: { amount: budget, currency: "NGN" },
          subscriptions: reviewable.map((row) => ({
            id: row.id,
            name: row.name,
            monthly_cost: row.monthly_cost,
            currency: row.currency,
            days_since_used: row.days_since_used,
          })),
        },
      });

      const next = {};
      for (const recommendation of result.recommendations || []) {
        next[recommendation.id] = recommendation;
      }
      setGuardianResults(next);
      setGuardianMeta({
        budget_usd: result.budget_usd,
        rates_updated: result.rates_updated,
        attribution: result.attribution,
        received: (result.recommendations || []).length,
      });
    } catch (error) {
      setGuardianError(error.message || "Guardian review could not be completed.");
    } finally {
      setGuardianLoading(false);
    }
  };

  const handleMarkUsed = async (row) => {
    if (row.source !== "paypal" || !row.subscription_id) return;
    setBusyId(row.id);
    setGuardianError("");
    try {
      const updated = await api(
        `/paypal/subscriptions/${encodeURIComponent(row.subscription_id)}/used`,
        { method: "POST" }
      );
      setPaypalSubs((current) =>
        current.map((item) =>
          item.subscription_id === row.subscription_id
            ? {
                ...item,
                ...updated,
                id: updated.subscription_id,
                monthly_cost: updated.plan_amount == null
                  ? null
                  : Number(updated.plan_amount),
              }
            : item
        )
      );
      setGuardianResults({});
      setGuardianMeta(null);
    } catch (error) {
      setGuardianError(error.message || "Could not save usage history.");
    } finally {
      setBusyId("");
    }
  };

  const handleSampleMarkUsed = (row) => {
    const id = row.id.replace(/^sample:/, "");
    setSampleSubs(markUsed(id));
  };

  const signOut = () => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    nav("/");
  };

  const columnDefs = [
    {
      field: "name",
      headerName: "Subscription",
      flex: 1.5,
      minWidth: 143,
    },
    {
      field: "monthly_cost",
      headerName: "Monthly cost",
      minWidth: 122,
      valueFormatter: (params) => money(params.value, params.data?.currency),
    },
    {
      field: "days_since_used",
      headerName: "Days since used",
      minWidth: 109,
      valueFormatter: (params) =>
        params.value == null ? "Not recorded" :
          params.value === 0 ? "Today" : `${params.value} days`,
    },
    {
      field: "status",
      headerName: "PayPal status",
      minWidth: 122,
      valueFormatter: (params) => params.value || "Sample",
    },
    {
      field: "guardian_decision",
      headerName: "Guardian",
      minWidth: 113,
      cellRenderer: (params) => {
        const value = params.value || "Not reviewed";
        const state = String(value).toLowerCase() === "not reviewed"
          ? "pending"
          : String(value).toLowerCase();
        return (
          <span className={`guardian-decision ${state}`}>
            {value}
          </span>
        );
      },
    },
    {
      headerName: "Usage",
      field: "usage_action",
      minWidth: 122,
      sortable: false,
      filter: false,
      cellRenderer: UsageAction,
    },
  ];

  const gridTheme = themeQuartz.withParams({
    backgroundColor: "#10141b",
    foregroundColor: "#e9eef7",
    headerBackgroundColor: "#171e29",
    headerTextColor: "#aebbd0",
    borderColor: "#303a49",
    accentColor: "#75b8ff",
    rowHoverColor: "#1a2635",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 13,
    headerFontSize: 11,
    headerFontWeight: 700,
    spacing: 8,
  });

  const gridContext = {
    busyId,
    onMarkUsed: handleMarkUsed,
    onSampleMarkUsed: handleSampleMarkUsed,
  };

  return (
    <main className="hb ledger-page">
      <header className="hb-top ledger-top">
        <Link className="hb-brand" to="/hub">PayPal Hub<span>.</span></Link>
        <nav className="hb-nav">
          <Link className="active" to="/hub">Overview</Link>
          <Link to="/discover">Discover</Link>
          <Link to="/checkout/c1">Checkout</Link>
        </nav>
        <div className="hb-account">
          {email && <span>{email}</span>}
          <button className="pill line" onClick={signOut}>Sign out</button>
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
          <Link className="ledger-link" to="/discover">Discover services ↗</Link>
        </div>

        {sampleSubs.length > 0 && (
          <div className="ledger-notice">
            <span className="ledger-notice-mark">i</span>
            <p>
              <strong>Sample account data.</strong> {sampleSubs.length} sample
              record(s) are shown for demonstration. PayPal records below are
              retrieved from your signed-in account.
            </p>
          </div>
        )}

        {paypalLoading && <p className="ledger-method">Loading your PayPal subscriptions…</p>}
        {paypalError && (
          <p className="paypal-flow-alert" role="alert">
            {paypalError} <button onClick={loadSubscriptions}>Retry</button>
          </p>
        )}

        <section className="ledger-summary">
          <div className="ledger-spend">
            <p className="ledger-label">TRACKED RECORDS</p>
            <div className="ledger-total">{rows.length}</div>
            <p className="ledger-caption">
              {paypalSubs.length} PayPal · {sampleSubs.length} sample records
            </p>
          </div>
          <div className="ledger-budget">
            <div className="ledger-budget-heading">
              <span className="ledger-label">ILLUSTRATIVE PLANNING LIMIT</span>
              <button onClick={changeRange}>Change income range</button>
            </div>
            <strong>{money(budget, "NGN")}</strong>
            <p>
              A planning assumption calculated as 5% of the midpoint of your
              selected income range. It is not a financial recommendation.
            </p>
            <div className="ledger-meter-caption">
              <span>{range.label}</span>
            </div>
          </div>
        </section>

        <section className="ledger-guardian">
          <div className="ledger-section-head">
            <div>
              <p className="ledger-kicker">GUARDIAN AI REVIEW</p>
              <h2>Understand what may need attention</h2>
              <p className="ledger-section-description">
                Guardian compares recorded subscription cost and usage with
                your illustrative planning limit. Recommendations are prompts,
                not instructions to cancel.
              </p>
            </div>
            <button
              className="paypal-flow-button"
              onClick={runGuardianReview}
              disabled={guardianLoading || reviewable.length === 0}
            >
              {guardianLoading ? "Reviewing…" : "Run Guardian review"}
            </button>
          </div>

          <p className="ledger-method">
            {reviewable.length} of {rows.length} records have cost and usage
            information available for review.
          </p>

          {guardianError && <p className="paypal-flow-alert" role="alert">{guardianError}</p>}

          {guardianMeta && (
            <div className="guardian-review-meta" role="status">
              <strong>Review complete:</strong> {guardianMeta.received} recommendation(s).
              Budget equivalent: {money(guardianMeta.budget_usd, "USD")}.
              {guardianMeta.rates_updated && ` Rates updated: ${guardianMeta.rates_updated}.`}
              <small>{guardianMeta.attribution}</small>
            </div>
          )}

          {guardianMeta && rows.filter((row) =>
            guardianResults[row.id] && guardianResults[row.id].decision !== "keep"
          ).map((row) => (
            <article className="ledger-review-row" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <p>{guardianResults[row.id].reason}</p>
              </div>
              <span className={`ledger-status ${guardianResults[row.id].decision}`}>
                {guardianResults[row.id].decision}
              </span>
            </article>
          ))}

          <p className="ledger-method">
            Guardian uses manually recorded usage dates. It does not access
            provider usage, billing records or cancellation systems.
          </p>
        </section>

        <section className="ledger-records">
          <div className="ledger-section-head">
            <div>
              <p className="ledger-kicker">YOUR TRACKER</p>
              <h2>Subscription records</h2>
              <p className="ledger-section-description">
                Search, sort and filter your PayPal Hub records. Mark usage
                to update the date stored on your account.
              </p>
            </div>
            <span className="ledger-count">{rows.length} records</span>
          </div>

          {rows.length === 0 && !paypalLoading ? (
            <div className="ledger-empty">
              <h3>Your tracker is empty.</h3>
              <p>Create a subscription record through PayPal Checkout to see it here.</p>
              <Link className="ledger-link" to="/checkout">Go to Checkout ↗</Link>
            </div>
          ) : (
            <>
              <div className="subscription-tools">
                <label className="subscription-search-box" htmlFor="subscription-record-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    id="subscription-record-search"
                    type="search"
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                    placeholder="Search subscriptions, status or Guardian decision"
                  />
                  {recordSearch && (
                    <button
                      type="button"
                      onClick={() => setRecordSearch("")}
                      aria-label="Clear subscription search"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <span className="subscription-search-count">
                  {filteredRows.length} shown
                </span>
              </div>

              {filteredRows.length === 0 ? (
                <div className="ledger-empty subscription-no-match">
                  <h3>No matching subscriptions.</h3>
                  <p>Try another service name, status or Guardian decision.</p>
                </div>
              ) : (
                <>
                  <div className="guardian-grid-wrap subscription-desktop-grid">
                    <AgGridReact
                      theme={gridTheme}
                      rowData={filteredRows}
                      columnDefs={columnDefs}
                      context={gridContext}
                      getRowId={(params) => String(params.data.id)}
                      defaultColDef={{
                        sortable: true,
                        filter: false,
                        resizable: false,
                        flex: 1,
                        minWidth: 105,
                      }}
                      rowHeight={52}
                      headerHeight={44}
                      pagination
                      paginationPageSize={10}
                      animateRows
                      domLayout="autoHeight"
                    />
                  </div>

                  <div className="subscription-mobile-list">
                    {filteredRows.map((row) => (
                      <MobileSubscriptionCard
                        key={row.id}
                        row={row}
                        busy={busyId === row.id}
                        onMarkUsed={handleMarkUsed}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="ledger-guardian">
          <div className="ledger-section-head">
            <div>
              <p className="ledger-kicker">YOUR BUDGET SNAPSHOT</p>
              <h2>Budget overview</h2>
              <p className="ledger-section-description">
                A quick view of your monthly limit and tracked subscriptions.
              </p>
            </div>
          </div>
          <GuardianBudgetStudio
            context={{
              budget,
              currency: "NGN",
              records: rows.length,
              paypalRecords: paypalSubs.length,
              flagged,
            }}
          />
        </section>

        <section className="ledger-income">
          <div>
            <p className="ledger-kicker">YOUR PLANNING SETTING</p>
            <strong>Selected income range</strong>
            <p>{range.label}</p>
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
