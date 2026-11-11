import { useState } from "react";
import { Link } from "react-router-dom";
import { discover } from "./mock";

const N = (n) => "₦" + n.toLocaleString("en-NG");

export default function Discover() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [searched, setSearched] = useState("");

  const search = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearched(q.trim());
    setRes(discover(q.trim()));
  };

  return (
    <main className="hb ledger-page">
      <header className="hb-top ledger-top">
        <Link className="hb-brand" to="/hub">
          PayPal Hub<span>.</span>
        </Link>
        <nav className="hb-nav">
          <Link to="/hub">Overview</Link>
          <Link className="active" to="/discover">
            Discover
          </Link>
        </nav>
      </header>

      <section className="discover-page">
        <div className="discover-heading">
          <p className="ledger-kicker">SERVICE DISCOVERY</p>
          <h1>Find a service that fits.</h1>
          <p>
            Describe what you need and set a spending limit. Compare sample
            services before deciding.
          </p>
        </div>

        <form className="discover-search" onSubmit={search}>
          <label htmlFor="service-query">WHAT ARE YOU LOOKING FOR?</label>
          <div className="discover-search-row">
            <input
              id="service-query"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Video editing under ₦10,000"
            />
            <button type="submit" disabled={!q.trim()}>
              Search services
            </button>
          </div>
        </form>

        <div className="discover-examples">
          <span>Try searching:</span>
          <button onClick={() => setQ("Video editing under ₦10,000")}>
            Video editing
          </button>
          <button onClick={() => setQ("Cloud storage under ₦3,000")}>
            Cloud storage
          </button>
          <button onClick={() => setQ("Music streaming")}>
            Music streaming
          </button>
          <button onClick={() => setQ("Online learning")}>
            Online learning
          </button>
        </div>

        <section className="discover-results">
          <div className="discover-results-head">
            <div>
              <p className="ledger-kicker">
                {res ? "SEARCH RESULTS" : "HOW IT WORKS"}
              </p>
              <h2>
                {res ? `Matches for “${searched}”` : "Explore your options"}
              </h2>
            </div>
            {res && <span>{res.length} matches</span>}
          </div>

          {!res && (
            <div className="discover-intro">
              <p>
                Start with a task, not a brand name. For example, describe the
                kind of editing, storage, learning or productivity tool you need
                and include a monthly budget if you have one.
              </p>
              <p className="discover-disclaimer">
                This prototype searches a sample catalogue using keywords and
                price limits. It is not yet connected to a live recommendation
                engine or service directory.
              </p>
            </div>
          )}

          {res && res.length === 0 && (
            <div className="discover-empty">
              <h3>No close matches found.</h3>
              <p>
                Try a broader description or remove the price limit. The current
                catalogue includes editing, design, storage, music, learning,
                notes and privacy tools.
              </p>
            </div>
          )}

          {res && res.length > 0 && (
            <div className="discover-list">
              {res.map((c, i) => (
                <article className="discover-result" key={c.id}>
                  <div className="discover-result-main">
                    <span className="discover-rank">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{c.name}</h3>
                      <p>{c.why}</p>
                    </div>
                  </div>

                  <div className="discover-result-price">
                    <strong>{N(c.price)}</strong>
                    <span>per month</span>
                  </div>

                  <div className="discover-result-action">
                    {c.pp ? (
                      <>
                        <span className="discover-paypal">
                          PayPal demo available
                        </span>
                        <Link to={"/checkout/" + c.id}>View checkout ↗</Link>
                      </>
                    ) : (
                      <span className="discover-unavailable">
                        PayPal checkout not available in demo
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="discover-footnote">
            Catalogue names, descriptions and prices are illustrative sample
            data. Availability and prices have not been verified with real
            providers.
          </p>
        </section>

        <footer className="ledger-footer">
          <span>PayPal Hub · Discover services.</span>
          <span>Hackathon prototype · Not affiliated with PayPal.</span>
        </footer>
      </section>
    </main>
  );
}
