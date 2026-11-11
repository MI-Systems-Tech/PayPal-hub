import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const COMPARISONS = [
  {
    id: "freelance",
    category: "Freelancing",
    title: "Find people to do the work",
    description: "Hire independent professionals or offer your services.",
    providers: [
      {
        name: "Upwork",
        detail:
          "Project-based hiring, contracts and longer-term freelance work.",
        strengths:
          "Useful for ongoing projects and structured client relationships.",
        url: "https://www.upwork.com/",
      },
      {
        name: "Fiverr",
        detail: "Service listings and packaged freelance gigs.",
        strengths:
          "Useful when you want to browse defined services and deliverables.",
        url: "https://www.fiverr.com/",
      },
    ],
    terms: [
      "freelance",
      "freelancer",
      "hire",
      "writer",
      "developer",
      "virtual assistant",
      "professional",
      "gig",
      "work",
    ],
  },
  {
    id: "design",
    category: "Design",
    title: "Create visual content",
    description:
      "Design graphics, presentations, documents and creative assets.",
    providers: [
      {
        name: "Canva",
        detail:
          "Template-led visual design and collaborative content creation.",
        strengths:
          "Useful for quick social posts, presentations and everyday graphics.",
        url: "https://www.canva.com/",
      },
      {
        name: "Adobe",
        detail:
          "A collection of professional creative tools for design, image and video work.",
        strengths:
          "Useful for more advanced creative workflows and detailed editing.",
        url: "https://www.adobe.com/",
      },
    ],
    terms: [
      "design",
      "graphics",
      "graphic",
      "logo",
      "poster",
      "social media",
      "presentation",
      "photo",
      "image",
      "video editing",
      "creative",
    ],
  },
  {
    id: "learning",
    category: "Online learning",
    title: "Learn a new skill",
    description:
      "Explore courses, professional skills and structured learning.",
    providers: [
      {
        name: "Udemy",
        detail:
          "A large marketplace of courses taught by individual instructors.",
        strengths: "Useful for learning specific skills at your own pace.",
        url: "https://www.udemy.com/",
      },
      {
        name: "Coursera",
        detail:
          "Courses and learning programmes from universities and organisations.",
        strengths:
          "Useful for structured learning and selected professional credentials.",
        url: "https://www.coursera.org/",
      },
    ],
    terms: [
      "learn",
      "learning",
      "course",
      "courses",
      "education",
      "study",
      "certificate",
      "certification",
      "skill",
      "university",
      "training",
    ],
  },
  {
    id: "music",
    category: "Music streaming",
    title: "Listen to music",
    description: "Compare music streaming services and listening experiences.",
    providers: [
      {
        name: "Spotify",
        detail:
          "Music and podcast streaming with personalised discovery features.",
        strengths:
          "Useful for playlists, music discovery and podcast listening.",
        url: "https://www.spotify.com/",
      },
      {
        name: "Deezer",
        detail:
          "Music streaming with playlists, discovery and listening features.",
        strengths:
          "Useful for exploring music catalogues and personalised listening.",
        url: "https://www.deezer.com/",
      },
    ],
    terms: [
      "music",
      "streaming",
      "songs",
      "audio",
      "playlist",
      "podcast",
      "listen",
    ],
  },
  {
    id: "marketplace",
    category: "Marketplaces",
    title: "Buy and sell online",
    description:
      "Explore marketplaces for general goods and handmade products.",
    providers: [
      {
        name: "eBay",
        detail: "A broad marketplace for new, used and collectible products.",
        strengths: "Useful for a wide range of product categories and resale.",
        url: "https://www.ebay.com/",
      },
      {
        name: "Etsy",
        detail:
          "A marketplace focused on handmade, vintage and creative goods.",
        strengths: "Useful for distinctive handmade and personalised products.",
        url: "https://www.etsy.com/",
      },
    ],
    terms: [
      "marketplace",
      "shopping",
      "shop",
      "buy",
      "sell",
      "selling",
      "handmade",
      "vintage",
      "products",
      "store",
      "ecommerce",
    ],
  },
  {
    id: "video",
    category: "Video streaming",
    title: "Watch films and television",
    description: "Compare entertainment catalogues and streaming services.",
    providers: [
      {
        name: "Netflix",
        detail:
          "Subscription streaming with films, series and original productions.",
        strengths:
          "Useful for a broad range of entertainment and original series.",
        url: "https://www.netflix.com/",
      },
      {
        name: "Disney+",
        detail:
          "Streaming service featuring Disney, Pixar, Marvel, Star Wars and other content.",
        strengths:
          "Useful for audiences interested in its featured entertainment brands.",
        url: "https://www.disneyplus.com/",
      },
    ],
    terms: [
      "video",
      "streaming",
      "movie",
      "movies",
      "film",
      "films",
      "tv",
      "television",
      "series",
      "entertainment",
      "watch",
    ],
  },
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

const SEARCH_STOP_WORDS = new Set([
  "the", "and", "for", "with", "under", "want", "need", "looking",
  "find", "that", "this", "from", "preferably", "please", "something",
  "like", "using", "have", "a", "an", "to", "of", "my", "me", "i",
  "it", "is", "are", "can", "could", "would", "should", "in", "on",
  "at", "by", "or", "about", "your", "you", "use", "used",
  "affordable", "cheap", "cheaper", "best", "budget", "low",
  "cost", "price", "pricing", "free", "monthly", "annual",
  "available", "availability", "country", "payment", "paypal"
]);

const SEARCH_ALIASES = {
  freelance: [
    "freelance", "freelancer", "freelancing", "hire", "hiring",
    "virtual assistant", "independent professional", "contractor",
    "freelance writer", "freelance developer", "gig", "client project",
    "upwork", "fiverr"
  ],
  design: [
    "design", "graphic", "graphics", "graphic design", "logo", "poster",
    "social media", "social media content", "reels", "reel", "video editing",
    "video editor", "editing", "thumbnail", "presentation", "visual content",
    "creative assets", "canva", "adobe"
  ],
  learning: [
    "learn", "learning", "course", "courses", "online course",
    "online courses", "education", "study", "training", "certificate",
    "certification", "university", "skill development", "udemy", "coursera"
  ],
  music: [
    "music", "music streaming", "song", "songs", "playlist", "playlists",
    "audio", "podcast", "podcasts", "listen", "spotify", "deezer"
  ],
  marketplace: [
    "marketplace", "shopping", "shop", "buy", "sell", "selling",
    "handmade", "vintage", "ecommerce", "e commerce", "online store",
    "products", "resale", "ebay", "etsy"
  ],
  video: [
    "video streaming", "streaming service", "movie", "movies", "film",
    "films", "television", "tv", "series", "entertainment", "watch",
    "stream shows", "netflix", "disney"
  ]
};

function normalizeSearchText(value) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsSearchPhrase(text, phrase) {
  const target = normalizeSearchText(phrase);
  return target.length > 0 && (` ${text} `).includes(` ${target} `);
}

function scoreComparison(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const aliases = SEARCH_ALIASES[item.id] || [];
  let score = 0;

  for (const alias of aliases) {
    if (containsSearchPhrase(normalizedQuery, alias)) {
      score += alias.includes(" ") ? 4 : 2;
    }
  }

  for (const provider of item.providers) {
    if (containsSearchPhrase(normalizedQuery, provider.name)) {
      score += 8;
    }
  }

  const searchableTerms = [
    item.category,
    item.title,
    ...item.terms
  ].map(normalizeSearchText);

  const queryWords = normalizedQuery
    .split(" ")
    .filter(word => word.length > 2 && !SEARCH_STOP_WORDS.has(word));

  for (const word of new Set(queryWords)) {
    if (searchableTerms.some(term => containsSearchPhrase(term, word))) {
      score += 1;
    }
  }

  return score;
}
export default function Discover() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [country, setCountry] = useState("Nigeria");

  const results = useMemo(() => {
    if (!searched || !query.trim()) return COMPARISONS;

    return COMPARISONS
      .map((item, index) => ({
        ...item,
        searchScore: scoreComparison(item, query),
        originalOrder: index
      }))
      .filter((item) => item.searchScore >= 3)
      .sort((a, b) =>
        b.searchScore - a.searchScore ||
        a.originalOrder - b.originalOrder
      );
  }, [searched, query]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearched(true);
  };

  const clearSearch = () => {
    setQuery("");
    setSearched(false);
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
          <h1>Find the right service for the job.</h1>
          <p>
            Tell us what you want to accomplish. Compare services, understand
            their differences and check payment options before subscribing.
          </p>
        </div>

        <form className="discover-search" onSubmit={submitSearch}>
          <label htmlFor="service-query">DESCRIBE WHAT YOU NEED</label>
          <div className="discover-search-row">
            <input
              id="service-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. I need affordable video editing for social media reels."
            />
            <button type="submit" disabled={!query.trim()}>
              Find comparisons
            </button>
          </div>
        </form>

        <div className="discover-context">
          <label htmlFor="discover-country">COUNTRY WHERE YOU WILL PAY</label>
          <select
            id="discover-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            {COUNTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <p>
            Your selected country is used as a reference when checking provider
            payment options. It does not establish PayPal availability.
          </p>
        </div>

        <div className="discover-examples">
          <span>Explore a category:</span>
          {[
            ["Freelancing", "I need to hire a freelancer."],
            ["Design", "I need affordable tools for graphic design."],
            ["Learning", "I want to take online courses."],
            ["Music", "I want a music streaming service."],
            ["Shopping", "I want to buy or sell products online."],
            ["Video", "I want to compare video streaming services."],
          ].map(([label, value]) => (
            <button
              type="button"
              key={label}
              onClick={() => {
                setQuery(value);
                setSearched(true);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="discover-results">
          <div className="discover-results-head">
            <div>
              <p className="ledger-kicker">
                {searched ? "YOUR SEARCH" : "COMPARISON DIRECTORY"}
              </p>
              <h2>
                {searched
                  ? `Options related to "${query}"`
                  : "Six everyday service decisions"}
              </h2>
            </div>
            <span>
              {results.length}{" "}
              {results.length === 1 ? "comparison" : "comparisons"}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="discover-empty">
              <h3>No close category match.</h3>
              <p>
                Try describing the task in different words, such as design,
                freelancing, online learning, music or video streaming.
              </p>
              <button type="button" onClick={clearSearch}>
                Show all comparisons
              </button>
            </div>
          ) : (
            <div className="discover-list">
              {results.map((item, index) => (
                <article className="discover-result" key={item.id}>
                  <div className="discover-result-main">
                    <span className="discover-rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="discover-category">{item.category}</p>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </div>

                  <div className="discover-comparison">
                    {item.providers.map((provider) => (
                      <div className="discover-provider" key={provider.name}>
                        <div>
                          <h4>{provider.name}</h4>
                          <p>{provider.detail}</p>
                          <small>{provider.strengths}</small>
                        </div>
                        <a
                          href={provider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Official site ↗
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="discover-payment-note">
                    <strong>Payment check · {country}</strong>
                    <p>
                      Payment methods and PayPal support can vary by country,
                      account and plan. Check the provider's official checkout
                      before subscribing. Hub has not verified availability for
                      this selection.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {searched && (
            <button
              className="discover-reset"
              type="button"
              onClick={clearSearch}
            >
              Clear search and show all
            </button>
          )}

          <p className="discover-footnote">
            Comparisons describe general service positioning, not a ranking or
            endorsement. Prices, plan features, regional catalogues and payment
            methods can change. Confirm details directly with each provider
            before purchasing.
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
