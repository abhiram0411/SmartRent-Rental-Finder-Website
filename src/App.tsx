import { useEffect, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import type { Property } from "./types";
import { api, supabase, money } from "./lib/api";
import { Modal } from "./components/Modal";
import { Auth } from "./components/Auth";
import { Editor } from "./components/Editor";
export function App() {
  const [items, setItems] = useState<Property[]>([]),
    [total, setTotal] = useState(0),
    [demo, setDemo] = useState(true);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [budget, setBudget] = useState(""),
    [beds, setBeds] = useState(""),
    [furnishing, setFurnishing] = useState(""),
    [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Property | null>(null),
    [view, setView] = useState("browse"),
    [auth, setAuth] = useState(false),
    [email, setEmail] = useState("");
  const [notice, setNotice] = useState(""),
    [saved, setSaved] = useState<string[]>([]),
    [editor, setEditor] = useState<Property | true | null>(null),
    [legal, setLegal] = useState("");
  const [enquiries, setEnquiries] = useState<
    Array<{
      id: string;
      message: string;
      createdAt: string;
      property: { title: string };
    }>
  >([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setEmail(data.session?.user.email || ""));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email || "");
      setRefresh((v) => v + 1);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ q: search, sort, page: String(page) });
    if (budget) params.set("maxRent", budget);
    if (beds) params.set("bedrooms", beds);
    if (furnishing) params.set("furnishing", furnishing);
    const path =
      view === "saved"
        ? "favourites"
        : view === "owner"
          ? "my/properties"
          : view === "enquiries"
            ? "enquiries"
            : `properties?${params}`;
    api(path)
      .then((data) => {
        if (ignore) return;
        if (view === "enquiries") {
          setEnquiries(data);
          setItems([]);
        } else if (Array.isArray(data)) {
          setItems(data);
          setTotal(data.length);
        } else {
          setItems(data.items);
          setTotal(data.total);
          setDemo(data.demo);
        }
      })
      .catch((e) => !ignore && setError(e.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [search, budget, beds, furnishing, sort, page, view, refresh]);
  useEffect(() => {
    if (!email) {
      setSaved([]);
      return;
    }
    api("favourites")
      .then((data) => setSaved(data.map((p: Property) => p.id)))
      .catch(() => {});
  }, [email, refresh]);
  function navigate(next: string) {
    if (next !== "browse" && !email) {
      setAuth(true);
      return;
    }
    setView(next);
    setPage(1);
  }
  async function favourite(property: Property) {
    if (!email) {
      setAuth(true);
      return;
    }
    try {
      const exists = saved.includes(property.id);
      await api(`favourites/${property.id}`, exists ? "DELETE" : "PUT");
      setSaved((s) =>
        exists ? s.filter((id) => id !== property.id) : [...s, property.id],
      );
      setNotice(
        exists
          ? "Home removed from your shortlist."
          : "Home saved to your shortlist.",
      );
      if (view === "saved") setRefresh((v) => v + 1);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const clear = () => {
    setSearch("");
    setQuery("");
    setBudget("");
    setBeds("");
    setFurnishing("");
    setPage(1);
  };
  return (
    <MotionConfig reducedMotion="user">
      <a href="#results" className="skip">
        Skip to listings
      </a>
      <header>
        <a className="brand" href="/" aria-label="SmartRent home">
          <span className="brand-mark">
            sr<span>·</span>
          </span>
          smart<span>rent</span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={view === "browse" ? "active" : ""}
            onClick={() => navigate("browse")}
          >
            Find a home
          </button>
          <button
            className={view === "saved" ? "active" : ""}
            onClick={() => navigate("saved")}
          >
            Saved homes <span className="count">{saved.length}</span>
          </button>
          <button onClick={() => navigate("enquiries")}>Enquiries</button>
        </nav>
        <div className="header-actions">
          <button className="text-button" onClick={() => navigate("owner")}>
            List your property <span aria-hidden>↗</span>
          </button>
          <button
            className="small-button"
            onClick={() => (email ? supabase?.auth.signOut() : setAuth(true))}
          >
            {email ? "Sign out" : "Sign in"}
          </button>
        </div>
      </header>
      <main>
        {view === "browse" && (
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">A NEW PLACE. A NEW CHAPTER.</p>
              <h1>
                Find a place
                <br />
                that feels <em>like you.</em>
              </h1>
              <p className="intro">
                The right neighbourhood. A little more sunlight.
                <br />
                Room for whatever comes next.
              </p>
              <form
                className="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(query);
                  setPage(1);
                  document
                    .getElementById("results")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <div>
                  <label htmlFor="location">WHERE DO YOU WANT TO LIVE?</label>
                  <input
                    id="location"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="City, neighbourhood, or a little inspiration"
                    maxLength={100}
                  />
                </div>
                <button type="submit" aria-label="Search homes">
                  Find a home <span aria-hidden>↗</span>
                </button>
              </form>
              <div className="popular">
                <span>Explore</span>
                {["Bengaluru", "Hyderabad", "Pune"].map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setQuery(city);
                      setSearch(city);
                      setPage(1);
                    }}
                  >
                    {city} ↗
                  </button>
                ))}
              </div>
            </div>
            <div className="hero-photo">
              <img
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"
                alt="Sunlit living room with natural textures and generous windows"
              />
              <div className="photo-caption">
                <span>Spaces for everyday living.</span>
                <span>01 / 06</span>
              </div>
            </div>
            <div className="hero-bottom">
              <span>Less searching. More belonging.</span>
              <span>Thoughtful spaces, at your own pace.</span>
            </div>
          </section>
        )}
        <section className="listings" id="results">
          <div className="section-top">
            <div>
              <p className="eyebrow">
                {view === "browse" ? "MAKE YOURSELF AT HOME" : "YOUR SMARTRENT"}
              </p>
              <h2>
                {view === "browse"
                  ? "Somewhere you’ll love coming back to."
                  : view === "saved"
                    ? "Your shortlist."
                    : view === "owner"
                      ? "Your properties."
                      : "Your conversations."}
              </h2>
            </div>
            {view === "owner" ? (
              <button className="primary" onClick={() => setEditor(true)}>
                Add a property +
              </button>
            ) : (
              <p className="subtle">
                {view !== "enquiries" && `${total} homes to explore`}
              </p>
            )}
          </div>
          {view === "browse" && (
            <div className="filters">
              <label>
                Monthly budget
                <select
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any budget</option>
                  <option value="20000">Up to ₹20,000</option>
                  <option value="30000">Up to ₹30,000</option>
                  <option value="40000">Up to ₹40,000</option>
                  <option value="60000">Up to ₹60,000</option>
                </select>
              </label>
              <label>
                Bedrooms
                <select
                  value={beds}
                  onChange={(e) => {
                    setBeds(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any size</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} bedroom{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Furnishing
                <select
                  value={furnishing}
                  onChange={(e) => {
                    setFurnishing(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any furnishing</option>
                  {["Furnished", "Semi-furnished", "Unfurnished"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <button className="clear" onClick={clear}>
                Reset filters
              </button>
              <label className="sort">
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Recommended</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
            </div>
          )}
          {demo && view === "browse" && (
            <p className="demo-note">
              PORTFOLIO DEMO{" "}
              <span>
                Illustrative homes and photography. No real rentals or payments.
              </span>
            </p>
          )}
          {error ? (
            <div className="empty" role="alert">
              <h3>We couldn’t load this page.</h3>
              <p>{error}</p>
              <button
                className="primary"
                onClick={() => setRefresh((v) => v + 1)}
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="grid" aria-label="Loading homes" aria-busy="true">
              {[1, 2, 3].map((n) => (
                <div key={n} className="skeleton">
                  <div />
                  <p />
                  <p />
                </div>
              ))}
            </div>
          ) : view === "enquiries" ? (
            <div>
              {enquiries.length ? (
                enquiries.map((enquiry) => (
                  <article className="enquiry" key={enquiry.id}>
                    <h3>{enquiry.property.title}</h3>
                    <p>{enquiry.message}</p>
                    <small>
                      {new Date(enquiry.createdAt).toLocaleDateString()}
                    </small>
                  </article>
                ))
              ) : (
                <div className="empty">
                  <h3>A new conversation starts with a home.</h3>
                  <p>Your sent and received enquiries will appear here.</p>
                </div>
              )}
            </div>
          ) : items.length ? (
            <motion.div
              className="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              key={`${view}-${search}-${page}`}
            >
              {items.map((property) => (
                <article className="property" key={property.id}>
                  <div className="property-photo">
                    <button
                      className="image-button"
                      onClick={() => setDetail(property)}
                      aria-label={`View ${property.title}`}
                    >
                      <img
                        loading="lazy"
                        src={property.images[0] || "/placeholder.svg"}
                        alt={`Interior illustration for ${property.title}`}
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </button>
                    <span className="photo-tag">{property.furnishing}</span>
                    <button
                      className={`save ${saved.includes(property.id) ? "is-saved" : ""}`}
                      aria-label={`${saved.includes(property.id) ? "Unsave" : "Save"} ${property.title}`}
                      aria-pressed={saved.includes(property.id)}
                      onClick={() => favourite(property)}
                    >
                      {saved.includes(property.id) ? "♥" : "♡"}
                    </button>
                  </div>
                  <div className="property-info">
                    <div className="location">
                      {property.locality}, {property.city}
                      <span aria-hidden>↗</span>
                    </div>
                    <button
                      className="property-title"
                      onClick={() => setDetail(property)}
                    >
                      {property.title}
                    </button>
                    <p className="specs">
                      {property.bedrooms} bedrooms <span>·</span>{" "}
                      {property.area.toLocaleString()} sq ft <span>·</span>{" "}
                      Apartment
                    </p>
                    <div className="property-bottom">
                      <p>
                        <strong>{money(property.rent)}</strong>
                        <span> / month</span>
                      </p>
                      {view === "owner" ? (
                        <button onClick={() => setEditor(property)}>
                          Manage →
                        </button>
                      ) : (
                        <button onClick={() => setDetail(property)}>
                          View home →
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </motion.div>
          ) : (
            <div className="empty">
              <h3>
                {view === "browse"
                  ? "A little adjustment could open new doors."
                  : "Room for something new."}
              </h3>
              <p>
                {view === "browse"
                  ? "Try another neighbourhood or a wider budget."
                  : "Your homes will appear here when you add them."}
              </p>
              <button
                className="primary"
                onClick={() => {
                  clear();
                  setView("browse");
                }}
              >
                Explore all homes
              </button>
            </div>
          )}
          {view === "browse" && total > 12 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <button
                disabled={page * 12 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
        {view === "browse" && (
          <section className="owner-banner">
            <div>
              <p className="eyebrow">HAVE A PLACE TO SHARE?</p>
              <h2>
                Someone’s next chapter
                <br />
                could start at your door.
              </h2>
            </div>
            <button onClick={() => navigate("owner")}>
              List your property <span>↗</span>
            </button>
          </section>
        )}
      </main>
      <footer>
        <div>
          <a href="/" className="brand">
            smart<span>rent</span>
          </a>
          <p>A little closer to home.</p>
        </div>
        <div>
          <button onClick={() => setLegal("About SmartRent")}>
            About this project
          </button>
          <button onClick={() => setLegal("Privacy")}>Privacy</button>
          <button onClick={() => setLegal("Terms")}>Terms</button>
        </div>
        <small>
          Built to learn. Designed to feel at home.
          <br />© {new Date().getFullYear()} SmartRent
        </small>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <img
            className="detail-image"
            src={detail.images[0] || "/placeholder.svg"}
            alt="Property interior"
          />
          <p className="eyebrow">
            {detail.locality} · {detail.city}
          </p>
          <h3>
            {money(detail.rent)} <small>/ month</small>
          </h3>
          <p>
            {detail.bedrooms} bedrooms · {detail.area} sq ft ·{" "}
            {detail.furnishing}
          </p>
          <p>{detail.description}</p>
          <a
            className="map-link"
            target="_blank"
            rel="noreferrer"
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${detail.locality}, ${detail.city}, India`)}`}
          >
            Explore this neighbourhood on OpenStreetMap ↗
          </a>
          <p className="subtle">
            Map searches show the locality, not a verified property address.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email) {
                setAuth(true);
                return;
              }
              const message = String(
                new FormData(e.currentTarget).get("message"),
              );
              try {
                await api(`properties/${detail.id}/enquiries`, "POST", {
                  message,
                });
                setNotice("Your enquiry has been sent.");
                setDetail(null);
              } catch (err) {
                setNotice((err as Error).message);
              }
            }}
          >
            <label>
              Your message
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={1000}
                placeholder="Tell the owner a little about what you’re looking for."
              />
            </label>
            <button className="primary">
              {email ? "Send enquiry" : "Sign in to enquire"}
            </button>
          </form>
        </Modal>
      )}
      {auth && (
        <Auth
          onClose={() => setAuth(false)}
          onSuccess={() => {
            setAuth(false);
            setNotice("You’re signed in. Welcome home.");
          }}
        />
      )}
      {editor && (
        <Editor
          property={editor === true ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setRefresh((v) => v + 1);
            setNotice("Your properties have been updated.");
          }}
        />
      )}
      {legal && (
        <Modal title={legal} onClose={() => setLegal("")}>
          <p>
            SmartRent is a learning and portfolio project, not a brokerage or a
            verified rental marketplace. Sample listings are fictional and
            photos are illustrative. Do not make payments or rely on demo
            listings for housing decisions.
          </p>
          {legal === "Privacy" ? (
            <>
              <p>
                When live accounts are enabled, Supabase processes account
                information, listing photos, saved homes, and enquiry messages.
                Vercel hosts the app and processes requests. External photos are
                loaded from Unsplash; opening maps sends your locality search to
                OpenStreetMap.
              </p>
              <p>
                Do not submit identity documents, payment details, or sensitive
                personal information. Owners can read enquiries addressed to
                their properties. Authentication sessions are managed by
                Supabase. No advertising analytics are intentionally added.
              </p>
              <p>
                Account deletion and data retention procedures must be completed
                before accepting real users. This version is for controlled
                demonstration.
              </p>
            </>
          ) : legal === "Terms" ? (
            <p>
              Use only content you have permission to publish. Do not upload
              harmful material, spam other users, or impersonate owners.
              Availability is subject to free hosting limits. This demo offers
              no tenancy, payment, or availability guarantees.
            </p>
          ) : (
            <p>
              React and TypeScript power the interface. NestJS handles requests
              and permissions. Prisma connects to PostgreSQL, while Supabase
              provides authentication and storage. Motion provides subtle
              transitions. Code and learning documentation accompany the
              project.
            </p>
          )}
        </Modal>
      )}
    </MotionConfig>
  );
}
